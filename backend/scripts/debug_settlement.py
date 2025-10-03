#!/usr/bin/env python3
import sys
from typing import Optional
from app.database import SessionLocal
from app.models import Order, GroupOrder, User
from app.services.group_settlement_service import GroupSettlementService
from sqlalchemy import and_
import json


def parse_invite(code: str):
    raw = code[2:] if code and code.startswith('GB') else code
    digits = ''
    for ch in raw:
        if ch.isdigit():
            digits += ch
        else:
            break
    order_id = int(digits) if digits else None
    prefix = raw[len(digits):]
    return order_id, prefix


def find_group(session, code: str) -> Optional[GroupOrder]:
    # Try direct match on invite_token
    # IMPORTANT: Use the NEWEST group with this invite_token to handle edge cases correctly
    g = session.query(GroupOrder).filter(
        GroupOrder.invite_token == code
    ).order_by(GroupOrder.created_at.desc()).first()
    if g:
        return g
    # Try parse and match
    order_id, _ = parse_invite(code)
    if order_id:
        # by leader order id
        # IMPORTANT: Use the NEWEST group with this pattern to handle edge cases correctly
        g = session.query(GroupOrder).filter(
            GroupOrder.invite_token.like(f"GB{order_id}%")
        ).order_by(GroupOrder.created_at.desc()).first()
        if g:
            return g
        # by leader order's group
        leader_order = session.query(Order).filter(Order.id == order_id).first()
        if leader_order and leader_order.group_order_id:
            g = session.query(GroupOrder).filter(GroupOrder.id == leader_order.group_order_id).first()
            if g:
                return g
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: debug_settlement.py GB{orderId}{prefix}")
        sys.exit(1)
    code = sys.argv[1]
    print("Analyzing invite code:", code)
    order_id, prefix = parse_invite(code)
    print("Parsed order_id:", order_id, "prefix:", prefix)

    session = SessionLocal()
    try:
        group = find_group(session, code)
        if not group:
            print("Group not found for invite code")
            return
        print("Group:", group.id, "invite_token:", group.invite_token, "status:", getattr(group.status, 'value', group.status))
        print("expected_friends:", group.expected_friends, "settlement_required:", group.settlement_required, "settlement_amount:", group.settlement_amount)

        # Find leader order
        leader_order = session.query(Order).filter(and_(Order.group_order_id == group.id, Order.user_id == group.leader_id, Order.is_settlement_payment == False)).order_by(Order.created_at.asc()).first()
        if leader_order:
            print("Leader order:", leader_order.id, "status:", leader_order.status, "payment_ref_id:", leader_order.payment_ref_id)
        else:
            print("Leader order: not found")

        # Count paid friends
        paid_friend_orders = session.query(Order).filter(and_(Order.group_order_id == group.id, Order.user_id != group.leader_id, Order.payment_ref_id.isnot(None), Order.is_settlement_payment == False)).all()
        print("Paid friends count:", len(paid_friend_orders), "orders:", [o.id for o in paid_friend_orders])

        # Ensure expected_friends exists: try infer from leader delivery_slot JSON
        if not group.expected_friends:
            inferred = None
            if leader_order and leader_order.delivery_slot:
                try:
                    info = json.loads(leader_order.delivery_slot)
                    if isinstance(info, dict):
                        if isinstance(info.get("friends"), int):
                            inferred = int(info["friends"]) 
                        elif isinstance(info.get("max_friends"), int):
                            inferred = int(info["max_friends"]) 
                except Exception:
                    inferred = None
            if inferred is None:
                # Fallback: assume 3
                inferred = 3
                print("Fallback: setting expected_friends to 3")
            group.expected_friends = inferred
            session.commit()
            session.refresh(group)
            print("expected_friends updated to:", group.expected_friends)

        # Enforce settlement check
        svc = GroupSettlementService(session)
        res = svc.check_and_mark_settlement_required(group.id)
        session.commit()
        print("Settlement check:", res)

        # Refresh and show leader order status
        if leader_order:
            session.refresh(leader_order)
            print("Leader order status now:", leader_order.status)
        # Show in settlements list
        settlements = svc.get_groups_requiring_settlement()
        print("Settlements list contains group?", any(s.get('group_order_id') == group.id for s in settlements))
    finally:
        session.close()


if __name__ == "__main__":
    main()
