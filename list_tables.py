import sqlite3
import pprint

conn = sqlite3.connect('src/commerce/db.sqlite3')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]
pprint.pprint(tables)
