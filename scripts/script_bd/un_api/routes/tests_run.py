from fastapi import FastAPI, HTTPException

from ..services.test_service import run_acceptance_tests


def register(app: FastAPI) -> None:
    @app.post("/un/tests/run")
    def post_run_tests():
        try:
            return {"results": run_acceptance_tests()}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec tests d'acceptation: {exc}") from exc

