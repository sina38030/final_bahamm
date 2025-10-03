import os
import sqlite3
import sys


def add_column_if_missing(connection: sqlite3.Connection, table: str, column: str, col_def: str) -> None:
	cur = connection.cursor()
	cur.execute(f"PRAGMA table_info({table})")
	cols = {row[1] for row in cur.fetchall()}
	if column not in cols:
		print(f"Adding {table}.{column} ...")
		cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
		connection.commit()
	else:
		print(f"{table}.{column} already exists")


def main(db_path: str) -> None:
	if not os.path.isabs(db_path):
		db_path = os.path.abspath(db_path)
	print(f"Ensuring schema on: {db_path}")
	if not os.path.exists(db_path):
		raise SystemExit(f"Database not found: {db_path}")

	con = sqlite3.connect(db_path)
	try:
		# Ensure group_orders table exists (minimal shape)
		con.execute(
			"""
			CREATE TABLE IF NOT EXISTS group_orders (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				leader_id INTEGER NOT NULL,
				invite_token VARCHAR(50) UNIQUE NOT NULL,
				status VARCHAR(20) NOT NULL DEFAULT 'GROUP_FORMING',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
			"""
		)

		# Add expected columns on group_orders
		group_cols = [
			("leader_paid_at", "DATETIME"),
			("expires_at", "DATETIME"),
			("finalized_at", "DATETIME"),
			("basket_snapshot", "TEXT"),
			("expected_friends", "INTEGER DEFAULT NULL"),
			("settlement_required", "BOOLEAN DEFAULT 0"),
			("settlement_amount", "INTEGER DEFAULT 0"),
			("settlement_paid_at", "DATETIME DEFAULT NULL"),
			("refund_due_amount", "INTEGER DEFAULT 0"),
			("refund_card_number", "VARCHAR(32) DEFAULT NULL"),
			("refund_requested_at", "DATETIME DEFAULT NULL"),
			("refund_paid_at", "DATETIME DEFAULT NULL"),
			("allow_consolidation", "BOOLEAN DEFAULT 0"),
			("leader_address_id", "INTEGER"),
		]
		for name, coldef in group_cols:
			add_column_if_missing(con, "group_orders", name, coldef)

		# Orders table columns
		order_cols = [
			("order_type", "VARCHAR(10) DEFAULT 'ALONE'"),
			("group_order_id", "INTEGER"),
			("paid_at", "DATETIME"),
			("ship_to_leader_address", "BOOLEAN DEFAULT 0"),
			("is_settlement_payment", "BOOLEAN DEFAULT 0"),
			("payment_authority", "VARCHAR(100)"),
			("payment_ref_id", "VARCHAR(100)"),
		]
		for name, coldef in order_cols:
			add_column_if_missing(con, "orders", name, coldef)

		# Helpful indexes (ignore if already exist)
		con.execute(
			"CREATE INDEX IF NOT EXISTS idx_group_orders_settlement ON group_orders(settlement_required, settlement_paid_at)"
		)
		con.execute(
			"CREATE INDEX IF NOT EXISTS idx_orders_payment_authority ON orders(payment_authority)"
		)
		con.execute(
			"CREATE INDEX IF NOT EXISTS idx_orders_payment_ref_id ON orders(payment_ref_id)"
		)
		con.commit()
		print("Schema ensured successfully.")
	finally:
		con.close()


if __name__ == "__main__":
	# Default to the earlier DB under backend/bahamm.db
	default_db = os.path.join(os.path.dirname(__file__), "..", "bahamm.db")
	default_db = os.path.abspath(default_db)
	db = sys.argv[1] if len(sys.argv) > 1 else default_db
	main(db)


\n# touch to reload
