# API Python UN-like (FastAPI)

Cette API expose les fonctions metier de ton modele Utility Network-like dans PostgreSQL/PostGIS.

## Installation

Depuis `scripts/script_bd`:

```powershell
pip install -r requirements.txt
```

## Lancement

```powershell
cd scripts/script_bd
python -m uvicorn un_api.main:app --reload --host 0.0.0.0 --port 8010
```

- Swagger: `http://localhost:8010/docs`
- Health: `http://localhost:8010/health`

## Variables d'environnement base de donnees

- `DB_HOST` (defaut: `localhost`)
- `DB_PORT` (defaut: `5432`)
- `DB_NAME` (defaut: `pre_prod_test1`)
- `DB_USER` (defaut: `postgres`)
- `DB_PASSWORD` (defaut: `2023`)

## Endpoints principaux

- `POST /un/trace`
  - Lance `reseau.lancer_trace`, `reseau.lancer_trace_avancee` ou `reseau.lancer_trace_impact_client` selon le payload.
- `POST /un/topology/validate`
  - Lance `reseau.valider_topologie_reseau`.
- `POST /un/subnetwork/rebuild`
  - Lance `reseau.reconstruire_sous_reseau`.
- `POST /un/subnetwork/recalc-incremental`
  - Lance `reseau.f_recalcul_subnetwork_incremental`.
- `POST /un/trace/barrier`
  - Insere une barriere dans `reseau.trace_barriere`.
- `POST /un/trace/configuration`
  - Cree/met a jour une configuration dans `reseau.trace_configuration`.
- `POST /un/tests/run`
  - Execute `reseau.run_acceptance_tests`.

## Exemple minimal trace

```json
{
  "noeud_depart_id": "00000000-0000-0000-0000-000000000000",
  "type_trace": "Aval",
  "niveau_reseau": "Distribution_MT",
  "utilisateur": "api-un"
}
```

