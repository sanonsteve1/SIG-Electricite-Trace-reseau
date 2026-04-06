from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from .config import DB_CONFIG


@contextmanager
def get_connection():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_cursor(conn):
    return conn.cursor(cursor_factory=RealDictCursor)

