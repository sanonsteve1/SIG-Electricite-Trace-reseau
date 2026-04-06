from typing import Any, Dict, List

from .common import fetch_all_dict


def run_acceptance_tests() -> List[Dict[str, Any]]:
    return fetch_all_dict("SELECT * FROM reseau.run_acceptance_tests()")

