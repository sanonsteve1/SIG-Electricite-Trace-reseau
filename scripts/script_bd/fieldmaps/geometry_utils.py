# -*- coding: utf-8 -*-
"""Conversion géométrie Esri JSON → WKT (pour l'API GIS)."""


def _ring_to_wkt_line(ring: list) -> str:
    """Liste de [x,y] ou [x,y,z] → chaîne 'x y, x y, ...' (lon lat pour WKT)."""
    parts = []
    for p in ring:
        if len(p) >= 2:
            parts.append(f"{p[0]} {p[1]}")
    return ", ".join(parts)


def esri_geometry_to_wkt(geom: dict) -> str | None:
    """
    Convertit une géométrie Esri (JSON) en WKT (SRID 4326 attendu : lon, lat).
    Supporte: point, polyline, polygon (multigeométries gérées en single).
    """
    if not geom or not isinstance(geom, dict):
        return None
    gtype = (geom.get("geometryType") or "").lower()
    # Point
    if "x" in geom and "y" in geom:
        return f"POINT ({geom['x']} {geom['y']})"
    # Multipoint
    if "points" in geom:
        pts = geom["points"]
        if not pts:
            return None
        return "MULTIPOINT (" + ", ".join(f"({p[0]} {p[1]})" for p in pts if len(p) >= 2) + ")"
    # Polyline (paths)
    if "paths" in geom:
        paths = geom["paths"]
        if not paths:
            return None
        if len(paths) == 1:
            return "LINESTRING (" + _ring_to_wkt_line(paths[0]) + ")"
        return "MULTILINESTRING (" + ", ".join("(" + _ring_to_wkt_line(p) + ")" for p in paths) + ")"
    # Polygon (rings)
    if "rings" in geom:
        rings = geom["rings"]
        if not rings:
            return None
        if len(rings) == 1:
            return "POLYGON ((" + _ring_to_wkt_line(rings[0]) + "))"
        return "MULTIPOLYGON (" + ", ".join("((" + _ring_to_wkt_line(r) + "))" for r in rings) + ")"
    return None


def feature_geometry_to_wkt(feature: dict) -> str | None:
    """Extrait la géométrie d'un feature Esri (feature.geometry) et la convertit en WKT."""
    geom = feature.get("geometry") if isinstance(feature, dict) else None
    return esri_geometry_to_wkt(geom)
