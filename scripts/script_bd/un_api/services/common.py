from typing import Any, Dict, List

from ..db import get_connection, get_cursor


def fetch_one_dict(sql: str, params: tuple = ()) -> Dict[str, Any]:
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else {}


def fetch_all_dict(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(sql, params)
            return [dict(x) for x in cur.fetchall()]

