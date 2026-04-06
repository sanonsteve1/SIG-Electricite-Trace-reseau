from fastapi import FastAPI


def register(app: FastAPI) -> None:
    @app.get("/health")
    def health():
        return {"status": "ok"}

