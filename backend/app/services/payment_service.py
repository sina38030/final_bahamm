from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.models import Order, OrderItem, Product, User
from app.payment import zarinpal
from app.utils.logging import get_logger
from app.config import get_settings

logger = get_logger(__name__)
settings = get_settings()

class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    async def create_payment_order(
        self,
        user_id: Optional[int],
        items: list,
        total_amount: int,
        description: str = "پرداخت سفارش",
        mobile: str = None,
        email: str = None
    ) -> Dict[str, Any]:
        """
        Create an order and initiate payment
        
        Args:
            user_id: User ID
            items: List of items with product_id, quantity, price
            total_amount: Total amount in Rial
            description: Payment description
            mobile: User mobile number
            email: User email
        
        Returns:
            Dict with payment URL and order info
        """
        try:
            # Create order
            order = Order(
                user_id=user_id,
                total_amount=total_amount / 10,  # Convert Rial to Toman for storage
                status="در انتظار پرداخت"
            )
            self.db.add(order)
            self.db.flush()  # Get order ID
            
            # Create order items
            for item in items:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item['product_id'],
                    quantity=item['quantity'],
                    base_price=item['price']
                )
                self.db.add(order_item)
            
            # Request payment from ZarinPal
            callback_url = f"{settings.FRONTEND_URL}/payment/callback"
            payment_result = await zarinpal.request_payment(
                amount=total_amount,
                description=f"{description} - سفارش #{order.id}",
                callback_url=callback_url,
                mobile=mobile,
                email=email
            )
            
            if payment_result["success"]:
                # Store authority with order for tracking
                order.payment_authority = payment_result["authority"]
                self.db.commit()
                
                logger.info(f"Payment order created: Order #{order.id}, Authority: {payment_result['authority']}")
                
                return {
                    "success": True,
                    "order_id": order.id,
                    "authority": payment_result["authority"],
                    "payment_url": payment_result["payment_url"]
                }
            else:
                # Payment request failed, rollback order
                self.db.rollback()
                return {
                    "success": False,
                    "error": payment_result["error"]
                }
                
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating payment order: {str(e)}")
            return {
                "success": False,
                "error": f"خطا در ایجاد سفارش: {str(e)}"
            }

    async def verify_and_complete_payment(
        self,
        authority: str,
        amount: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Verify payment and complete the order
        
        Args:
            authority: Payment authority from ZarinPal
            amount: Payment amount in Rial
            user_id: User ID (optional for additional verification)
        
        Returns:
            Dict with verification result and order status
        """
        try:
            # Find order by authority
            order = self.db.query(Order).filter(Order.payment_authority == authority).first()
            if not order:
                return {
                    "success": False,
                    "error": "سفارش مرتبط با این پرداخت یافت نشد"
                }
            
            # Additional user verification if provided
            if user_id and order.user_id != user_id:
                return {
                    "success": False,
                    "error": "دسترسی به این سفارش مجاز نیست"
                }
            
            # Use order amount if amount not provided
            verify_amount = amount if amount is not None else int(order.total_amount * 10)  # Convert Toman to Rial
            
            # Verify payment with ZarinPal
            verification_result = await zarinpal.verify_payment(authority, verify_amount)
            
            if verification_result["success"]:
                # Payment successful, update order status
                order.status = "پرداخت شده"
                order.payment_ref_id = verification_result["ref_id"]
                
                # You can add additional logic here like:
                # - Update product stock
                # - Send confirmation email/SMS
                # - Award user coins/points
                # - Trigger order fulfillment process
                
                self.db.commit()
                
                logger.info(f"Payment completed: Order #{order.id}, RefID: {verification_result['ref_id']}")
                
                return {
                    "success": True,
                    "order_id": order.id,
                    "ref_id": verification_result["ref_id"],
                    "status": verification_result["status"],
                    "order_status": order.status
                }
            else:
                # Payment verification failed
                order.status = "پرداخت ناموفق"
                self.db.commit()
                
                return {
                    "success": False,
                    "error": verification_result["error"],
                    "order_id": order.id
                }
                
        except Exception as e:
            logger.error(f"Error verifying payment: {str(e)}")
            return {
                "success": False,
                "error": f"خطا در تایید پرداخت: {str(e)}"
            }

    def get_order_by_authority(self, authority: str) -> Optional[Order]:
        """Get order by payment authority"""
        return self.db.query(Order).filter(Order.payment_authority == authority).first()

    def get_user_orders(self, user_id: int, status: str = None) -> list:
        """Get user orders with optional status filter"""
        query = self.db.query(Order).filter(Order.user_id == user_id)
        if status:
            query = query.filter(Order.status == status)
        return query.order_by(Order.created_at.desc()).all() 