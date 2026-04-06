from typing import Any, Dict

from .common import fetch_one_dict


def validate_topology(max_records: int) -> Dict[str, Any]:
    return fetch_one_dict(
        "SELECT * FROM reseau.valider_topologie_reseau(%s::int)",
        (max_records,),
    )

