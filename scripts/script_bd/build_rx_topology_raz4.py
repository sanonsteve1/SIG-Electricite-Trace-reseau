#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Construit la topologie métier RX RAZ4 dans les tables rx_topology_*.
"""

from __future__ import annotations

import argparse
import json

from api.db import get_connection, get_cursor
from api.rx_topology import RX_RAZ4_TOPOLOGY_CODE, build_rx_raz4_topology


def main() -> int:
    parser = argparse.ArgumentParser(description="Reconstruit la topologie métier RX RAZ4.")
    parser.add_argument("--topology-code", default=RX_RAZ4_TOPOLOGY_CODE, help="Code logique de topologie à reconstruire.")
    parser.add_argument("--cluster-tol-m", type=float, default=35.0, help="Tolérance de regroupement des extrémités/nœuds (m).")
    parser.add_argument("--bridge-tol-m", type=float, default=180.0, help="Tolérance de rattachement HTA -> BT par proximité (m).")
    args = parser.parse_args()

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            summary = build_rx_raz4_topology(
                cur,
                topology_code=args.topology_code,
                cluster_tol_m=float(args.cluster_tol_m),
                hta_bt_bridge_tol_m=float(args.bridge_tol_m),
            )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
