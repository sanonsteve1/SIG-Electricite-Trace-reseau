from .common import fetch_one_dict


def rebuild_subnetwork(sous_reseau_id: str, utilisateur: str) -> int:
    row = fetch_one_dict(
        """
        SELECT reseau.reconstruire_sous_reseau(
            %s::uuid,
            %s::varchar
        ) AS nb
        """,
        (sous_reseau_id, utilisateur),
    )
    return int(row["nb"])


def recalc_incremental(objet_table: str, objet_id: str) -> int:
    row = fetch_one_dict(
        """
        SELECT reseau.f_recalcul_subnetwork_incremental(
            %s::varchar,
            %s::uuid
        ) AS nb
        """,
        (objet_table, objet_id),
    )
    return int(row["nb"])

