from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import PaymentRequest, PaymentResponse, PaymentVerification, PaymentVerificationResponse
from app.payment import zarinpal
from app.utils.logging import get_logger
from app.utils.security import get_current_user, get_current_user_optional
from app.models import User, Order, OrderType, GroupOrder, GroupOrderStatus
from sqlalchemy import or_, func
from app.config import get_settings
from app.services.payment_service import PaymentService
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json
from zoneinfo import ZoneInfo

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

logger = get_logger(__name__)
router = APIRouter()
settings = get_settings()

# Log configuration on startup
logger.info(f"🔧 Payment Routes Configuration:")
logger.info(f"   FRONTEND_URL: {settings.FRONTEND_URL}")
logger.info(f"   get_frontend_public_url: {settings.get_frontend_public_url()}")
logger.info(f"   get_payment_callback_base_url: {settings.get_payment_callback_base_url()}")

# Additional schemas for the new endpoints
class PaymentOrderItem(BaseModel):
    product_id: int
    quantity: int
    price: float
    name: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    market_price: Optional[float] = None
    friend_price: Optional[float] = None
    solo_price: Optional[float] = None
    friend_1_price: Optional[float] = None
    friend_2_price: Optional[float] = None
    friend_3_price: Optional[float] = None

class PaymentOrderRequest(BaseModel):
    items: List[PaymentOrderItem]
    description: str = "پرداخت سفارش"
    mobile: Optional[str] = None
    email: Optional[str] = None
    # If provided, overrides computed total from items. Amount should be in Rial.
    amount: Optional[int] = None
    invite_code: Optional[str] = None
    shipping_address: Optional[str] = None
    delivery_slot: Optional[str] = None
    mode: Optional[str] = None
    allow_consolidation: Optional[bool] = False
    friends: Optional[int] = None
    max_friends: Optional[int] = None
    expected_friends: Optional[int] = None

# Frontend payment request schema (matches what checkout page sends)
class FrontendPaymentRequest(BaseModel):
    amount: float  # Amount in Rial
    description: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    items: Optional[List[PaymentOrderItem]] = None
    paymentPercentage: Optional[float] = None
    friendPrice: Optional[float] = None
    isFlexiblePayment: Optional[bool] = False
    invite_code: Optional[str] = None
    shipping_address: Optional[str] = None
    delivery_slot: Optional[str] = None
    mode: Optional[str] = None
    allow_consolidation: Optional[bool] = False
    friends: Optional[int] = None
    max_friends: Optional[int] = None
    expected_friends: Optional[int] = None

# Main payment endpoint that frontend calls
@router.post("", response_model=PaymentResponse)
async def process_payment(
    payment_data: FrontendPaymentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Main payment endpoint that handles frontend payment requests
    Routes to appropriate sub-endpoints based on request content
    """
    try:
        logger.info(f"Processing payment request: amount={payment_data.amount}, has_items={payment_data.items is not None}, allow_consolidation={payment_data.allow_consolidation}")
        
        if payment_data.items and len(payment_data.items) > 0:
            # If items are provided, create order with items
            order_request = PaymentOrderRequest(
                items=payment_data.items,
                description=payment_data.description,
                mobile=payment_data.mobile,
                email=payment_data.email,
                invite_code=payment_data.invite_code,
                shipping_address=payment_data.shipping_address,
                delivery_slot=payment_data.delivery_slot,
                mode=payment_data.mode,
                allow_consolidation=payment_data.allow_consolidation,
                friends=payment_data.friends,
                max_friends=payment_data.max_friends,
                expected_friends=payment_data.expected_friends,
            )
            return await create_payment_order_public(order_request, db, current_user)
        else:
            # If no items, just request payment
            payment_request = PaymentRequest(
                amount=int(payment_data.amount),
                description=payment_data.description,
                mobile=payment_data.mobile,
                email=payment_data.email
            )
            return await request_payment_public(payment_request, db)
            
    except Exception as e:
        logger.error(f"❌ Payment processing error: {e}")
        logger.error(f"   Error type: {type(e)}")
        import traceback
        logger.error(f"   Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")

# Payment verification endpoint that frontend calls
@router.put("", response_model=PaymentVerificationResponse)
async def verify_payment_main(
    verification_data: PaymentVerification,
    db: Session = Depends(get_db)
):
    """
    Main payment verification endpoint that frontend calls
    """
    try:
        logger.info(f"Verifying payment: authority={verification_data.authority}")
        
        payment_service = PaymentService(db)
        
        # Use the PaymentService for verification
        result = await payment_service.verify_and_complete_payment(
            authority=verification_data.authority,
            amount=verification_data.amount,
            user_id=None  # No user for public verification
        )
        
        if result["success"]:
            return PaymentVerificationResponse(
                success=True,
                ref_id=result["ref_id"],
                status=result["status"],
                # Pass through optional settlement info for frontend popup
                message=result.get("message")
            )
        else:
            return PaymentVerificationResponse(
                success=False,
                error=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Payment verification error: {e}")
        raise HTTPException(status_code=500, detail="خطا در تایید پرداخت")

# Non-authenticated version for testing
@router.post("/create-order-public", response_model=PaymentResponse)
async def create_payment_order_public(
    order_data: PaymentOrderRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    ایجاد سفارش جدید و درخواست پرداخت (با احراز هویت اختیاری)
    """
    try:
        logger.info(f"🔄 Starting create_payment_order_public")
        logger.info(f"📦 Order data: items_count={len(order_data.items)}, amount={getattr(order_data, 'amount', None)}, invite_code={getattr(order_data, 'invite_code', None)}")
        logger.info(f"👤 Current user: {current_user.id if current_user else 'None'}")

        payment_service = PaymentService(db)
        logger.info(f"✅ PaymentService initialized")

        # Calculate total amount
        # Priority: if client provided an explicit amount (Rial), use it as-is
        if getattr(order_data, 'amount', None) is not None:
            try:
                total_amount_rial = int(order_data.amount)
                logger.info(f"💰 Using explicit amount: {total_amount_rial} rial")
            except Exception as e:
                logger.error(f"❌ Error parsing explicit amount: {e}")
                total_amount_rial = 0
        else:
            # Compute from items (Tomans -> Rial)
            total_amount_toman = sum(item.price * item.quantity for item in order_data.items)
            logger.info(f"🧮 Calculated from items: {total_amount_toman} toman")
            # Apply consolidation discount for invited users who opted in
            try:
                is_invited = bool(getattr(order_data, 'invite_code', None))
                consolidation_on = bool(getattr(order_data, 'allow_consolidation', False))
                logger.info(f"🎯 Invite check: is_invited={is_invited}, consolidation_on={consolidation_on}")
            except Exception as e:
                logger.error(f"❌ Error checking invite/consolidation flags: {e}")
                is_invited = False
                consolidation_on = False
            if is_invited and consolidation_on:
                # Fixed consolidation discount: 10,000 Tomans
                total_amount_toman = max(0, total_amount_toman - 10000)
                logger.info(f"💸 Applied consolidation discount: {total_amount_toman} toman after discount")
            total_amount_rial = int(total_amount_toman * 10)
            logger.info(f"💰 Final calculated amount: {total_amount_rial} rial")

        # Prepare items for service
        items = [
            {
                'product_id': item.product_id,
                'quantity': item.quantity,
                'price': item.price
            }
            for item in order_data.items
        ]
        logger.info(f"📦 Prepared items: {len(items)} items for service")

        # Simplified invited flow: do NOT resolve group at creation time.
        # If an invite_code exists, we will mark the order as invited using PENDING_INVITE
        # and link it during payment verification.
        group_order_id = None

        # Determine ship_to_leader_address based on consolidation toggle
        # For invited users (those with invite_code), if they enable consolidation, set ship_to_leader_address = True
        ship_to_leader = False
        if getattr(order_data, 'invite_code', None) and getattr(order_data, 'allow_consolidation', False):
            ship_to_leader = True
            logger.info(f"🚚 Ship to leader enabled for invited user with consolidation")

        # Leader flow previously created as regular order; let it proceed to payment order creation

        logger.info(f"🔧 Calling PaymentService.create_payment_order with:")
        logger.info(f"   user_id: {current_user.id if current_user else None}")
        logger.info(f"   items_count: {len(items)}")
        logger.info(f"   total_amount: {total_amount_rial}")
        logger.info(f"   description: {order_data.description}")
        logger.info(f"   mobile: {order_data.mobile}")
        logger.info(f"   shipping_address: {bool(order_data.shipping_address)}")
        logger.info(f"   mode: {order_data.mode}")
        logger.info(f"   is_invited_checkout: {bool(getattr(order_data, 'invite_code', None))}")

        # Create payment order with optional user authentication
        try:
            result = await payment_service.create_payment_order(
                user_id=current_user.id if current_user else None,
                items=items,
                total_amount=total_amount_rial,
                description=order_data.description,
                mobile=order_data.mobile,
                email=order_data.email,
                shipping_address=order_data.shipping_address,
                delivery_slot=order_data.delivery_slot,
                mode=order_data.mode,
                allow_consolidation=getattr(order_data, 'allow_consolidation', None),
                ship_to_leader_address=ship_to_leader,
                friends=getattr(order_data, 'friends', None),
                max_friends=getattr(order_data, 'max_friends', None),
                expected_friends=getattr(order_data, 'expected_friends', None),
                is_invited_checkout=bool(getattr(order_data, 'invite_code', None)),
            )
            logger.info(f"✅ PaymentService.create_payment_order returned: success={result.get('success')}")
        except Exception as service_error:
            logger.error(f"❌ PaymentService.create_payment_order failed: {str(service_error)}")
            logger.error(f"   Error type: {type(service_error)}")
            import traceback
            logger.error(f"   Traceback: {traceback.format_exc()}")
            raise
        
        if result["success"]:
            # Post-create linking for group orders
            authority = result["authority"]
            order = db.query(Order).filter(Order.payment_authority == authority).first()
            if order:
                if getattr(order_data, 'invite_code', None):
                    # Always mark invited orders using PENDING_INVITE; linking is done after verification
                    original_address = order.shipping_address or ""
                    order.shipping_address = f"PENDING_INVITE:{order_data.invite_code}|{original_address}"
                    db.commit()
                else:
                    # Leader initiating a new group buy
                    # ✅ FIX: Do NOT create GroupOrder here - wait for payment verification
                    # Store mode and group info in delivery_slot (already done in payment_service.create_payment_order)
                    # Group will be created in verify_and_complete_payment AFTER successful payment
                    logger.info(f"⏳ Leader order {order.id} created - GroupOrder will be created after payment verification")
                    # No action needed here - group creation happens in verify_and_complete_payment

            return PaymentResponse(
                success=True,
                authority=authority,
                payment_url=result["payment_url"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except Exception as e:
        logger.error(f"❌ Create payment order error: {str(e)}")
        logger.error(f"   Error type: {type(e)}")
        import traceback
        logger.error(f"   Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="خطا در ایجاد سفارش پرداخت")

@router.post("/create-order", response_model=PaymentResponse)
async def create_payment_order(
    order_data: PaymentOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ایجاد سفارش جدید و درخواست پرداخت
    """
    try:
        payment_service = PaymentService(db)
        
        # Calculate total amount
        if getattr(order_data, 'amount', None) is not None:
            try:
                total_amount_rial = int(order_data.amount)
            except Exception:
                total_amount_rial = 0
        else:
            total_amount_toman = sum(item.price * item.quantity for item in order_data.items)
            try:
                is_invited = bool(getattr(order_data, 'invite_code', None))
                consolidation_on = bool(getattr(order_data, 'allow_consolidation', False))
            except Exception:
                is_invited = False
                consolidation_on = False
            if is_invited and consolidation_on:
                total_amount_toman = max(0, total_amount_toman - 10000)
            total_amount_rial = int(total_amount_toman * 10)
        
        # Prepare items for service
        items = [
            {
                'product_id': item.product_id,
                'quantity': item.quantity,
                'price': item.price
            }
            for item in order_data.items
        ]
        
        # Determine ship_to_leader_address based on consolidation toggle
        # For invited users (those with invite_code), if they enable consolidation, set ship_to_leader_address = True
        ship_to_leader = False
        if getattr(order_data, 'invite_code', None) and getattr(order_data, 'allow_consolidation', False):
            ship_to_leader = True

        # Create payment order
        result = await payment_service.create_payment_order(
            user_id=current_user.id,
            items=items,
            total_amount=total_amount_rial,
            description=order_data.description,
            mobile=order_data.mobile or current_user.phone_number,
            email=order_data.email,
            shipping_address=order_data.shipping_address,
            delivery_slot=order_data.delivery_slot,
            mode=getattr(order_data, 'mode', None),
            allow_consolidation=getattr(order_data, 'allow_consolidation', None),
            ship_to_leader_address=ship_to_leader,
            friends=getattr(order_data, 'friends', None),
            max_friends=getattr(order_data, 'max_friends', None),
            expected_friends=getattr(order_data, 'expected_friends', None),
            is_invited_checkout=bool(getattr(order_data, 'invite_code', None)),
        )
        
        if result["success"]:
            return PaymentResponse(
                success=True,
                authority=result["authority"],
                payment_url=result["payment_url"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Create payment order error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در ایجاد سفارش پرداخت")

# Non-authenticated version for testing
@router.post("/request-public", response_model=PaymentResponse)
async def request_payment_public(
    payment_data: PaymentRequest,
    db: Session = Depends(get_db)
):
    """
    درخواست پرداخت جدید (بدون احراز هویت)
    """
    try:
        # آدرس بازگشت پس از پرداخت - به backend callback endpoint که سپس به سایت bahamm.ir redirect می‌کند
        callback_url = f"{settings.get_payment_callback_base_url()}/payment/callback"
        
        # درخواست پرداخت از زرین‌پال
        result = await zarinpal.request_payment(
            amount=payment_data.amount,
            description=payment_data.description,
            callback_url=callback_url,
            mobile=payment_data.mobile,
            email=payment_data.email
        )
        
        if result["success"]:
            logger.info(f"Payment requested (public), authority: {result['authority']}")
            
            return PaymentResponse(
                success=True,
                authority=result["authority"],
                payment_url=result["payment_url"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Payment request error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در درخواست پرداخت")

@router.post("/request", response_model=PaymentResponse)
async def request_payment(
    payment_data: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    درخواست پرداخت جدید
    """
    try:
        # آدرس بازگشت پس از پرداخت - به backend callback endpoint که سپس به سایت bahamm.ir redirect می‌کند
        callback_url = f"{settings.get_payment_callback_base_url()}/payment/callback"
        
        # درخواست پرداخت از زرین‌پال
        result = await zarinpal.request_payment(
            amount=payment_data.amount,
            description=payment_data.description,
            callback_url=callback_url,
            mobile=payment_data.mobile or current_user.phone_number,
            email=payment_data.email
        )
        
        if result["success"]:
            # If order_id is provided, you can update the order status here
            if payment_data.order_id:
                order = db.query(Order).filter(Order.id == payment_data.order_id).first()
                if order and order.user_id == current_user.id:
                    order.status = "در انتظار پرداخت"
                    order.payment_authority = result["authority"]
                    db.commit()
            
            logger.info(f"Payment requested for user {current_user.id}, authority: {result['authority']}")
            
            return PaymentResponse(
                success=True,
                authority=result["authority"],
                payment_url=result["payment_url"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Payment request error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در درخواست پرداخت")

# Public verification endpoint (no authentication required)
@router.post("/verify-public", response_model=PaymentVerificationResponse)
async def verify_payment_public(
    verification_data: PaymentVerification,
    db: Session = Depends(get_db)
):
    """
    تایید پرداخت (بدون احراز هویت)
    """
    try:
        payment_service = PaymentService(db)
        
        # Use the PaymentService for verification without user_id
        result = await payment_service.verify_and_complete_payment(
            authority=verification_data.authority,
            amount=verification_data.amount,
            user_id=None  # No user authentication required
        )
        
        if result["success"]:
            return PaymentVerificationResponse(
                success=True,
                ref_id=result["ref_id"],
                status=result["status"],
                message=result.get("message")
            )
        else:
            return PaymentVerificationResponse(
                success=False,
                error=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Payment verification error (public): {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در تایید پرداخت")

@router.post("/verify", response_model=PaymentVerificationResponse)
async def verify_payment(
    verification_data: PaymentVerification,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    تایید پرداخت
    """
    try:
        payment_service = PaymentService(db)
        
        # Use the PaymentService for verification
        result = await payment_service.verify_and_complete_payment(
            authority=verification_data.authority,
            amount=verification_data.amount,
            user_id=current_user.id
        )
        
        if result["success"]:
            return PaymentVerificationResponse(
                success=True,
                ref_id=result["ref_id"],
                status=result["status"],
                message=result.get("message")
            )
        else:
            return PaymentVerificationResponse(
                success=False,
                error=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در تایید پرداخت")

@router.get("/test-settlement-flag/{authority}")
async def test_settlement_flag(
    authority: str,
    db: Session = Depends(get_db)
):
    """Test endpoint to check settlement flag"""
    try:
        order = db.query(Order).filter(Order.payment_authority == authority).first()
        if not order:
            return {"error": "Order not found"}
        return {
            "order_id": order.id,
            "is_settlement_payment": getattr(order, 'is_settlement_payment', 'ATTR_NOT_FOUND'),
            "shipping_address": order.shipping_address,
            "group_order_id": order.group_order_id,
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/callback")
async def payment_callback(
    request: Request,
    Authority: str = None,
    Status: str = None,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint که زرین‌پال کاربر را به اینجا هدایت می‌کند
    بعد از پرداخت، کاربر را به frontend redirect می‌کند
    
    - کاربر لیدر گروه ➜ صفحه invite (برای دعوت دوستان)
    - کاربر invited ➜ صفحه success (پیگیری سفارش + مبلغ پرداختیت رو پس بگیر!)
    - خرید solo ➜ صفحه success (موفقیت پرداخت)
    
    In localhost/sandbox mode: redirects to localhost:3000
    In production: redirects to bahamm.ir
    """
    from fastapi.responses import RedirectResponse
    
    # Frontend base URL is auto-detected from settings
    # localhost = http://localhost:3000, production = https://bahamm.ir
    frontend_base = settings.get_frontend_public_url()
    logger.info(f"🔀 Frontend base URL: {frontend_base} (localhost: {settings.is_localhost()})")
    
    try:
        # For failed payments, redirect to cart with error
        if Status != "OK" or not Authority:
            logger.warning(f"Payment callback failed: Authority={Authority}, Status={Status}")
            redirect_url = f"{frontend_base}/cart?payment_failed=true"
            return RedirectResponse(url=redirect_url, status_code=303)
        
        # Payment successful - determine redirect based on user type
        logger.info(f"Payment callback successful: Authority={Authority}, Status={Status}")

        # First, verify payment server-side to ensure group linking happens immediately
        try:
            payment_service = PaymentService(db)
            verification_result = await payment_service.verify_and_complete_payment(authority=Authority, amount=None, user_id=None)
            logger.info(f"✅ Callback verification result: {verification_result}")
            # ✅ CRITICAL: Force fresh database state
            db.expire_all()  # Clear all cached objects to force fresh queries
            db.commit()  # Ensure all changes are committed before querying
        except Exception as _e:
            logger.error(f"❌ Callback verification error (continuing to redirect): {_e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Find order by payment authority (reload after verification)
        # Use a fresh query to ensure we get the updated order
        order = db.query(Order).filter(Order.payment_authority == Authority).first()
        
        # Force refresh to ensure we have the latest data
        if order:
            db.refresh(order)
            logger.info(f"🔄 Order refreshed from database: id={order.id}, group_order_id={order.group_order_id}, order_type={order.order_type}, is_settlement_payment={getattr(order, 'is_settlement_payment', False)}")
        
        if not order:
            logger.warning(f"No order found for authority: {Authority}")
            # Default to success page if order not found (client can resolve by authority)
            logger.info(f"🔗 FRONTEND_BASE_URL: {frontend_base}")
            redirect_url = f"{frontend_base}/payment/success/invitee?authority={Authority}"
            logger.info(f"🔗 REDIRECT_URL (no order): {redirect_url}")
            return RedirectResponse(url=redirect_url, status_code=303)
        
        # Check if this is a settlement payment MARKER:20251120
        logger.info(f"🚨🚨🚨 PAYMENT CALLBACK REACHED SETTLEMENT CHECK LINE - FILE LOADED CORRECTLY")
        is_settlement = getattr(order, 'is_settlement_payment', False)
        logger.info(f"🔍🔍🔍 CHECKING SETTLEMENT: order_id={order.id}, is_settlement_payment={is_settlement}, type={type(is_settlement)}, value={repr(is_settlement)}")
        if is_settlement:
            logger.info(f"✅✅✅ Settlement payment detected (order_id={order.id}, group_id={order.group_order_id}) ➜ redirecting to /payment/success/settlement")
            group_part = f"&groupId={order.group_order_id}" if order.group_order_id else ""
            redirect_url = f"{frontend_base}/payment/success/settlement?authority={Authority}&orderId={order.id}{group_part}"
            logger.info(f"🔗 Settlement redirect URL: {redirect_url}")
            return RedirectResponse(url=redirect_url, status_code=303)
        else:
            logger.info(f"❌❌❌ NOT a settlement payment, continuing to normal flow")
        
        # Determine user type based on GroupOrder.leader_id
        is_leader = False
        is_invited = False
        
        logger.info(f"✅ Order after verification: id={order.id}, group_order_id={order.group_order_id}, user_id={order.user_id}, order_type={order.order_type}, shipping_address={order.shipping_address[:50] if order.shipping_address else None}")
        
        # ✅ Track invited checkout via persisted flag (primary) + legacy PENDING marker (fallback)
        was_invited_checkout = bool(getattr(order, "is_invited_checkout", False))
        if not was_invited_checkout and order.shipping_address and (
            order.shipping_address.startswith("PENDING_INVITE:") or
            "PENDING_INVITE:" in order.shipping_address
        ):
            logger.warning(f"⚠️ Order {order.id} still has PENDING_INVITE marker - group linking may have failed")
            was_invited_checkout = True

        # IMPORTANT: Check order type AFTER verification (which may have updated it from ALONE to GROUP)
        if order.order_type == OrderType.ALONE and not order.group_order_id and not was_invited_checkout:
            # Solo purchase (not invited) ➜ payment callback page
            logger.info(f"✅ Solo order detected (order_id={order.id}, user_id={order.user_id}, group_order_id={order.group_order_id}) ➜ redirecting to /payment/callback")
            redirect_url = f"{frontend_base}/payment/callback?Authority={Authority}&Status=OK"
            logger.info(f"🔗 Solo redirect URL: {redirect_url}")
        elif was_invited_checkout and not order.group_order_id:
            # Invited at checkout but group linking failed ➜ still redirect to invitee page
            logger.warning(f"⚠️ Order {order.id} was invited but group linking failed - redirecting to invitee page")
            redirect_url = f"{frontend_base}/payment/success/invitee?authority={Authority}&orderId={order.id}"
            logger.info(f"🔗 Invitee redirect URL (no group): {redirect_url}")
        elif order.group_order_id:
            # Group order - check if user is leader or invited
            group_order = db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
            
            if not group_order:
                # ❌ This is a DATA INTEGRITY ERROR - log it and redirect to error page
                logger.error(f"❌ CRITICAL: GroupOrder {order.group_order_id} not found for order {order.id}! Redirecting to error page.")
                redirect_url = f"{frontend_base}/cart?payment_error=group_not_found"
            elif (group_order.leader_id is not None and 
                  order.user_id is not None and 
                  group_order.leader_id == order.user_id and
                  order.user_id != 0 and
                  not was_invited_checkout):  # Additional check for invalid user_id
                # ✅ User is the leader → invite page (NULL-safe comparison)
                is_leader = True
                logger.info(f"Leader order detected (order_id={order.id}, group_id={order.group_order_id}) ➜ redirecting to /invite")
                redirect_url = f"{frontend_base}/invite?authority={Authority}"
            else:
                # User is invited (follower) ➜ redirect directly to success page
                is_invited = True
                logger.info(
                    f"Invited user order detected (order_id={order.id}, group_id={order.group_order_id}) ➜ redirecting to /payment/success/invitee"
                )
                # Pass authority for frontend to resolve group invite/refund timer; include orderId/groupId for UX
                group_part = f"&groupId={order.group_order_id}" if getattr(order, 'group_order_id', None) else ""
                logger.info(f"🔗 FRONTEND_BASE_URL (invitee): {frontend_base}")
                redirect_url = (
                    f"{frontend_base}/payment/success/invitee?authority={Authority}&orderId={order.id}{group_part}"
                )
                logger.info(f"🔗 REDIRECT_URL (invitee): {redirect_url}")
        else:
            # Fallback: no group_order_id but order_type is GROUP or was invited at checkout
            if was_invited_checkout:
                logger.warning(f"⚠️ Order {order.id} was invited at checkout but has no group - redirecting to invitee success page anyway")
                redirect_url = f"{frontend_base}/payment/success/invitee?authority={Authority}&orderId={order.id}"
            else:
                logger.warning(f"GROUP order without group_order_id (order_id={order.id}) ➜ redirecting to success page")
                redirect_url = f"{frontend_base}/payment/success/invitee?authority={Authority}&orderId={order.id}"
        
        logger.info(f"🚀 Final redirect: {redirect_url}")
        return RedirectResponse(url=redirect_url, status_code=303)
            
    except Exception as e:
        logger.error(f"Payment callback error: {str(e)}")
        # Even on error, try to redirect with authority if available
        if Authority:
            redirect_url = f"{frontend_base}/payment/success/invitee?authority={Authority}"
        else:
            redirect_url = f"{frontend_base}/cart?payment_error=true"
        
        return RedirectResponse(url=redirect_url, status_code=303)

@router.get("/orders")
async def get_user_payment_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: str = None
):
    """
    دریافت سفارشات پرداخت کاربر
    """
    try:
        payment_service = PaymentService(db)
        
        # CRITICAL FIX: If current_user.id is somehow 0 or invalid, try to find user by phone
        user_id_to_use = current_user.id
        logger.info(f"📋 GETTING ORDERS - Current user: ID={current_user.id}, Phone={current_user.phone_number}")

        if not user_id_to_use or user_id_to_use == 0:
            logger.warning(f"⚠️ User ID is {user_id_to_use}, trying to find user by phone: {current_user.phone_number}")
            if current_user.phone_number:
                # Normalize phone number - try both with and without + prefix
                phone_with_plus = current_user.phone_number if current_user.phone_number.startswith('+') else '+' + current_user.phone_number
                phone_without_plus = current_user.phone_number.replace('+', '')

                logger.info(f"🔍 Looking for user with phone variations:")
                logger.info(f"   With +: {phone_with_plus}")
                logger.info(f"   Without +: {phone_without_plus}")

                # Find the real user by phone number (try both formats)
                real_user1 = db.query(User).filter(User.phone_number == phone_without_plus).first()
                real_user2 = db.query(User).filter(User.phone_number == phone_with_plus).first()
                real_user = real_user1 or real_user2

                if real_user and real_user.id:
                    user_id_to_use = real_user.id
                    logger.info(f"✅ Found real user ID {user_id_to_use} for phone {current_user.phone_number}")
                    logger.info(f"   User details: first_name={real_user.first_name}, last_name={real_user.last_name}, user_type={real_user.user_type}")
                else:
                    logger.error(f"❌ Could not find user by phone {current_user.phone_number}")
                    # Log all users with similar phone numbers for debugging
                    similar_users = db.query(User).filter(User.phone_number.like(f"%{current_user.phone_number[-4:]}%")).all()
                    logger.info(f"📊 Similar users found: {len(similar_users)}")
                    for u in similar_users:
                        logger.info(f"   User: ID={u.id}, Phone={u.phone_number}, Name={u.first_name} {u.last_name}")
            else:
                logger.error("❌ No phone number available for user lookup")

        logger.info(f"🔍 Final user ID to use: {user_id_to_use}")

        # Build a robust set of candidate user IDs based on phone similarity to include
        # orders made under duplicate accounts for the same phone number.
        candidate_user_ids = {user_id_to_use} if user_id_to_use else set()

        try:
            phone = (current_user.phone_number or "").strip()
            if phone:
                import re
                digits = re.sub(r"\D", "", phone)
                if digits:
                    like8 = f"%{digits[-8:]}" if len(digits) >= 8 else f"%{digits}"
                    like9 = f"%{digits[-9:]}" if len(digits) >= 9 else like8
                    like10 = f"%{digits[-10:]}" if len(digits) >= 10 else like9
                    similar_users = db.query(User).filter(
                        or_(
                            User.phone_number.like(like10),
                            User.phone_number.like(like9),
                            User.phone_number.like(like8),
                        )
                    ).all()
                    for u in similar_users:
                        if getattr(u, 'id', None):
                            candidate_user_ids.add(int(u.id))
        except Exception as _e:
            logger.error(f"Failed building candidate user ids by phone: {_e}")

        orders = payment_service.get_user_orders(sorted(candidate_user_ids), status)

        # Fallback enhancement: Also include leader orders for groups led by a user
        # whose phone number matches the current user's phone (even if that leader
        # account was created as a guest without a proper phone on the order records).
        try:
            phone = (current_user.phone_number or "").strip()
            if phone:
                import re
                digits = re.sub(r"\D", "", phone)
                if digits:
                    like8 = f"%{digits[-8:]}" if len(digits) >= 8 else f"%{digits}"
                    like9 = f"%{digits[-9:]}" if len(digits) >= 9 else like8
                    like10 = f"%{digits[-10:]}" if len(digits) >= 10 else like9

                    # Find groups where the leader's phone matches by tail-digits
                    from sqlalchemy.orm import aliased
                    Leader = aliased(User)
                    leader_groups = (
                        db.query(GroupOrder)
                        .join(Leader, Leader.id == GroupOrder.leader_id)
                        .filter(
                            or_(
                                Leader.phone_number.like(like10),
                                Leader.phone_number.like(like9),
                                Leader.phone_number.like(like8),
                            )
                        )
                        .all()
                    )

                    if leader_groups:
                        leader_group_ids = [g.id for g in leader_groups]
                        leader_ids = {g.leader_id for g in leader_groups}
                        # Fetch leader orders for these groups (exclude settlement payments)
                        extra_leader_orders = (
                            db.query(Order)
                            .filter(
                                Order.group_order_id.in_(leader_group_ids),
                                Order.user_id.in_(leader_ids),
                                Order.is_settlement_payment == False,
                            )
                            .all()
                        )
                        # Merge without duplicates
                        existing_ids = {o.id for o in orders}
                        for o in extra_leader_orders:
                            if o.id not in existing_ids:
                                orders.append(o)
        except Exception as _e:
            logger.error(f"Enhanced leader-order fallback failed: {_e}")
        logger.info(f"📦 Found {len(orders)} orders for user ID {user_id_to_use}")

        # Log order details
        for order in orders:
            logger.info(f"   Order ID: {order.id}, Status: {order.status}, Amount: {order.total_amount}, Group ID: {order.group_order_id}, Payment Ref: {order.payment_ref_id}")
            if order.group_order_id:
                logger.info(f"     Group Finalized Prefix: {order.payment_ref_id and str(order.payment_ref_id).startswith('GROUP_FINALIZED_')}")
        
        # DEBUG: Log response summary
        logger.info(f"📤 Returning {len(orders)} orders to frontend")

        return {
            "success": True,
            "orders": [
                {
                    "id": order.id,
                    "user_id": getattr(order, 'user_id', None),
                    "total_amount": order.total_amount,
                    "status": order.status,
                    "created_at": order.created_at,
                    "payment_authority": order.payment_authority,
                    "payment_ref_id": order.payment_ref_id,
                    "shipping_address": getattr(order, 'shipping_address', None),
                    "delivery_slot": getattr(order, 'delivery_slot', None),
                    "items_count": len(order.items),
                    "is_settlement_payment": getattr(order, 'is_settlement_payment', False),
                    "group_order_id": getattr(order, 'group_order_id', None),
                    "group_finalized": (
                        order.group_order.finalized_at is not None
                        if getattr(order, 'group_order_id', None) and hasattr(order, 'group_order') and order.group_order
                        else None
                    ),
                    "ship_to_leader_address": getattr(order, 'ship_to_leader_address', False),
                    "allow_consolidation": getattr(order, 'allow_consolidation', False)
                }
                for order in orders
            ]
        }
    except Exception as e:
        logger.error(f"Get user orders error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در دریافت سفارشات")

# DEBUG endpoint to check user existence
@router.get("/debug/user/{phone}")
async def debug_user_by_phone(
    phone: str,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check if user exists by phone number"""
    try:
        # Normalize phone number - try both with and without + prefix
        original_phone = phone
        phone_with_plus = phone if phone.startswith('+') else '+' + phone
        phone_without_plus = phone.replace('+', '')

        logger.info(f"🔍 DEBUG: Looking for user with phone: '{original_phone}'")
        logger.info(f"   Trying with +: '{phone_with_plus}'")
        logger.info(f"   Trying without +: '{phone_without_plus}'")

        # Debug: List all users in database
        all_users = db.query(User).all()
        logger.info(f"📊 DEBUG: Total users in database: {len(all_users)}")
        for u in all_users:
            logger.info(f"   User {u.id}: phone='{u.phone_number}'")

        # First try exact match without +
        user1 = db.query(User).filter(User.phone_number == phone_without_plus).first()
        logger.info(f"🔍 DEBUG: Exact match without + ('{phone_without_plus}'): {user1 is not None}")

        # Then try exact match with +
        user2 = db.query(User).filter(User.phone_number == phone_with_plus).first()
        logger.info(f"🔍 DEBUG: Exact match with + ('{phone_with_plus}'): {user2 is not None}")

        # Use whichever one found the user
        user = user1 or user2

        logger.info(f"🔍 DEBUG: Final result: {user is not None}")

        if user:
            logger.info(f"✅ DEBUG: Found user {user.id} for phone {phone}")
            logger.info(f"   User phone in DB: '{user.phone_number}'")
            logger.info(f"   Phone with +: '{phone_with_plus}'")
            logger.info(f"   Phone without +: '{phone_without_plus}'")

            # Get user's orders
            orders = db.query(Order).filter(Order.user_id == user.id).all()
            logger.info(f"📦 DEBUG: User {user.id} has {len(orders)} orders")

            order_details = []
            for order in orders:
                order_details.append({
                    "id": order.id,
                    "status": order.status,
                    "total_amount": order.total_amount,
                    "group_order_id": order.group_order_id,
                    "payment_ref_id": order.payment_ref_id,
                    "created_at": order.created_at.isoformat() if order.created_at else None
                })

            return {
                "success": True,
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "user_type": user.user_type,
                    "created_at": user.created_at.isoformat() if user.created_at else None
                },
                "orders_count": len(orders),
                "orders": order_details
            }
        else:
            logger.warning(f"❌ DEBUG: User not found for phone {phone}")
            logger.info(f"   Searched with: '{phone_with_plus}' and '{phone_without_plus}'")

            # Check for similar phone numbers
            similar_users = db.query(User).filter(User.phone_number.like(f"%{phone[-4:]}%")).all()
            logger.info(f"📊 DEBUG: Found {len(similar_users)} similar users")

            similar_details = []
            for u in similar_users:
                similar_details.append({
                    "id": u.id,
                    "phone_number": u.phone_number,
                    "first_name": u.first_name,
                    "last_name": u.last_name
                })

            return {
                "success": False,
                "message": f"User not found for phone {phone}",
                "searched_formats": [phone_with_plus, phone_without_plus],
                "similar_users": similar_details
            }
    except Exception as e:
        logger.error(f"Debug user error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در debug")

@router.get("/order/{authority}")
async def get_order_by_authority(
    authority: str,
    db: Session = Depends(get_db)
):
    """Get order details by payment authority, with leader/invitee hints"""
    try:
        # Find order by authority
        order = db.query(Order).filter(Order.payment_authority == authority).first()
        if not order:
            raise HTTPException(status_code=404, detail="سفارش یافت نشد")
        
        # Get order items with product details
        order_items = []
        for item in order.items:
            product = item.product
            order_items.append({
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "base_price": item.base_price,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "description": product.description,
                    "market_price": getattr(product, "market_price", None),
                    "friend_1_price": getattr(product, "friend_1_price", None),
                    "friend_2_price": getattr(product, "friend_2_price", None),
                    "friend_3_price": getattr(product, "friend_3_price", None),
                    "images": [img.image_url for img in product.images if img.is_main]
                }
            })
        
        # Leader/invitee hints
        group_order_id = getattr(order, "group_order_id", None)
        is_invited = bool(getattr(order, "is_invited_checkout", False))
        
        # ✅ CORRECT: Check if user is invited (has group_order_id but is NOT the leader)
        if group_order_id and not is_invited:
            try:
                group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
                if group_order:
                    # ✅ FIX: Properly handle None/0 user_id cases for guest users
                    # An invited user is someone who has a group_order_id but is NOT the leader
                    # Use NULL-safe comparison to handle guest users
                    order_user_id = getattr(order, 'user_id', None)
                    leader_id = getattr(group_order, 'leader_id', None)
                    
                    if leader_id is not None and order_user_id is not None:
                        # Both IDs are valid - check if they're different
                        is_invited = (leader_id != order_user_id)
                    elif leader_id is None:
                        # Group has no leader - should not happen, but assume invited
                        is_invited = True
                    else:
                        # order_user_id is None but group has a leader - assume invited
                        is_invited = True
            except Exception as e:
                logger.error(f"Error checking is_invited status for order {order.id}: {e}")
                is_invited = False

        # Always provide a synthetic group-buy payload for sharing (even before verification)
        front_base = (settings.FRONTEND_URL or "").rstrip("/")
        invite_code = f"GB{order.id}{authority[:8]}"
        invite_url = f"{front_base}/landingM?invite={invite_code}" if front_base else f"/landingM?invite={invite_code}"
        group_buy = {
            "expires_at": (order.created_at + timedelta(hours=24)).isoformat(),
            "participants_count": 1,
            "invite_code": invite_code,
            "invite_url": invite_url,
        }
        
        return {
            "success": True,
            "order": {
                "id": order.id,
                "status": order.status,
                "total_amount": order.total_amount,
                "payment_authority": order.payment_authority,
                "payment_ref_id": order.payment_ref_id,
                "created_at": order.created_at.isoformat(),
                "paid_at": order.paid_at.isoformat() if order.paid_at else None,
                "group_order_id": group_order_id,
                "is_invited": is_invited,
                "items": order_items,
                "group_buy": group_buy
            }
        }
        
    except HTTPException as e:
        # Re-raise HTTPExceptions (e.g., 404) instead of converting to 500
        raise e
    except Exception as e:
        logger.error(f"Get order by authority error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در دریافت سفارش")

@router.get("/group-invite/{code}")
async def get_group_invite_by_code(
    code: str,
    db: Session = Depends(get_db)
):
    """Resolve an invite code like GB{order_id}{authority_prefix} OR a random GroupOrder.invite_token.

    Returns leader info and normalized items with pricing to match admin-full.
    """
    try:
        # Case 1: Legacy/code format GB{order_id}{authority_prefix}
        if code and code.startswith("GB"):
            raw = code[2:]
            digits = ""
            for ch in raw:
                if ch.isdigit():
                    digits += ch
                else:
                    break
            if not digits:
                raise HTTPException(status_code=400, detail="کد دعوت نامعتبر است")
            order_id = int(digits)
            prefix = raw[len(digits):]

            # Find order by id and, if provided, authority prefix
            query = db.query(Order).filter(Order.id == order_id)
            if prefix:
                query = query.filter(Order.payment_authority.like(f"{prefix}%"))
            order = query.first()
            # Fallback: ignore prefix constraint if no match
            if not order:
                try:
                    order = db.query(Order).filter(Order.id == order_id).first()
                except Exception:
                    order = None
            # If still not found, try to locate a secondary group by source_order_id
            if not order:
                try:
                    from sqlalchemy import or_
                    candidate_secondary = None
                    groups = db.query(GroupOrder).order_by(GroupOrder.created_at.desc()).all()
                    for g in groups:
                        try:
                            _meta = json.loads(getattr(g, 'basket_snapshot', '') or '{}')
                            if isinstance(_meta, dict) and str((_meta.get('kind') or '')).lower() == 'secondary' and int(_meta.get('source_order_id') or 0) == int(order_id):
                                candidate_secondary = g
                                break
                        except Exception:
                            continue
                    if candidate_secondary:
                        group_order = candidate_secondary
                        source_order = None
                        # Try to set source_order for items resolution
                        try:
                            source_order = db.query(Order).filter(Order.id == int(order_id)).first()
                        except Exception:
                            source_order = None
                        # Proceed with this group_order
                    else:
                        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
                except HTTPException:
                    raise
                except Exception:
                    raise HTTPException(status_code=404, detail="سفارش یافت نشد")

            source_order = order
            group_order = db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first() if order.group_order_id else None

            # If this GB link belongs to a follower (invited user), prefer their secondary group.
            # If none exists yet, create one immediately so clients show the invited user as leader.
            try:
                # Try to find an existing secondary group for this follower sourced from this order
                found_secondary = None
                candidate_groups = (
                    db.query(GroupOrder)
                    .filter(GroupOrder.leader_id == order.user_id)
                    .order_by(GroupOrder.created_at.desc())
                    .all()
                )
                for g in candidate_groups:
                    try:
                        _meta = json.loads(getattr(g, 'basket_snapshot', '') or '{}')
                        if isinstance(_meta, dict) and str((_meta.get('kind') or '')).lower() == 'secondary' and int((_meta.get('source_order_id') or 0)) == int(order.id):
                            found_secondary = g
                            break
                    except Exception:
                        continue

                # Determine if this order's user is a follower (not the primary leader)
                is_follower = False
                try:
                    if group_order and order and getattr(group_order, 'leader_id', None) and getattr(order, 'user_id', None):
                        is_follower = int(order.user_id) != int(group_order.leader_id)
                except Exception:
                    is_follower = False

                if is_follower:
                    if found_secondary is not None:
                        group_order = found_secondary
                        # Ensure snapshot items reflect follower's purchased items if missing/empty
                        try:
                            meta = {}
                            try:
                                meta = json.loads(getattr(group_order, 'basket_snapshot', '') or '{}')
                            except Exception:
                                meta = {}
                            if isinstance(meta, dict):
                                current_items = meta.get('items') or []
                                if not current_items:
                                    follower_items = []
                                    for it in order.items:
                                        product = getattr(it, 'product', None)
                                        follower_items.append({
                                            'product_id': it.product_id,
                                            'quantity': it.quantity,
                                            'unit_price': it.base_price,
                                            'product_name': getattr(product, 'name', None) if product else f"محصول {it.product_id}",
                                        })
                                    meta['items'] = follower_items
                                    try:
                                        group_order.basket_snapshot = json.dumps(meta, ensure_ascii=False)
                                        db.commit()
                                    except Exception:
                                        db.rollback()
                        except Exception:
                            pass
                    else:
                        # Auto-create a secondary group for this follower
                        import secrets, string
                        from datetime import timedelta

                        def _gen_token(length: int = 12) -> str:
                            alphabet = string.ascii_letters + string.digits
                            return ''.join(secrets.choice(alphabet) for _ in range(length))

                        token = _gen_token()
                        # Ensure uniqueness (case-insensitive)
                        while db.query(GroupOrder).filter(func.lower(GroupOrder.invite_token) == token.lower()).first():
                            token = _gen_token()

                        # Compute paid_at/expires_at window based on follower's order
                        paid_at = getattr(order, 'paid_at', None) or getattr(order, 'created_at', None) or datetime.now(TEHRAN_TZ)
                        if getattr(paid_at, 'tzinfo', None) is None:
                            paid_at = paid_at.replace(tzinfo=TEHRAN_TZ)
                        expires_at = paid_at + timedelta(hours=24)

                        # Build items snapshot from the follower's order (always show purchased items)
                        items = []
                        try:
                            for it in order.items:
                                product = getattr(it, 'product', None)
                                items.append({
                                    'product_id': it.product_id,
                                    'quantity': it.quantity,
                                    'unit_price': it.base_price,
                                    'product_name': getattr(product, 'name', None) if product else f"محصول {it.product_id}",
                                })
                        except Exception as e:
                            logger.error(f"Error building items for secondary group: {e}")
                            items = []

                        meta = {
                            'kind': 'secondary',
                            'source_group_id': getattr(group_order, 'id', None) if group_order else getattr(order, 'group_order_id', None),
                            'source_order_id': order.id,
                            'items': items,
                            'hidden': True,  # admin hides secondary until it has a follower
                        }
                        try:
                            snap_json = json.dumps(meta, ensure_ascii=False)
                        except Exception:
                            snap_json = None

                        new_group = GroupOrder(
                            leader_id=order.user_id,
                            invite_token=token,
                            status=GroupOrderStatus.GROUP_FORMING,
                            created_at=datetime.now(TEHRAN_TZ),
                            leader_paid_at=paid_at,
                            expires_at=expires_at,
                            basket_snapshot=snap_json,
                        )
                        db.add(new_group)
                        db.commit()
                        db.refresh(new_group)
                        group_order = new_group
            except Exception:
                # Best-effort; proceed with resolved group_order
                pass
        else:
            # Case 2: Random GroupOrder.invite_token (used by secondary groups)
            # IMPORTANT: Use the NEWEST group with this invite_token to handle edge cases correctly
            group_order = db.query(GroupOrder).filter(
                func.lower(GroupOrder.invite_token) == str(code).lower()
            ).order_by(GroupOrder.created_at.desc()).first()
            if not group_order:
                raise HTTPException(status_code=404, detail="گروه یافت نشد")
            # Try to resolve source order from snapshot meta
            source_order = None
            try:
                meta = json.loads(group_order.basket_snapshot) if getattr(group_order, 'basket_snapshot', None) else {}
                if isinstance(meta, dict):
                    src_id = meta.get('source_order_id')
                    if src_id:
                        source_order = db.query(Order).filter(Order.id == int(src_id)).first()
            except Exception:
                source_order = None

        # Build items using snapshot first (for secondary groups), then fallback to source order
        items = []
        
        # First try to get items from basket_snapshot (for secondary groups)
        try:
            snap = json.loads(getattr(group_order, 'basket_snapshot', '') or '{}')
            if isinstance(snap, dict) and isinstance(snap.get('items'), list):
                for it in snap['items']:
                    # Get fresh product data for pricing
                    product = None
                    try:
                        from app.models import Product
                        product = db.query(Product).filter(Product.id == it.get('product_id')).first()
                    except Exception:
                        pass
                    
                    items.append({
                        "product_id": it.get('product_id'),
                        "quantity": it.get('quantity'),
                        # prefer friend price for group invite, fallback to unit_price from snapshot
                        "price": (getattr(product, "friend_1_price", None) or it.get('unit_price')),
                        "base_price": it.get('unit_price'),
                        "market_price": getattr(product, "market_price", None) if product else None,
                        "friend_1_price": getattr(product, "friend_1_price", None) if product else None,
                        "friend_2_price": getattr(product, "friend_2_price", None) if product else None,
                        "friend_3_price": getattr(product, "friend_3_price", None) if product else None,
                        "product_name": it.get('product_name') or (getattr(product, "name", None) if product else f"محصول {it.get('product_id')}"),
                        "description": getattr(product, "description", None) if product else None,
                        "image": (next((img.image_url for img in getattr(product, "images", []) if getattr(img, "is_main", False)), None) if product else None),
                    })
        except Exception:
            pass
        
        # Fallback to source_order if no items in snapshot
        if not items and source_order:
            for item in source_order.items:
                product = getattr(item, "product", None)
                items.append({
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    # prefer friend price for group invite, fallback to base_price
                    "price": (getattr(product, "friend_1_price", None) or item.base_price),
                    "base_price": item.base_price,
                    "market_price": getattr(product, "market_price", None),
                    "friend_1_price": getattr(product, "friend_1_price", None),
                    "friend_2_price": getattr(product, "friend_2_price", None),
                    "friend_3_price": getattr(product, "friend_3_price", None),
                    "product_name": getattr(product, "name", None) or f"محصول {item.product_id}",
                    "description": getattr(product, "description", None),
                    "image": (next((img.image_url for img in getattr(product, "images", []) if getattr(img, "is_main", False)), None) if product else None),
                })

        # Leader info - always use the group's leader (which is correct for both primary and secondary groups)
        leader_name = None
        leader_phone = None
        leader_user = None
        try:
            if group_order and group_order.leader_id:
                leader_user = db.query(User).filter(User.id == group_order.leader_id).first()
            elif source_order and source_order.user_id:
                leader_user = db.query(User).filter(User.id == source_order.user_id).first()
        except Exception:
            leader_user = None
        if leader_user:
            leader_name = getattr(leader_user, "full_name", None) or getattr(leader_user, "name", None) or getattr(leader_user, "phone_number", None) or "Leader"
            leader_phone = getattr(leader_user, "phone_number", None) or ""

        # Consolidation toggle
        allow_consolidation = False
        if group_order:
            allow_consolidation = bool(getattr(group_order, 'allow_consolidation', False))

        # Calculate remaining time - for finalized groups, should be 0
        remaining_seconds = None
        expires_at_ms = None
        server_now_ms = None
        current_time = datetime.now(TEHRAN_TZ)

        if group_order:
            # For finalized groups (success or failed), remaining time should always be 0
            if getattr(group_order, "status", None) in [GroupOrderStatus.GROUP_FINALIZED, GroupOrderStatus.GROUP_FAILED]:
                remaining_seconds = 0
                expires_at_ms = int(current_time.timestamp() * 1000)  # Set to current time
                server_now_ms = int(current_time.timestamp() * 1000)
            elif getattr(group_order, 'expires_at', None):
                expires_at = group_order.expires_at
                if expires_at.tzinfo is None:
                    # If naive, assume it's already Tehran time (as stored by the app)
                    expires_at = expires_at.replace(tzinfo=TEHRAN_TZ)
                remaining_seconds = max(0, int((expires_at - current_time).total_seconds()))
                expires_at_ms = int(expires_at.timestamp() * 1000)
                server_now_ms = int(current_time.timestamp() * 1000)

        # Get group status
        status = "ongoing"
        if group_order:
            status_map = {
                GroupOrderStatus.GROUP_FORMING: "ongoing",
                GroupOrderStatus.GROUP_FINALIZED: "success",
                GroupOrderStatus.GROUP_FAILED: "failed",
            }
            status = status_map.get(getattr(group_order, "status", GroupOrderStatus.GROUP_FORMING), "ongoing")

        # Canonical invite code should reflect the group returned
        canonical_code = None
        try:
            canonical_code = getattr(group_order, 'invite_token', None)
        except Exception:
            canonical_code = None

        return {
            "success": True,
            "invite_code": canonical_code or code,
            "leader_name": leader_name or "Leader",
            "leader_phone": leader_phone or "",
            "items": items,
            "allow_consolidation": allow_consolidation,
            "status": status,
            "remaining_seconds": remaining_seconds,
            "expires_at_ms": expires_at_ms,
            "server_now_ms": server_now_ms,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get group invite by code error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در دریافت اطلاعات دعوت")


# Create a secondary group for an invited user after successful payment
@router.post("/create-secondary-group/{authority}")
async def create_secondary_group_from_invited_payment(
    authority: str,
    db: Session = Depends(get_db)
):
    # Temporarily disabled
    raise HTTPException(status_code=403, detail="ایجاد گروه ثانویه غیرفعال است")

