import os
import sqlite3
import sys


def inspect(db_path: str) -> None:
	try:
		con = sqlite3.connect(db_path)
		cur = con.cursor()
		def count(table: str) -> int:
			try:
				cur.execute(f"SELECT COUNT(1) FROM {table}")
				return cur.fetchone()[0]
			except Exception:
				return -1
		counts = {
			"products": count("products"),
			"orders": count("orders"),
			"group_orders": count("group_orders"),
			"users": count("users"),
		}
		print(f"DB {db_path}")
		for k, v in counts.items():
			print(f"  {k}: {v}")
	finally:
		try:
			con.close()
		except Exception:
			pass


if __name__ == "__main__":
	for p in sys.argv[1:]:
		inspect(os.path.abspath(p))


