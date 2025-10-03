#!/usr/bin/env python3
import sys
import json

sys.path.append('.')

from app.database import get_db
from app.models import User, GroupOrder, Order, Product
from sqlalchemy import func


def simulate_group_invite_response(invite_token: str):
    db = next(get_db())
    try:
        grp = (
            db.query(GroupOrder)
            .filter(func.lower(GroupOrder.invite_token) == str(invite_token).lower())
            .order_by(GroupOrder.created_at.desc())
            .first()
        )
        if not grp:
            return {"success": False, "error": "group_not_found", "invite": invite_token}

        # Leader info (same logic as API)
        leader_user = db.query(User).filter(User.id == grp.leader_id).first() if grp.leader_id else None
        leader_name = (
            getattr(leader_user, "full_name", None)
            or getattr(leader_user, "name", None)
            or getattr(leader_user, "phone_number", None)
            or "Leader"
        ) if leader_user else "Leader"
        leader_phone = getattr(leader_user, "phone_number", None) if leader_user else ""

        # Items: prefer basket_snapshot items
        items = []
        try:
            snap = json.loads(getattr(grp, 'basket_snapshot', '') or '{}')
            if isinstance(snap, dict) and isinstance(snap.get('items'), list):
                for it in snap['items']:
                    product = None
                    try:
                        product = db.query(Product).filter(Product.id == it.get('product_id')).first()
                    except Exception:
                        product = None
                    items.append({
                        "product_id": it.get('product_id'),
                        "quantity": it.get('quantity'),
                        "price": (getattr(product, 'friend_1_price', None) or it.get('unit_price')) if product else it.get('unit_price'),
                        "product_name": it.get('product_name') or (getattr(product, 'name', None) if product else None),
                    })
        except Exception:
            pass

        return {
            "success": True,
            "invite_code": invite_token,
            "leader_name": leader_name,
            "leader_phone": leader_phone or "",
            "items_count": len(items),
        }
    finally:
        try:
            db.close()
        except Exception:
            pass


def main():
    token = sys.argv[1] if len(sys.argv) > 1 else ''
    if not token:
        print(json.dumps({"success": False, "error": "no_token"}, ensure_ascii=False))
        return
    res = simulate_group_invite_response(token)
    print(json.dumps(res, ensure_ascii=False))


if __name__ == '__main__':
    main()



