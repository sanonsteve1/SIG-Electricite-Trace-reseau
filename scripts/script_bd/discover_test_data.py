#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Parcourt les données de la base (poste_source, depart, lignes, transfo, branchement)
et identifie les éléments à utiliser pour les tests du tracé amont/aval.

Usage (depuis script_bd/) :
  python discover_test_data.py

Nécessite la même config DB que l'API (variables d'env ou config par défaut).
"""
from __future__ import print_function

import os
import sys

# Permettre l'import api depuis le répertoire script_bd
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

try:
    from api.db import get_connection, get_cursor
except ImportError:
    print("Erreur: exécuter depuis le répertoire script_bd (où se trouve api/)", file=sys.stderr)
    sys.exit(1)


# Tables utiles pour le tracé (nom physique en base)
TABLES = {
    "poste_source": ("gid", ["numero_poste", "gid"]),
    "depart": ("gid", ["numero", "id_poste_source", "gid"]),
    "ligne_hta": ("gid", ["numero", "id_depart_hta", "id_poteau_hta", "gid"]),
    "ligne_bt": ("gid", ["numero", "id_depart_bt", "id_poteau_bt", "gid"]),
    "ligne_brcht": ("gid", ["numero", "id_depart_bt", "id_poteau_bt", "id_poteau_hta", "gid"]),
    "transfo_ht_bt": ("gid", ["numero", "code_poste", "gid"]),
    "branchement": ("gid", ["numero", "nom", "gid"]),
    "poteau_hta": ("gid", ["numero", "gid"]),
    "poteau_bt": ("gid", ["numero", "gid"]),
    "depart_bt": ("gid", ["numero_depart", "id_poste_sur_poteau", "id_poste_cabine", "gid"]),
}


def quote_ident(name):
    return '"%s"' % name


def table_exists(cur, table_name):
    cur.execute(
        """
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table_name,),
    )
    return cur.fetchone() is not None


def count_and_sample(cur, table_name, pk, cols, limit=5):
    if not table_exists(cur, table_name):
        return None, []
    qtable = quote_ident(table_name)
    col_list = ", ".join(quote_ident(c) for c in cols if c)
    try:
        cur.execute("SELECT COUNT(*) AS n FROM %s" % qtable)
        n = cur.fetchone()["n"]
        cur.execute(
            "SELECT %s FROM %s LIMIT %s" % (col_list or quote_ident(pk), qtable, limit)
        )
        rows = cur.fetchall()
        return n, rows
    except Exception as e:
        return None, []


def main():
    print("=" * 70)
    print("PARCOURS DES DONNEES - Elements pour les tests (trace amont/aval)")
    print("=" * 70)

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            # 1) Comptages et échantillons par table
            print("\n--- 1) Comptages par table ---\n")
            stats = {}
            for table, (pk, cols) in TABLES.items():
                n, rows = count_and_sample(cur, table, pk, cols)
                stats[table] = {"count": n, "sample": rows}
                if n is not None:
                    print("  %s: %s enregistrement(s)" % (table, n))
                    if rows:
                        print("    Exemple (gid): %s" % [r.get("gid") or r.get(pk) for r in rows[:3]])
                else:
                    print("  %s: table absente ou erreur" % table)

            # 2) Chaîne poste_source -> depart -> ligne_hta
            print("\n--- 2) Chaine Poste source -> Depart -> Ligne HTA ---\n")
            if table_exists(cur, "depart") and table_exists(cur, "poste_source"):
                cur.execute(
                    """
                    SELECT d.gid AS depart_gid, d.id_poste_source, d.numero AS depart_numero,
                           ps.gid AS poste_gid, ps.numero_poste
                    FROM depart d
                    JOIN poste_source ps ON ps.gid = d.id_poste_source
                    WHERE d.id_poste_source IS NOT NULL AND d.id_poste_source != ''
                    LIMIT 10
                    """
                )
                poste_departs = cur.fetchall()
                if poste_departs:
                    print("  Departs lies a un poste source: %s enregistrement(s)" % len(poste_departs))
                    for r in poste_departs[:5]:
                        print("    poste_source.gid=%s (%s) -> depart.gid=%s (%s)" % (
                            r["poste_gid"], r["numero_poste"] or "-",
                            r["depart_gid"], r["depart_numero"] or "-",
                        ))
                else:
                    print("  Aucun depart avec id_poste_source renseigne.")
                    cur.execute("SELECT gid, numero_poste FROM poste_source LIMIT 3")
                    for r in cur.fetchall() or []:
                        print("    Poste source disponible: gid=%s" % r["gid"])
            else:
                print("  Tables depart ou poste_source manquantes.")

            # 3) Lignes HTA utilisant des depart
            print("\n--- 3) Lignes HTA referencant des departs ---\n")
            if table_exists(cur, "ligne_hta"):
                cur.execute(
                    """
                    SELECT l.gid AS ligne_gid, l.numero, l.id_depart_hta, l.id_poteau_hta
                    FROM ligne_hta l
                    WHERE l.id_depart_hta IS NOT NULL AND l.id_depart_hta != ''
                    LIMIT 10
                    """
                )
                lignes_hta = cur.fetchall()
                if lignes_hta:
                    print("  Lignes HTA avec id_depart_hta: %s" % len(lignes_hta))
                    for r in lignes_hta[:3]:
                        print("    ligne_hta.gid=%s id_depart_hta=%s id_poteau_hta=%s" % (
                            r["ligne_gid"], r["id_depart_hta"], r["id_poteau_hta"]
                        ))
                else:
                    print("  Aucune ligne HTA avec id_depart_hta renseigne.")
            else:
                print("  Table ligne_hta absente.")
            if table_exists(cur, "ligne_bt"):
                cur.execute(
                    "SELECT COUNT(*) AS n FROM ligne_bt WHERE id_depart_bt IS NOT NULL AND id_depart_bt != ''"
                )
                nb_bt = cur.fetchone()["n"]
                print("  ligne_bt avec id_depart_bt renseigne: %s" % nb_bt)
            if table_exists(cur, "ligne_brcht"):
                cur.execute(
                    "SELECT COUNT(*) AS n FROM ligne_brcht WHERE id_depart_bt IS NOT NULL AND id_depart_bt != ''"
                )
                nb_br = cur.fetchone()["n"]
                print("  ligne_brcht avec id_depart_bt renseigne: %s" % nb_br)

            # 4) Elements recommandes pour les tests
            print("\n--- 4) Elements a utiliser pour les tests ---\n")
            test_refs = []

            # Un poste source qui a au moins un depart
            if table_exists(cur, "depart"):
                cur.execute(
                    """
                    SELECT id_poste_source AS ref_id, COUNT(*) AS nb_departs
                    FROM depart
                    WHERE id_poste_source IS NOT NULL AND id_poste_source != ''
                    GROUP BY id_poste_source
                    ORDER BY COUNT(*) DESC
                    LIMIT 5
                    """
                )
                for r in cur.fetchall() or []:
                    test_refs.append({
                        "type": "poste_source",
                        "ref_id": r["ref_id"],
                        "label": "Poste source avec %s depart(s)" % r["nb_departs"],
                    })
            # Un depart.gid utilisé dans ligne_hta (pour tester le BFS directement)
            if table_exists(cur, "ligne_hta"):
                cur.execute(
                    "SELECT id_depart_hta AS ref_id FROM ligne_hta WHERE id_depart_hta IS NOT NULL LIMIT 1"
                )
                row = cur.fetchone()
                if row and row["ref_id"]:
                    test_refs.append({
                        "type": "depart_gid_as_poste",
                        "ref_id": row["ref_id"],
                        "label": "GID d'un départ utilisé par une ligne HTA (test BFS)",
                    })
            # Un transfo
            if table_exists(cur, "transfo_ht_bt"):
                cur.execute("SELECT gid FROM transfo_ht_bt LIMIT 1")
                row = cur.fetchone()
                if row and row["gid"]:
                    test_refs.append({
                        "type": "poste_transformation",
                        "ref_id": row["gid"],
                        "label": "Transformateur HT/BT (1er en base)",
                    })
            # Un branchement
            if table_exists(cur, "branchement"):
                cur.execute("SELECT gid FROM branchement LIMIT 1")
                row = cur.fetchone()
                if row and row["gid"]:
                    test_refs.append({
                        "type": "abonne",
                        "ref_id": row["gid"],
                        "label": "Branchement (1er en base)",
                    })

            if test_refs:
                print("  Requêtes de test recommandées (API GET /gis/trace):\n")
                for t in test_refs:
                    print("    type=%s  ref_id=%s" % (t["type"], t["ref_id"]))
                    print("      -> %s" % t["label"])
                    print("      curl \"http://localhost:8000/gis/trace?type=%s&ref_id=%s&direction=aval\"" % (
                        t["type"], t["ref_id"]))
                    print()
            else:
                print("  Aucune chaine poste->depart->ligne trouvee. Renseigner id_poste_source dans depart")
                print("  et id_depart_hta dans ligne_hta pour avoir des donnees de test.")

    print("=" * 70)


if __name__ == "__main__":
    main()
