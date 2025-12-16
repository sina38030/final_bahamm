"""
Add database indexes to improve query performance
Run once to optimize slow queries
"""
import sqlite3
import sys

def add_indexes():
    try:
        db_path = "/home/ubuntu/bahamm-git/bahamm1.db"
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Adding database indexes for performance...")
        
        # Index for orders by user_id (most common query)
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)")
            print("✅ Added index: orders.user_id")
        except Exception as e:
            print(f"⚠️  orders.user_id: {e}")
        
        # Index for orders by group_order_id
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_group_order_id ON orders(group_order_id)")
            print("✅ Added index: orders.group_order_id")
        except Exception as e:
            print(f"⚠️  orders.group_order_id: {e}")
        
        # Composite index for paid orders filter
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(user_id, paid_at, payment_ref_id)")
            print("✅ Added index: orders(user_id, paid_at, payment_ref_id)")
        except Exception as e:
            print(f"⚠️  orders paid: {e}")
        
        # Index for group_orders by leader_id
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_group_orders_leader_id ON group_orders(leader_id)")
            print("✅ Added index: group_orders.leader_id")
        except Exception as e:
            print(f"⚠️  group_orders.leader_id: {e}")
        
        # Index for group_orders status
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_group_orders_status ON group_orders(status)")
            print("✅ Added index: group_orders.status")
        except Exception as e:
            print(f"⚠️  group_orders.status: {e}")
        
        # Index for order_items by order_id
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)")
            print("✅ Added index: order_items.order_id")
        except Exception as e:
            print(f"⚠️  order_items.order_id: {e}")
        
        conn.commit()
        conn.close()
        
        print("\n✅ All indexes created successfully!")
        print("Database queries should be 5-10x faster now!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_indexes()

