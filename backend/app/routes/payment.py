from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import PaymentRequest, PaymentResponse, PaymentVerification, PaymentVerificationResponse
from app.payment import zarinpal
from app.utils.logging import get_logger
from app.utils.security import get_current_user
from app.models import User, Order
from app.config import get_settings
from app.services.payment_service import PaymentService
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

logger = get_logger(__name__)
router = APIRouter()
settings = get_settings()

# Additional schemas for the new endpoints
class PaymentOrderItem(BaseModel):
    product_id: int
    quantity: int
    price: float

class PaymentOrderRequest(BaseModel):
    items: List[PaymentOrderItem]
    description: str = "پرداخت سفارش"
    mobile: str = None
    email: str = None

# Non-authenticated version for testing
@router.post("/create-order-public", response_model=PaymentResponse)
async def create_payment_order_public(
    order_data: PaymentOrderRequest,
    db: Session = Depends(get_db)
):
    """
    ایجاد سفارش جدید و درخواست پرداخت (بدون احراز هویت)
    """
    try:
        payment_service = PaymentService(db)
        
        # Calculate total amount in Rial
        total_amount_toman = sum(item.price * item.quantity for item in order_data.items)
        total_amount_rial = int(total_amount_toman * 10)  # Convert Toman to Rial
        
        # Prepare items for service
        items = [
            {
                'product_id': item.product_id,
                'quantity': item.quantity,
                'price': item.price
            }
            for item in order_data.items
        ]
        
        # Create payment order without user (for testing)
        result = await payment_service.create_payment_order(
            user_id=None,  # No user authentication
            items=items,
            total_amount=total_amount_rial,
            description=order_data.description,
            mobile=order_data.mobile,
            email=order_data.email
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
        
        # Calculate total amount in Rial
        total_amount_toman = sum(item.price * item.quantity for item in order_data.items)
        total_amount_rial = int(total_amount_toman * 10)  # Convert Toman to Rial
        
        # Prepare items for service
        items = [
            {
                'product_id': item.product_id,
                'quantity': item.quantity,
                'price': item.price
            }
            for item in order_data.items
        ]
        
        # Create payment order
        result = await payment_service.create_payment_order(
            user_id=current_user.id,
            items=items,
            total_amount=total_amount_rial,
            description=order_data.description,
            mobile=order_data.mobile or current_user.phone_number,
            email=order_data.email
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
        # آدرس بازگشت پس از پرداخت
        callback_url = f"{settings.FRONTEND_URL}/payment/callback"
        
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
        # آدرس بازگشت پس از پرداخت
        callback_url = f"{settings.FRONTEND_URL}/payment/callback"
        
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
                status=result["status"]
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
                status=result["status"]
            )
        else:
            return PaymentVerificationResponse(
                success=False,
                error=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در تایید پرداخت")

@router.get("/callback")
async def payment_callback(
    request: Request,
    Authority: str = None,
    Status: str = None,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint که زرین‌پال کاربر را به اینجا هدایت می‌کند
    """
    try:
        if Status == "OK" and Authority:
            # پرداخت موفق - هدایت به صفحه تایید
            logger.info(f"Payment callback successful: Authority={Authority}, Status={Status}")
            
            # Get order information for redirect
            payment_service = PaymentService(db)
            order = payment_service.get_order_by_authority(Authority)
            
            if order:
                return {
                    "message": "پرداخت با موفقیت انجام شد",
                    "authority": Authority,
                    "status": Status,
                    "order_id": order.id,
                    "redirect_url": f"{settings.FRONTEND_URL}/payment/success?authority={Authority}&order_id={order.id}"
                }
            else:
                return {
                    "message": "پرداخت با موفقیت انجام شد",
                    "authority": Authority,
                    "status": Status,
                    "redirect_url": f"{settings.FRONTEND_URL}/payment/success?authority={Authority}"
                }
        else:
            # پرداخت ناموفق
            logger.warning(f"Payment callback failed: Authority={Authority}, Status={Status}")
            return {
                "message": "پرداخت ناموفق",
                "authority": Authority,
                "status": Status,
                "redirect_url": f"{settings.FRONTEND_URL}/payment/failed?authority={Authority}"
            }
            
    except Exception as e:
        logger.error(f"Payment callback error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در پردازش callback")

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
        orders = payment_service.get_user_orders(current_user.id, status)
        
        return {
            "success": True,
            "orders": [
                {
                    "id": order.id,
                    "total_amount": order.total_amount,
                    "status": order.status,
                    "created_at": order.created_at,
                    "payment_authority": order.payment_authority,
                    "payment_ref_id": order.payment_ref_id,
                    "items_count": len(order.items)
                }
                for order in orders
            ]
        }
    except Exception as e:
        logger.error(f"Get user orders error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در دریافت سفارشات")

@router.get("/order/{authority}")
async def get_order_by_authority(
    authority: str,
    db: Session = Depends(get_db)
):
    """Get order details by payment authority"""
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
                    "market_price": product.market_price,
                    "images": [img.image_url for img in product.images if img.is_main]
                }
            })
        
        # Check if there's an active group buy for this order
        group_buy = None
        if order.status == "پرداخت شده":
            # Check if user has created or joined a group buy recently
            # This is simplified - you might want to track this more precisely
            group_buy = {
                "expires_at": (order.created_at + timedelta(hours=24)).isoformat(),
                "participants_count": 1,  # For now, just the order creator
                "invite_code": f"GB{order.id}{authority[:8]}"
            }
        
        return {
            "order_id": order.id,
            "status": order.status,
            "total_amount": order.total_amount,
            "payment_authority": order.payment_authority,
            "payment_ref_id": order.payment_ref_id,
            "created_at": order.created_at.isoformat(),
            "items": order_items,
            "group_buy": group_buy
        }
        
    except Exception as e:
        logger.error(f"Get order by authority error: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در دریافت سفارش")

