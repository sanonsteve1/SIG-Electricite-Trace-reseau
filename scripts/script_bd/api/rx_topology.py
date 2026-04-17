# -*- coding: utf-8 -*-
"""
Topologie métier dédiée aux données RX (première cible: RAZ4).

Objectif:
- reconstruire un graphe métier orienté, distinct des tables legacy,
- conserver un mapping vers les objets RX d'origine,
- fournir une source de vérité commune pour le tracé et le schéma unifilaire.
"""

from __future__ import annotations

import json
import math
import re
from collections import defaultdict, deque

import networkx as nx


RX_RAZ4_TOPOLOGY_CODE = "rx_raz4"
RX_TOPOLOGY_FAMILIES = {
    "raz4": {
        "hta_troncons": ["rx_hta_raz_4_troncons"],
        "hta_postes": ["rx_hta_raz_4_poste_hta_bt", "rx_hta_raz_4_poste_hta"],
        "bt_cables": ["rx_bt_raz_4_r333_cable_bt", "rx_bt_raz_4_r227_cable_bt"],
        "bt_postes": ["rx_bt_raz_4_r333_poste_h59", "rx_bt_raz_4_r227_poste_h59"],
    },
    "express": {
        "hta_troncons": ["rx_hta_express_troncons"],
        "hta_postes": ["rx_hta_express_poste_hta_bt"],
        "bt_cables": ["rx_bt_express_r380_cable_bt"],
        "bt_postes": ["rx_bt_express_r380_poste_h59"],
    },
    "raz3": {
        "hta_troncons": ["rx_hta_raz_3_troncons"],
        "hta_postes": ["rx_hta_raz_3_poste_hta_bt"],
        "bt_cables": ["rx_bt_raz_3_r226_cable_bt"],
        "bt_postes": ["rx_bt_raz_3_r226_poste_h59"],
    },
    "motobe": {
        "hta_troncons": ["rx_hta_motobe_troncons"],
        "hta_postes": [],
        "bt_cables": [],
        "bt_postes": [],
    },
}


def _canon(v: object) -> str:
    return str(v or "").replace("{", "").replace("}", "").strip().lower()


def _slug(table_name: str) -> str:
    return (table_name or "").strip().lower().replace("_", "-")


def _get_table_cols(cur, table_name: str) -> set:
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s",
        (table_name,),
    )
    return {r["column_name"] for r in (cur.fetchall() or [])}


def _safe_col(col: str, cols: set, fallback: str = "NULL") -> str:
    if col in cols:
        return f"NULLIF(TRIM(CAST({_quote_ident(col)} AS TEXT)), '')"
    return fallback


def _sanitize_fragment(text: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "_", (text or "").strip().lower())
    return out.strip("_") or "x"


def _quote_ident(name: str) -> str:
    return f'"{name}"'


def _canon_sql_expr(col_name: str) -> str:
    q = _quote_ident(col_name)
    return f"REPLACE(REPLACE(LOWER(CAST({q} AS TEXT)), '{{', ''), '}}', '')"


def _haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(max(1.0 - a, 0.0)))


def _cluster_points(points: list[dict], tolerance_m: float) -> tuple[list[dict], dict[int, int]]:
    if not points:
        return [], {}
    parent = list(range(len(points)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra = find(a)
        rb = find(b)
        if ra != rb:
            parent[rb] = ra

    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            pa = points[i]
            pb = points[j]
            if _haversine_m(pa["lon"], pa["lat"], pb["lon"], pb["lat"]) <= tolerance_m:
                union(i, j)

    groups: dict[int, list[int]] = defaultdict(list)
    for idx in range(len(points)):
        groups[find(idx)].append(idx)

    clusters: list[dict] = []
    assignment: dict[int, int] = {}
    for group_indices in groups.values():
        lon = sum(points[i]["lon"] for i in group_indices) / len(group_indices)
        lat = sum(points[i]["lat"] for i in group_indices) / len(group_indices)
        cluster_idx = len(clusters)
        clusters.append({"cluster_index": cluster_idx, "lon": lon, "lat": lat, "members": list(group_indices)})
        for i in group_indices:
            assignment[i] = cluster_idx
    return clusters, assignment


def ensure_rx_topology_schema(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rx_topology_node (
            node_id TEXT PRIMARY KEY,
            topology_code TEXT NOT NULL,
            network_level TEXT NOT NULL,
            node_type TEXT NOT NULL,
            source_table TEXT NULL,
            source_slug TEXT NULL,
            source_gid TEXT NULL,
            business_label TEXT NULL,
            depart_code TEXT NULL,
            root_rank INTEGER NOT NULL DEFAULT 0,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            geom geometry(Point, 4326) NULL
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS rx_topology_node_topology_idx
        ON rx_topology_node (topology_code)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS rx_topology_node_source_idx
        ON rx_topology_node (topology_code, source_slug, source_gid)
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rx_topology_edge (
            edge_id TEXT PRIMARY KEY,
            topology_code TEXT NOT NULL,
            network_level TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            source_node_id TEXT NOT NULL,
            target_node_id TEXT NOT NULL,
            source_table TEXT NULL,
            source_slug TEXT NULL,
            source_gid TEXT NULL,
            business_label TEXT NULL,
            depart_code TEXT NULL,
            direction_confidence TEXT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            geom geometry(LineString, 4326) NULL
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS rx_topology_edge_topology_idx
        ON rx_topology_edge (topology_code)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS rx_topology_edge_nodes_idx
        ON rx_topology_edge (topology_code, source_node_id, target_node_id)
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rx_topology_mapping (
            topology_code TEXT NOT NULL,
            source_slug TEXT NOT NULL,
            source_gid TEXT NOT NULL,
            entity_kind TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            role TEXT NULL,
            PRIMARY KEY (topology_code, source_slug, source_gid, entity_kind, entity_id)
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS rx_topology_mapping_lookup_idx
        ON rx_topology_mapping (topology_code, source_slug, source_gid)
        """
    )


def clear_rx_topology(cur, topology_code: str = RX_RAZ4_TOPOLOGY_CODE) -> None:
    cur.execute("DELETE FROM rx_topology_mapping WHERE topology_code = %s", (topology_code,))
    cur.execute("DELETE FROM rx_topology_edge WHERE topology_code = %s", (topology_code,))
    cur.execute("DELETE FROM rx_topology_node WHERE topology_code = %s", (topology_code,))


def _fetch_hta_postes(cur) -> list[dict]:
    rows: list[dict] = []
    for family, cfg in RX_TOPOLOGY_FAMILIES.items():
        for table_name in cfg["hta_postes"]:
            cols = _get_table_cols(cur, table_name)
            libelle_e = _safe_col("libelle", cols)
            nom_poste_e = _safe_col("nom_poste", cols)
            depart_e = _safe_col("depart", cols, "''")
            label_expr = f"COALESCE({libelle_e}, {nom_poste_e}, CONCAT('Poste ', CAST(gid AS TEXT)))"
            cur.execute(
                f"""
                SELECT
                    %s AS family,
                    %s AS table_name,
                    CAST(gid AS TEXT) AS gid,
                    COALESCE({depart_e}, '') AS depart_code,
                    {label_expr} AS label,
                    ST_X(ST_Centroid(ST_Transform(geom, 4326))) AS lon,
                    ST_Y(ST_Centroid(ST_Transform(geom, 4326))) AS lat
                FROM {_quote_ident(table_name)}
                WHERE geom IS NOT NULL
                ORDER BY gid
                """,
                (family, table_name),
            )
            rows.extend(dict(r) for r in (cur.fetchall() or []))
    return rows


def _fetch_hta_troncons(cur) -> list[dict]:
    rows = []
    for family, cfg in RX_TOPOLOGY_FAMILIES.items():
        for table_name in cfg["hta_troncons"]:
            cur.execute(
                f"""
                SELECT
                    %s AS family,
                    %s AS table_name,
                    CAST(gid AS TEXT) AS gid,
                    COALESCE(NULLIF(TRIM(CAST(depart AS TEXT)), ''), '') AS depart_code,
                    COALESCE(NULLIF(TRIM(CAST(ident AS TEXT)), ''), CONCAT('Tronçon ', CAST(gid AS TEXT))) AS label,
                    ST_X(ST_StartPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS start_lon,
                    ST_Y(ST_StartPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS start_lat,
                    ST_X(ST_EndPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS end_lon,
                    ST_Y(ST_EndPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS end_lat,
                    ST_AsText(ST_LineMerge(ST_Transform(geom, 4326))) AS geom_wkt
                FROM {_quote_ident(table_name)}
                WHERE geom IS NOT NULL
                ORDER BY gid
                """,
                (family, table_name),
            )
            for row in cur.fetchall() or []:
                item = dict(row)
                if any(item.get(k) is None for k in ("start_lon", "start_lat", "end_lon", "end_lat")):
                    continue
                rows.append(item)
    return rows


def _fetch_bt_postes(cur) -> list[dict]:
    rows: list[dict] = []
    for family, cfg in RX_TOPOLOGY_FAMILIES.items():
        for table_name in cfg["bt_postes"]:
            cols = _get_table_cols(cur, table_name)
            num_e = _safe_col("num_poste", cols)
            nom_e = _safe_col("nom_poste", cols)
            cur.execute(
                f"""
                SELECT
                    %s AS family,
                    %s AS table_name,
                    CAST(gid AS TEXT) AS gid,
                    COALESCE({num_e}, {nom_e}, CONCAT('Poste BT ', CAST(gid AS TEXT))) AS num_poste,
                    COALESCE({nom_e}, {num_e}, CONCAT('Poste BT ', CAST(gid AS TEXT))) AS label,
                    ST_X(ST_Centroid(ST_Transform(geom, 4326))) AS lon,
                    ST_Y(ST_Centroid(ST_Transform(geom, 4326))) AS lat
                FROM {_quote_ident(table_name)}
                WHERE geom IS NOT NULL
                ORDER BY gid
                """,
                (family, table_name),
            )
            rows.extend(dict(r) for r in (cur.fetchall() or []))
    return rows


def _fetch_bt_cables(cur) -> list[dict]:
    rows: list[dict] = []
    for family, cfg in RX_TOPOLOGY_FAMILIES.items():
        for table_name in cfg["bt_cables"]:
            cols = _get_table_cols(cur, table_name)
            num_e = _safe_col("num_poste", cols, "'BT'")
            dep_e = _safe_col("nom_du_dep", cols)
            cur.execute(
                f"""
                SELECT
                    %s AS family,
                    %s AS table_name,
                    CAST(gid AS TEXT) AS gid,
                    COALESCE({num_e}, 'BT') AS num_poste,
                    COALESCE({dep_e}, CONCAT('Départ BT ', CAST(gid AS TEXT))) AS depart_name,
                    ST_X(ST_StartPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS start_lon,
                    ST_Y(ST_StartPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS start_lat,
                    ST_X(ST_EndPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS end_lon,
                    ST_Y(ST_EndPoint(ST_LineMerge(ST_Transform(geom, 4326)))) AS end_lat,
                    ST_AsText(ST_LineMerge(ST_Transform(geom, 4326))) AS geom_wkt
                FROM {_quote_ident(table_name)}
                WHERE geom IS NOT NULL
                ORDER BY gid
                """,
                (family, table_name),
            )
            for row in cur.fetchall() or []:
                item = dict(row)
                if any(item.get(k) is None for k in ("start_lon", "start_lat", "end_lon", "end_lat")):
                    continue
                rows.append(item)
    return rows


def _pick_leaf_root(graph: nx.Graph, preferred_nodes: set[str] | None = None) -> str | None:
    if graph.number_of_nodes() == 0:
        return None
    candidates = [n for n in graph.nodes if graph.degree(n) <= 1]
    if not candidates:
        candidates = list(graph.nodes)
    if preferred_nodes:
        preferred = [n for n in candidates if n in preferred_nodes]
        if preferred:
            candidates = preferred
    best_node = None
    best_score = None
    for node in candidates:
        lengths = nx.single_source_shortest_path_length(graph, node)
        score = sum(lengths.values())
        if best_score is None or score < best_score or (score == best_score and str(node) < str(best_node)):
            best_score = score
            best_node = node
    return best_node


def _orient_edges_from_root(graph: nx.Graph, root: str, edge_items: list[dict]) -> None:
    if not root or root not in graph:
        return
    distances = nx.single_source_shortest_path_length(graph, root)
    for item in edge_items:
        a = item["source_node_id"]
        b = item["target_node_id"]
        da = distances.get(a)
        db = distances.get(b)
        if da is None or db is None:
            continue
        if da <= db:
            continue
        item["source_node_id"], item["target_node_id"] = b, a


def _build_hta_topology(topology_code: str, postes: list[dict], troncons: list[dict], cluster_tol_m: float) -> tuple[list[dict], list[dict], list[dict], dict[str, str]]:
    nodes: list[dict] = []
    edges: list[dict] = []
    mappings: list[dict] = []
    point_records: list[dict] = []
    for row in postes:
        point_records.append({"kind": "poste", "gid": row["gid"], "family": row["family"], "lon": float(row["lon"]), "lat": float(row["lat"]), "depart_code": row["depart_code"]})
    for row in troncons:
        point_records.append({"kind": "start", "gid": row["gid"], "family": row["family"], "lon": float(row["start_lon"]), "lat": float(row["start_lat"]), "depart_code": row["depart_code"]})
        point_records.append({"kind": "end", "gid": row["gid"], "family": row["family"], "lon": float(row["end_lon"]), "lat": float(row["end_lat"]), "depart_code": row["depart_code"]})

    family_point_indices: dict[str, list[int]] = defaultdict(list)
    for idx, record in enumerate(point_records):
        family_key = _sanitize_fragment(str(record.get("family") or "")) or "rx"
        family_point_indices[family_key].append(idx)

    clusters: list[dict] = []
    record_cluster_key: dict[int, str] = {}
    for family_key, indices in family_point_indices.items():
        subset = [point_records[i] for i in indices]
        family_clusters, family_assignment = _cluster_points(subset, cluster_tol_m)
        for cluster in family_clusters:
            cluster_key = f"{family_key}:{cluster['cluster_index']}"
            global_members = [indices[i] for i in cluster["members"]]
            clusters.append(
                {
                    "cluster_key": cluster_key,
                    "cluster_index": cluster["cluster_index"],
                    "family": family_key,
                    "members": global_members,
                    "lon": cluster["lon"],
                    "lat": cluster["lat"],
                }
            )
        for local_idx, cluster_index in family_assignment.items():
            record_cluster_key[indices[local_idx]] = f"{family_key}:{cluster_index}"

    cluster_node_id: dict[str, str] = {}
    cluster_by_key = {cluster["cluster_key"]: cluster for cluster in clusters}
    for cluster in clusters:
        member_departs = sorted({_canon(point_records[idx].get("depart_code")) for idx in cluster["members"] if point_records[idx].get("depart_code")})
        depart_code = member_departs[0] if member_departs else "hta"
        family = str(cluster.get("family") or "rx")
        node_id = f"rx-topology-poteau-hta:{family}:{depart_code}:{cluster['cluster_index']}"
        cluster_node_id[cluster["cluster_key"]] = node_id
        nodes.append(
            {
                "node_id": node_id,
                "network_level": "hta",
                "node_type": "poteau-hta",
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Jonction HTA {cluster['cluster_index'] + 1}",
                "depart_code": depart_code,
                "root_rank": 0,
                "metadata": {"synthetic": True, "members": len(cluster["members"]), "family": family},
                "geom_wkt": f"POINT ({cluster['lon']} {cluster['lat']})",
            }
        )

    poste_cluster: dict[tuple[str, str], str] = {}
    cursor = 0
    for row in postes:
        poste_cluster[(row["table_name"], row["gid"])] = record_cluster_key[cursor]
        cursor += 1
    troncon_clusters: dict[tuple[str, str], tuple[str, str]] = {}
    for row in troncons:
        start_cluster = record_cluster_key[cursor]
        end_cluster = record_cluster_key[cursor + 1]
        troncon_clusters[(row["table_name"], row["gid"])] = (start_cluster, end_cluster)
        cursor += 2

    for row in postes:
        source_table = str(row["table_name"])
        source_slug = _slug(source_table)
        node_id = f"{source_slug}:{_canon(row['gid'])}"
        nodes.append(
            {
                "node_id": node_id,
                "network_level": "hta",
                "node_type": "poste-cabine",
                "source_table": source_table,
                "source_slug": source_slug,
                "source_gid": _canon(row["gid"]),
                "business_label": str(row["label"]).strip(),
                "depart_code": _canon(row["depart_code"]),
                "root_rank": 0,
                "metadata": {"synthetic": False, "family": row["family"]},
                "geom_wkt": f"POINT ({row['lon']} {row['lat']})",
            }
        )
        mappings.append(
            {
                "source_slug": source_slug,
                "source_gid": _canon(row["gid"]),
                "entity_kind": "node",
                "entity_id": node_id,
                "role": "ouvrage",
            }
        )
        cluster_key = poste_cluster[(row["table_name"], row["gid"])]
        junction_id = cluster_node_id[cluster_key]
        cluster_geom = cluster_by_key[cluster_key]
        edge_id = f"rx-topology-edge:hta-poste-link:{source_slug}:{_canon(row['gid'])}"
        edges.append(
            {
                "edge_id": edge_id,
                "network_level": "hta",
                "edge_type": "ligne-hta",
                "source_node_id": junction_id,
                "target_node_id": node_id,
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Liaison poste {row['label']}",
                "depart_code": _canon(row["depart_code"]),
                "direction_confidence": "high",
                "metadata": {"synthetic": True, "link_type": "poste_attachment", "family": row["family"]},
                "geom_wkt": f"LINESTRING ({cluster_geom['lon']} {cluster_geom['lat']}, {row['lon']} {row['lat']})",
            }
        )

    depart_to_graph: dict[str, nx.Graph] = defaultdict(nx.Graph)
    depart_to_poste_clusters: dict[str, set[str]] = defaultdict(set)
    troncon_items: list[dict] = []
    for row in troncons:
        source_table = str(row["table_name"])
        source_slug = _slug(source_table)
        depart_code = _canon(row["depart_code"])
        cluster_a, cluster_b = troncon_clusters[(row["table_name"], row["gid"])]
        source_id = cluster_node_id[cluster_a]
        target_id = cluster_node_id[cluster_b]
        graph_key = f"{_sanitize_fragment(str(row['family']))}:{depart_code}"
        depart_to_graph[graph_key].add_edge(source_id, target_id)
        troncon_items.append(
            {
                "edge_id": f"{source_slug}:{_canon(row['gid'])}",
                "network_level": "hta",
                "edge_type": "ligne-hta",
                "source_node_id": source_id,
                "target_node_id": target_id,
                "source_table": source_table,
                "source_slug": source_slug,
                "source_gid": _canon(row["gid"]),
                "business_label": str(row["label"]).strip(),
                "depart_code": depart_code,
                "direction_confidence": "medium",
                "metadata": {"synthetic": False, "family": row["family"]},
                "geom_wkt": row["geom_wkt"],
            }
        )
        mappings.append(
            {
                "source_slug": source_slug,
                "source_gid": _canon(row["gid"]),
                "entity_kind": "edge",
                "entity_id": f"{source_slug}:{_canon(row['gid'])}",
                "role": "ouvrage",
            }
        )
    for row in postes:
        graph_key = f"{_sanitize_fragment(str(row['family']))}:{_canon(row['depart_code'])}"
        depart_to_poste_clusters[graph_key].add(cluster_node_id[poste_cluster[(row["table_name"], row["gid"])]])

    depart_root_node: dict[str, str] = {}
    for graph_key, graph in depart_to_graph.items():
        family, depart_code = graph_key.split(":", 1)
        root_cluster = _pick_leaf_root(graph, preferred_nodes=depart_to_poste_clusters.get(graph_key) or None)
        if not root_cluster:
            continue
        root_node_id = f"rx-topology-depart:{family}:{depart_code}"
        depart_root_node[graph_key] = root_node_id
        nodes.append(
            {
                "node_id": root_node_id,
                "network_level": "hta",
                "node_type": "depart",
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Départ HTA {depart_code}",
                "depart_code": depart_code,
                "root_rank": 100,
                "metadata": {"synthetic": True, "depart_code": depart_code, "family": family},
                "geom_wkt": None,
            }
        )
        edges.append(
            {
                "edge_id": f"rx-topology-edge:hta-root:{family}:{depart_code}",
                "network_level": "hta",
                "edge_type": "ligne-hta",
                "source_node_id": root_node_id,
                "target_node_id": root_cluster,
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Racine HTA {depart_code}",
                "depart_code": depart_code,
                "direction_confidence": "high",
                "metadata": {"synthetic": True, "link_type": "depart_root", "family": family},
                "geom_wkt": None,
            }
        )
        _orient_edges_from_root(graph, root_cluster, [i for i in troncon_items if _sanitize_fragment(str((i.get("metadata") or {}).get("family") or "")) == family and i["depart_code"] == depart_code])
    edges.extend(troncon_items)
    return nodes, edges, mappings, depart_root_node


def _build_bt_topology(topology_code: str, postes: list[dict], cables: list[dict], cluster_tol_m: float) -> tuple[list[dict], list[dict], list[dict], dict[str, str], dict[str, str]]:
    nodes: list[dict] = []
    edges: list[dict] = []
    mappings: list[dict] = []
    point_records: list[dict] = []
    for row in postes:
        point_records.append({"kind": "poste_bt", "gid": row["gid"], "family": row["family"], "table_name": row["table_name"], "lon": float(row["lon"]), "lat": float(row["lat"]), "num_poste": _sanitize_fragment(str(row["num_poste"]))})
    for row in cables:
        point_records.append({"kind": "start", "gid": row["gid"], "family": row["family"], "table_name": row["table_name"], "lon": float(row["start_lon"]), "lat": float(row["start_lat"]), "num_poste": _sanitize_fragment(str(row["num_poste"]))})
        point_records.append({"kind": "end", "gid": row["gid"], "family": row["family"], "table_name": row["table_name"], "lon": float(row["end_lon"]), "lat": float(row["end_lat"]), "num_poste": _sanitize_fragment(str(row["num_poste"]))})

    family_point_indices: dict[str, list[int]] = defaultdict(list)
    for idx, record in enumerate(point_records):
        family_key = _sanitize_fragment(str(record.get("family") or "")) or "rx"
        family_point_indices[family_key].append(idx)

    clusters: list[dict] = []
    record_cluster_key: dict[int, str] = {}
    for family_key, indices in family_point_indices.items():
        subset = [point_records[i] for i in indices]
        family_clusters, family_assignment = _cluster_points(subset, cluster_tol_m)
        for cluster in family_clusters:
            cluster_key = f"{family_key}:{cluster['cluster_index']}"
            global_members = [indices[i] for i in cluster["members"]]
            clusters.append(
                {
                    "cluster_key": cluster_key,
                    "cluster_index": cluster["cluster_index"],
                    "family": family_key,
                    "members": global_members,
                    "lon": cluster["lon"],
                    "lat": cluster["lat"],
                }
            )
        for local_idx, cluster_index in family_assignment.items():
            record_cluster_key[indices[local_idx]] = f"{family_key}:{cluster_index}"

    cluster_node_id: dict[str, str] = {}
    cluster_by_key = {cluster["cluster_key"]: cluster for cluster in clusters}
    for cluster in clusters:
        num_postes = sorted({_sanitize_fragment(str(point_records[idx].get("num_poste") or "")) for idx in cluster["members"] if point_records[idx].get("num_poste")})
        num_poste = num_postes[0] if num_postes else "bt"
        family = str(cluster.get("family") or "rx")
        node_id = f"rx-topology-poteau-bt:{family}:{num_poste}:{cluster['cluster_index']}"
        cluster_node_id[cluster["cluster_key"]] = node_id
        nodes.append(
            {
                "node_id": node_id,
                "network_level": "bt",
                "node_type": "poteau-bt",
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Jonction BT {cluster['cluster_index'] + 1}",
                "depart_code": num_poste,
                "root_rank": 0,
                "metadata": {"synthetic": True, "members": len(cluster["members"]), "family": family},
                "geom_wkt": f"POINT ({cluster['lon']} {cluster['lat']})",
            }
        )

    poste_cluster: dict[tuple[str, str], str] = {}
    cursor = 0
    for row in postes:
        poste_cluster[(row["table_name"], row["gid"])] = record_cluster_key[cursor]
        cursor += 1
    cable_clusters: dict[tuple[str, str], tuple[str, str]] = {}
    for row in cables:
        start_cluster = record_cluster_key[cursor]
        end_cluster = record_cluster_key[cursor + 1]
        cable_clusters[(row["table_name"], row["gid"])] = (start_cluster, end_cluster)
        cursor += 2

    poste_node_by_num: dict[str, str] = {}
    for row in postes:
        slug = _slug(row["table_name"])
        node_id = f"{slug}:{_canon(row['gid'])}"
        num_poste = _sanitize_fragment(str(row["num_poste"]))
        family_num = f"{_sanitize_fragment(str(row['family']))}:{num_poste}"
        poste_node_by_num.setdefault(family_num, node_id)
        nodes.append(
            {
                "node_id": node_id,
                "network_level": "bt",
                "node_type": "poste-cabine",
                "source_table": row["table_name"],
                "source_slug": slug,
                "source_gid": _canon(row["gid"]),
                "business_label": str(row["label"]).strip(),
                "depart_code": num_poste,
                "root_rank": 0,
                "metadata": {"synthetic": False, "family": row["family"]},
                "geom_wkt": f"POINT ({row['lon']} {row['lat']})",
            }
        )
        mappings.append(
            {
                "source_slug": slug,
                "source_gid": _canon(row["gid"]),
                "entity_kind": "node",
                "entity_id": node_id,
                "role": "ouvrage",
            }
        )
        cluster_key = poste_cluster[(row["table_name"], row["gid"])]
        junction_id = cluster_node_id[cluster_key]
        cluster_geom = cluster_by_key[cluster_key]
        edges.append(
            {
                "edge_id": f"rx-topology-edge:bt-poste-link:{slug}:{_canon(row['gid'])}",
                "network_level": "bt",
                "edge_type": "ligne-bt",
                "source_node_id": node_id,
                "target_node_id": junction_id,
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Liaison poste BT {row['label']}",
                "depart_code": num_poste,
                "direction_confidence": "high",
                "metadata": {"synthetic": True, "link_type": "poste_attachment", "family": row["family"]},
                "geom_wkt": f"LINESTRING ({row['lon']} {row['lat']}, {cluster_geom['lon']} {cluster_geom['lat']})",
            }
        )

    bt_group_graph: dict[str, nx.Graph] = defaultdict(nx.Graph)
    cable_items: list[dict] = []
    edge_to_group: dict[str, str] = {}
    for row in cables:
        slug = _slug(row["table_name"])
        family = _sanitize_fragment(str(row["family"]))
        num_poste = _sanitize_fragment(str(row["num_poste"]))
        depart_name = _sanitize_fragment(str(row["depart_name"]))
        group_key = f"{family}:{num_poste}:{depart_name}"
        start_cluster, end_cluster = cable_clusters[(row["table_name"], row["gid"])]
        source_id = cluster_node_id[start_cluster]
        target_id = cluster_node_id[end_cluster]
        bt_group_graph[group_key].add_edge(source_id, target_id)
        edge_id = f"{slug}:{_canon(row['gid'])}"
        edge_to_group[edge_id] = group_key
        cable_items.append(
            {
                "edge_id": edge_id,
                "network_level": "bt",
                "edge_type": "ligne-bt",
                "source_node_id": source_id,
                "target_node_id": target_id,
                "source_table": row["table_name"],
                "source_slug": slug,
                "source_gid": _canon(row["gid"]),
                "business_label": str(row["depart_name"]).strip(),
                "depart_code": group_key,
                "direction_confidence": "medium",
                "metadata": {"synthetic": False, "family": row["family"], "num_poste": row["num_poste"], "depart_name": row["depart_name"]},
                "geom_wkt": row["geom_wkt"],
            }
        )
        mappings.append(
            {
                "source_slug": slug,
                "source_gid": _canon(row["gid"]),
                "entity_kind": "edge",
                "entity_id": edge_id,
                "role": "ouvrage",
            }
        )

    depart_bt_node_by_group: dict[str, str] = {}
    for group_key, graph in bt_group_graph.items():
        family, num_poste, depart_name = group_key.split(":", 2)
        root_cluster = _pick_leaf_root(graph)
        if not root_cluster:
            continue
        depart_node_id = f"rx-topology-depart-bt:{family}:{num_poste}:{depart_name}"
        depart_bt_node_by_group[group_key] = depart_node_id
        depart_label = depart_name.replace("_", " ").upper()
        nodes.append(
            {
                "node_id": depart_node_id,
                "network_level": "bt",
                "node_type": "depart-bt",
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": depart_label,
                "depart_code": group_key,
                "root_rank": 0,
                "metadata": {"synthetic": True, "group_key": group_key, "family": family},
                "geom_wkt": None,
            }
        )
        family_num = f"{family}:{num_poste}"
        if family_num in poste_node_by_num:
            edges.append(
                {
                    "edge_id": f"rx-topology-edge:bt-poste-to-depart:{group_key}",
                    "network_level": "bt",
                    "edge_type": "ligne-bt",
                    "source_node_id": poste_node_by_num[family_num],
                    "target_node_id": depart_node_id,
                    "source_table": None,
                    "source_slug": None,
                    "source_gid": None,
                    "business_label": f"Départ BT {depart_label}",
                    "depart_code": group_key,
                    "direction_confidence": "high",
                    "metadata": {"synthetic": True, "link_type": "depart_attachment", "family": family},
                    "geom_wkt": None,
                }
            )
        edges.append(
            {
                "edge_id": f"rx-topology-edge:bt-depart-root:{group_key}",
                "network_level": "bt",
                "edge_type": "ligne-bt",
                "source_node_id": depart_node_id,
                "target_node_id": root_cluster,
                "source_table": None,
                "source_slug": None,
                "source_gid": None,
                "business_label": f"Racine BT {depart_label}",
                "depart_code": group_key,
                "direction_confidence": "high",
                "metadata": {"synthetic": True, "link_type": "depart_root", "family": family},
                "geom_wkt": None,
            }
        )
        _orient_edges_from_root(graph, root_cluster, [i for i in cable_items if edge_to_group.get(i["edge_id"]) == group_key])

    edges.extend(cable_items)
    return nodes, edges, mappings, poste_node_by_num, depart_bt_node_by_group


def _connect_hta_bt(nodes: list[dict], edges: list[dict], hta_attach_tol_m: float = 180.0, fallback_tol_m: float = 2500.0) -> None:
    hta_nodes = [n for n in nodes if n["node_type"] == "poste-cabine" and n["network_level"] == "hta" and n.get("geom_wkt")]
    bt_nodes = [n for n in nodes if n["node_type"] == "poste-cabine" and n["network_level"] == "bt" and n.get("geom_wkt")]

    def parse_point_wkt(wkt: str) -> tuple[float, float]:
        inside = (wkt or "").strip().removeprefix("POINT").strip().strip("()")
        lon_s, lat_s = inside.split()
        return float(lon_s), float(lat_s)

    connected_bt_nodes: set[str] = set()
    for bt in bt_nodes:
        bt_family = _sanitize_fragment(str((bt.get("metadata") or {}).get("family") or ""))
        bt_lon, bt_lat = parse_point_wkt(bt["geom_wkt"])
        nearest = None
        nearest_d = None
        for hta in hta_nodes:
            hta_family = _sanitize_fragment(str((hta.get("metadata") or {}).get("family") or ""))
            if bt_family and hta_family and bt_family != hta_family:
                continue
            hta_lon, hta_lat = parse_point_wkt(hta["geom_wkt"])
            d = _haversine_m(bt_lon, bt_lat, hta_lon, hta_lat)
            if nearest_d is None or d < nearest_d:
                nearest_d = d
                nearest = hta
        if nearest and nearest_d is not None and nearest_d <= hta_attach_tol_m:
            edge_id = f"rx-topology-edge:hta-bt-bridge:{nearest['node_id']}:{bt['node_id']}"
            hta_lon, hta_lat = parse_point_wkt(nearest["geom_wkt"])
            bridge_geom = f"LINESTRING({hta_lon} {hta_lat}, {bt_lon} {bt_lat})"
            edges.append(
                {
                    "edge_id": edge_id,
                    "network_level": "bt",
                    "edge_type": "ligne-bt",
                    "source_node_id": nearest["node_id"],
                    "target_node_id": bt["node_id"],
                    "source_table": None,
                    "source_slug": None,
                    "source_gid": None,
                    "business_label": f"Pont HTA/BT {nearest['business_label']} -> {bt['business_label']}",
                    "depart_code": nearest.get("depart_code") or bt.get("depart_code") or "",
                    "direction_confidence": "low",
                    "metadata": {"synthetic": True, "link_type": "hta_bt_bridge", "distance_m": round(nearest_d, 2), "family": bt_family or hta_family},
                    "geom_wkt": bridge_geom,
                }
            )
            connected_bt_nodes.add(bt["node_id"])

    # Fallback contrôlé: si aucun pont proche n'existe pour un poste BT d'une famille donnée,
    # rattacher au poste HTA le plus plausible de la même famille avec une confiance faible.
    fallback_families = {"express"}
    for bt in bt_nodes:
        if bt["node_id"] in connected_bt_nodes:
            continue
        bt_family = _sanitize_fragment(str((bt.get("metadata") or {}).get("family") or ""))
        if bt_family not in fallback_families:
            continue
        bt_lon, bt_lat = parse_point_wkt(bt["geom_wkt"])
        nearest = None
        nearest_d = None
        for hta in hta_nodes:
            hta_family = _sanitize_fragment(str((hta.get("metadata") or {}).get("family") or ""))
            if bt_family and hta_family and bt_family != hta_family:
                continue
            hta_lon, hta_lat = parse_point_wkt(hta["geom_wkt"])
            d = _haversine_m(bt_lon, bt_lat, hta_lon, hta_lat)
            if nearest_d is None or d < nearest_d:
                nearest_d = d
                nearest = hta
        if nearest and nearest_d is not None and nearest_d <= fallback_tol_m:
            edge_id = f"rx-topology-edge:hta-bt-bridge-fallback:{nearest['node_id']}:{bt['node_id']}"
            hta_lon_fb, hta_lat_fb = parse_point_wkt(nearest["geom_wkt"])
            bridge_fallback_geom = f"LINESTRING({hta_lon_fb} {hta_lat_fb}, {bt_lon} {bt_lat})"
            edges.append(
                {
                    "edge_id": edge_id,
                    "network_level": "bt",
                    "edge_type": "ligne-bt",
                    "source_node_id": nearest["node_id"],
                    "target_node_id": bt["node_id"],
                    "source_table": None,
                    "source_slug": None,
                    "source_gid": None,
                    "business_label": f"Pont HTA/BT (fallback) {nearest['business_label']} -> {bt['business_label']}",
                    "depart_code": nearest.get("depart_code") or bt.get("depart_code") or "",
                    "direction_confidence": "low",
                    "metadata": {"synthetic": True, "link_type": "hta_bt_bridge_fallback", "distance_m": round(nearest_d, 2), "family": bt_family},
                    "geom_wkt": bridge_fallback_geom,
                }
            )


def build_rx_raz4_topology(
    cur,
    topology_code: str = RX_RAZ4_TOPOLOGY_CODE,
    cluster_tol_m: float = 35.0,
    hta_bt_bridge_tol_m: float = 180.0,
) -> dict:
    ensure_rx_topology_schema(cur)
    clear_rx_topology(cur, topology_code=topology_code)

    hta_postes = _fetch_hta_postes(cur)
    hta_troncons = _fetch_hta_troncons(cur)
    bt_postes = _fetch_bt_postes(cur)
    bt_cables = _fetch_bt_cables(cur)

    hta_nodes, hta_edges, hta_mappings, _hta_roots = _build_hta_topology(topology_code, hta_postes, hta_troncons, cluster_tol_m)
    bt_nodes, bt_edges, bt_mappings, _bt_postes, _bt_groups = _build_bt_topology(topology_code, bt_postes, bt_cables, cluster_tol_m)

    nodes = hta_nodes + bt_nodes
    edges = hta_edges + bt_edges
    mappings = hta_mappings + bt_mappings
    _connect_hta_bt(nodes, edges, hta_attach_tol_m=hta_bt_bridge_tol_m)

    for node in nodes:
        cur.execute(
            """
            INSERT INTO rx_topology_node (
                node_id, topology_code, network_level, node_type, source_table, source_slug, source_gid,
                business_label, depart_code, root_rank, metadata, geom
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s::jsonb,
                CASE WHEN %s IS NULL OR %s = '' THEN NULL ELSE ST_GeomFromText(%s, 4326) END
            )
            """,
            (
                node["node_id"],
                topology_code,
                node["network_level"],
                node["node_type"],
                node.get("source_table"),
                node.get("source_slug"),
                node.get("source_gid"),
                node.get("business_label"),
                node.get("depart_code"),
                int(node.get("root_rank") or 0),
                json.dumps(node.get("metadata") or {}),
                node.get("geom_wkt"),
                node.get("geom_wkt"),
                node.get("geom_wkt"),
            ),
        )

    for edge in edges:
        cur.execute(
            """
            INSERT INTO rx_topology_edge (
                edge_id, topology_code, network_level, edge_type, source_node_id, target_node_id,
                source_table, source_slug, source_gid, business_label, depart_code,
                direction_confidence, metadata, geom
            )
            VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s::jsonb,
                CASE WHEN %s IS NULL OR %s = '' THEN NULL ELSE ST_GeomFromText(%s, 4326) END
            )
            """,
            (
                edge["edge_id"],
                topology_code,
                edge["network_level"],
                edge["edge_type"],
                edge["source_node_id"],
                edge["target_node_id"],
                edge.get("source_table"),
                edge.get("source_slug"),
                edge.get("source_gid"),
                edge.get("business_label"),
                edge.get("depart_code"),
                edge.get("direction_confidence"),
                json.dumps(edge.get("metadata") or {}),
                edge.get("geom_wkt"),
                edge.get("geom_wkt"),
                edge.get("geom_wkt"),
            ),
        )

    seen_map: set[tuple[str, str, str, str]] = set()
    for mapping in mappings:
        key = (
            mapping["source_slug"],
            mapping["source_gid"],
            mapping["entity_kind"],
            mapping["entity_id"],
        )
        if key in seen_map:
            continue
        seen_map.add(key)
        cur.execute(
            """
            INSERT INTO rx_topology_mapping (
                topology_code, source_slug, source_gid, entity_kind, entity_id, role
            ) VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                topology_code,
                mapping["source_slug"],
                mapping["source_gid"],
                mapping["entity_kind"],
                mapping["entity_id"],
                mapping.get("role"),
            ),
        )

    return {
        "topology_code": topology_code,
        "nodes": len(nodes),
        "edges": len(edges),
        "mappings": len(seen_map),
        "hta_postes": len(hta_postes),
        "hta_troncons": len(hta_troncons),
        "bt_postes": len(bt_postes),
        "bt_cables": len(bt_cables),
    }


def is_rx_topology_slug(ref_slug: str) -> bool:
    s = (ref_slug or "").strip().lower()
    return (
        s.startswith("rx-hta-raz-4-")
        or s.startswith("rx-bt-raz-4-")
        or s.startswith("rx-hta-express-")
        or s.startswith("rx-bt-express-")
        or s.startswith("rx-hta-raz-3-")
        or s.startswith("rx-bt-raz-3-")
        or s.startswith("rx-hta-motobe-")
    )


def has_rx_topology(cur, topology_code: str = RX_RAZ4_TOPOLOGY_CODE) -> bool:
    try:
        cur.execute("SELECT 1 FROM rx_topology_node WHERE topology_code = %s LIMIT 1", (topology_code,))
        return cur.fetchone() is not None
    except Exception:
        return False


def _load_rx_graph(cur, topology_code: str = RX_RAZ4_TOPOLOGY_CODE) -> tuple[dict[str, dict], dict[str, dict], dict[tuple[str, str], list[dict]]]:
    cur.execute(
        """
        SELECT node_id, topology_code, network_level, node_type, source_slug, source_gid, business_label, depart_code, root_rank
        FROM rx_topology_node
        WHERE topology_code = %s
        """,
        (topology_code,),
    )
    nodes = {str(r["node_id"]): dict(r) for r in (cur.fetchall() or [])}
    cur.execute(
        """
        SELECT edge_id, topology_code, network_level, edge_type, source_node_id, target_node_id,
               source_slug, source_gid, business_label, depart_code
        FROM rx_topology_edge
        WHERE topology_code = %s
        """,
        (topology_code,),
    )
    edges = {str(r["edge_id"]): dict(r) for r in (cur.fetchall() or [])}
    cur.execute(
        """
        SELECT source_slug, source_gid, entity_kind, entity_id, role
        FROM rx_topology_mapping
        WHERE topology_code = %s
        """,
        (topology_code,),
    )
    mapping_by_source: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in cur.fetchall() or []:
        mapping_by_source[(str(r["source_slug"]), _canon(r["source_gid"]))].append(dict(r))
    return nodes, edges, mapping_by_source


def _resolve_source_candidates(
    mapping_by_source: dict[tuple[str, str], list[dict]],
    ref_id: str,
    ref_slug: str = "",
) -> list[dict]:
    ref_id_canon = _canon(ref_id)
    ref_slug_norm = (ref_slug or "").strip().lower()
    matches: list[dict] = []
    if ref_slug_norm:
        matches.extend(mapping_by_source.get((ref_slug_norm, ref_id_canon), []))
    if not matches:
        for (slug, gid), items in mapping_by_source.items():
            if gid != ref_id_canon:
                continue
            matches.extend(items)

    def _rank(item: dict) -> tuple[int, int, str]:
        slug = str(item.get("source_slug") or "")
        kind = str(item.get("entity_kind") or "")
        score_kind = 0 if kind == "node" else 1
        if "poste-hta-bt" in slug or "poste-h59" in slug:
            score_slug = 0
        elif "poste" in slug:
            score_slug = 1
        elif "troncons" in slug or "cable-bt" in slug:
            score_slug = 2
        else:
            score_slug = 3
        return (score_kind, score_slug, slug)

    sorted_matches = sorted(matches, key=_rank)

    # Sans slug explicite, plusieurs tables peuvent avoir le même gid (ex. gid=1 dans RAZ4 et Express).
    # On restreint au MEILLEUR slug (premier après tri) pour éviter de montrer l'union de réseaux différents.
    if not ref_slug_norm and sorted_matches:
        best_slug = str(sorted_matches[0].get("source_slug") or "")
        if best_slug:
            sorted_matches = [m for m in sorted_matches if str(m.get("source_slug") or "") == best_slug]

    return sorted_matches


def _traverse_rx_topology(
    nodes: dict[str, dict],
    edges: dict[str, dict],
    mapping_by_source: dict[tuple[str, str], list[dict]],
    ref_id: str,
    ref_slug: str,
    direction: str,
) -> tuple[set[str], set[str], list[str]]:
    candidates = _resolve_source_candidates(mapping_by_source, ref_id, ref_slug=ref_slug)
    if not candidates:
        return set(), set(), []

    graph = nx.DiGraph()
    for edge_id, edge in edges.items():
        graph.add_edge(edge["source_node_id"], edge["target_node_id"], edge_id=edge_id)
    reverse_graph = graph.reverse(copy=False)
    undirected = graph.to_undirected()

    start_nodes: set[str] = set()
    seed_edges: set[str] = set()
    selected_entities: list[str] = []
    for item in candidates:
        selected_entities.append(str(item.get("entity_id") or ""))
        if item.get("entity_kind") == "node":
            start_nodes.add(str(item["entity_id"]))
        elif item.get("entity_kind") == "edge":
            edge = edges.get(str(item["entity_id"]))
            if not edge:
                continue
            seed_edges.add(str(item["entity_id"]))
            if direction == "aval":
                start_nodes.add(str(edge["target_node_id"]))
            elif direction == "amont":
                start_nodes.add(str(edge["source_node_id"]))
            else:
                start_nodes.add(str(edge["source_node_id"]))
                start_nodes.add(str(edge["target_node_id"]))

    if not start_nodes and not seed_edges:
        return set(), set(), selected_entities

    visited_nodes: set[str] = set()
    visited_edges: set[str] = set(seed_edges)

    if direction == "tous":
        for start in start_nodes:
            if start not in undirected:
                visited_nodes.add(start)
                continue
            component = nx.node_connected_component(undirected, start)
            visited_nodes |= set(component)
    else:
        work_graph = graph if direction == "aval" else reverse_graph
        queue: deque[str] = deque(start_nodes)
        visited_nodes |= set(start_nodes)
        while queue:
            current = queue.popleft()
            if current not in work_graph:
                continue
            for nxt in work_graph.successors(current):
                # DiGraph ne conserve qu'un seul edge_id par paire (problème multi-arêtes).
                # On collecte l'edge_id du graphe ici juste pour propager le BFS ;
                # la collecte complète des arêtes se fait après via le dict edges.
                if nxt not in visited_nodes:
                    visited_nodes.add(nxt)
                    queue.append(nxt)
        # En amont, work_graph = reverse ; les nœuds sont bons.
        for edge_id in list(seed_edges):
            edge = edges.get(edge_id)
            if edge:
                visited_nodes.add(str(edge["source_node_id"]))
                visited_nodes.add(str(edge["target_node_id"]))

    # Collecte exhaustive des arêtes : toutes celles dont les deux extrémités sont visitées.
    # Cela résout deux problèmes :
    # 1. nx.DiGraph écrase les multi-arêtes (self-loops, câbles parallèles) → un seul edge_id
    #    serait retenu par BFS ; ici on repart du dict source complet.
    # 2. Les câbles BT dont start == end (endpoints clusterisés au même nœud) sont des
    #    self-loops dans le graphe ; ils ne sont jamais "traversés" par le BFS mais doivent
    #    être inclus si leur nœud est visité.
    for edge_id_all, edge_all in edges.items():
        sn = str(edge_all.get("source_node_id") or "")
        tn = str(edge_all.get("target_node_id") or "")
        if sn in visited_nodes and tn in visited_nodes:
            visited_edges.add(edge_id_all)

    return visited_nodes, visited_edges, selected_entities


def get_rx_trace_result(
    cur,
    ref_id: str,
    ref_slug: str = "",
    direction: str = "tous",
    topology_code: str = RX_RAZ4_TOPOLOGY_CODE,
) -> dict:
    if not has_rx_topology(cur, topology_code=topology_code):
        return {"ouvrage_ids": [], "message": "Topologie RX indisponible. Construisez d'abord rx_topology_*."}

    nodes, edges, mapping_by_source = _load_rx_graph(cur, topology_code=topology_code)
    visited_nodes, visited_edges, _selected = _traverse_rx_topology(nodes, edges, mapping_by_source, ref_id, ref_slug, direction)
    if not visited_nodes and not visited_edges:
        return {"ouvrage_ids": [], "message": "Aucun objet RX correspondant dans la topologie métier."}

    ordered_pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    SYNTHETIC_SLUG = "rx-topology-nodes"
    for node_id in sorted(visited_nodes):
        node = nodes.get(node_id) or {}
        slug = str(node.get("source_slug") or "").strip()
        gid = _canon(node.get("source_gid"))
        if slug and gid and (slug, gid) not in seen:
            seen.add((slug, gid))
            ordered_pairs.append((slug, gid))
        elif not slug:
            # Nœud synthétique (jonction calculée) : exposé via couche rx-topology-nodes
            synthetic_gid = _canon(node_id)
            if (SYNTHETIC_SLUG, synthetic_gid) not in seen:
                seen.add((SYNTHETIC_SLUG, synthetic_gid))
                ordered_pairs.append((SYNTHETIC_SLUG, synthetic_gid))
    SYNTHETIC_EDGE_SLUG = "rx-topology-edges"
    for edge_id in sorted(visited_edges):
        edge = edges.get(edge_id) or {}
        slug = str(edge.get("source_slug") or "").strip()
        gid = _canon(edge.get("source_gid"))
        if slug and gid and (slug, gid) not in seen:
            seen.add((slug, gid))
            ordered_pairs.append((slug, gid))
        elif not slug:
            # Arc synthétique (bridge HTA-BT) : exposé via couche rx-topology-edges
            synthetic_gid = _canon(edge_id)
            if (SYNTHETIC_EDGE_SLUG, synthetic_gid) not in seen:
                seen.add((SYNTHETIC_EDGE_SLUG, synthetic_gid))
                ordered_pairs.append((SYNTHETIC_EDGE_SLUG, synthetic_gid))
    return {"ouvrage_ids": [{"slug": slug, "id": gid} for slug, gid in ordered_pairs], "message": None}


def get_rx_schema_result(
    cur,
    ref_id: str,
    ref_slug: str = "",
    direction: str = "tous",
    mode: str = "complet",
    topology_code: str = RX_RAZ4_TOPOLOGY_CODE,
) -> dict:
    if not has_rx_topology(cur, topology_code=topology_code):
        return {"nodes": [], "edges": [], "message": "Topologie RX indisponible. Construisez d'abord rx_topology_*."}

    nodes, edges, mapping_by_source = _load_rx_graph(cur, topology_code=topology_code)
    visited_nodes, visited_edges, selected_entities = _traverse_rx_topology(nodes, edges, mapping_by_source, ref_id, ref_slug, direction)
    if not visited_nodes and not visited_edges:
        return {"nodes": [], "edges": [], "message": "Aucun nœud connecté dans la topologie RX."}

    root_candidates = [
        node_id
        for node_id in visited_nodes
        if (nodes.get(node_id) or {}).get("root_rank", 0) > 0 or "depart" in str((nodes.get(node_id) or {}).get("node_type") or "")
    ]
    root_node = sorted(root_candidates)[0] if root_candidates else (selected_entities[0] if selected_entities else sorted(visited_nodes)[0])
    if root_node not in visited_nodes and selected_entities:
        # selected_entities may hold an edge_id
        root_node = sorted(visited_nodes)[0]

    graph = nx.DiGraph()
    for edge_id in visited_edges:
        edge = edges.get(edge_id)
        if not edge:
            continue
        if edge["source_node_id"] in visited_nodes and edge["target_node_id"] in visited_nodes:
            graph.add_edge(edge["source_node_id"], edge["target_node_id"], edge_id=edge_id)
    if root_node not in graph and visited_nodes:
        graph.add_nodes_from(visited_nodes)

    if mode == "compact":
        simplify_nodes = {n for n in graph.nodes if "poteau-" in str((nodes.get(n) or {}).get("node_type") or "")}
        undirected = graph.to_undirected()
        for v in list(simplify_nodes):
            if v not in undirected:
                continue
            if undirected.degree(v) != 2:
                continue
            a, b = list(undirected.neighbors(v))
            if a == b:
                continue
            candidate_edges = [e for e in visited_edges if edges[e]["source_node_id"] == v or edges[e]["target_node_id"] == v]
            graph.remove_node(v)
            graph.add_edge(a, b, edge_id=candidate_edges[0] if candidate_edges else "")
            visited_nodes.discard(v)

    if len(graph.nodes) <= 1:
        pos = {n: (120.0, 120.0) for n in graph.nodes}
    else:
        raw_pos = nx.spring_layout(graph.to_undirected(), seed=42, k=0.85, iterations=120)
        xs = [p[0] for p in raw_pos.values()] or [0.0]
        ys = [p[1] for p in raw_pos.values()] or [0.0]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        span_x = (max_x - min_x) if (max_x - min_x) > 1e-9 else 1.0
        span_y = (max_y - min_y) if (max_y - min_y) > 1e-9 else 1.0
        margin = 64.0
        width = 1200.0
        height = 760.0
        pos = {}
        for nid, (rx, ry) in raw_pos.items():
            x = margin + ((rx - min_x) / span_x) * (width - 2 * margin)
            y = margin + ((ry - min_y) / span_y) * (height - 2 * margin)
            pos[nid] = (x, y)

    nodes_out = []
    for node_id in sorted(visited_nodes):
        node = nodes.get(node_id)
        if not node:
            continue
        nodes_out.append(
            {
                "id": node_id,
                "type": node.get("node_type") or "ouvrage",
                "symbol": "sym-ouvrage",
                "label": node.get("business_label") or node_id,
                "x": round(pos.get(node_id, (0.0, 0.0))[0], 2),
                "y": round(pos.get(node_id, (0.0, 0.0))[1], 2),
            }
        )

    edges_out = []
    for edge_id in sorted(visited_edges):
        edge = edges.get(edge_id)
        if not edge:
            continue
        if edge["source_node_id"] not in visited_nodes or edge["target_node_id"] not in visited_nodes:
            continue
        edges_out.append(
            {
                "source": edge["source_node_id"],
                "target": edge["target_node_id"],
                "line_type": edge.get("edge_type") or "ligne-hta",
                "line_gid": edge.get("source_gid") or edge_id,
            }
        )
    return {"nodes": nodes_out, "edges": edges_out, "message": None}
