# Module Field Maps – Interfaçage avec l'API GIS

Ce module permet d’interfacer **ArcGIS Field Maps** (et d’autres applications de collecte) avec l’API GIS du projet pour le **remissage automatique des formulaires** (valeurs par défaut) et la **synchronisation des données collectées**.

## Vue d’ensemble

| Composant | Rôle |
|-----------|------|
| **API** `GET /gis/{slug}/form-defaults` | Retourne les valeurs par défaut pour une couche (utilisé par l’app web et par la synchro). |
| **API** `GET /gis/form-defaults/export` | Export de toutes les valeurs par défaut (pour config ArcGIS ou scripts). |
| **export_defaults_for_arcgis.py** | Exporte les défauts dans un fichier JSON pour configurer manuellement les formulaires Field Maps. |
| **sync_from_arcgis.py** | Synchronise les données d’un Feature Service ArcGIS vers l’API GIS en appliquant les défauts aux champs vides. |

## Prérequis

- Python 3.10+
- `requests` : `pip install requests`
- API GIS démarrée (ex. `uvicorn api.main:app --reload --port 8000`)
- Pour la synchro : URL d’un ArcGIS Feature Service (couche utilisée dans Field Maps)

## 1. Remplissage automatique du formulaire de collecte

Field Maps ne peut pas appeler directement une API externe pour récupérer des valeurs par défaut à l’ouverture d’un formulaire. Deux approches sont possibles.

### Option A : Configurer les défauts dans ArcGIS (recommandé pour Field Maps)

1. Exporter les valeurs par défaut au format lisible pour ArcGIS :
   ```bash
   cd scripts/script_bd
   python -m fieldmaps.export_defaults_for_arcgis --api http://localhost:8000 --output fieldmaps_defaults.json
   ```
   Sans `--api`, le script lit `api/form_defaults.json`.

2. Dans **ArcGIS Online** (ou Portal) :
   - Ouvrir la couche (Feature Service) utilisée dans Field Maps.
   - Pour chaque champ listé dans `fieldmaps_defaults.json` (section `layers` → `defaults`), définir la **valeur par défaut** dans le formulaire (Form Builder) ou dans les propriétés du champ.
   - Ainsi, à l’ouverture d’un nouveau formulaire de collecte, Field Maps affichera ces valeurs par défaut.

### Option B : Synchro ArcGIS → API avec application des défauts

Les données sont collectées dans Field Maps (Feature Service). Un script ou une tâche planifiée envoie ces données vers l’API GIS ; l’API applique alors les valeurs par défaut (form-defaults) aux champs vides lors de l’import.

Voir la section **Synchronisation des données** ci-dessous.

## 2. Synchronisation des données (Field Maps → API)

Le script `sync_from_arcgis.py` lit les features d’un Feature Service ArcGIS et les envoie à l’API GIS (POST par enregistrement). Les champs vides sont complétés avec les valeurs renvoyées par `GET /gis/{slug}/form-defaults`.

### Configuration

1. Copier `config.example.json` vers `fieldmaps_config.json`.
2. Renseigner :
   - **api_base_url** : URL de l’API GIS (ex. `http://localhost:8000`).
   - **arcgis_feature_service_url** : URL du Feature Server (ex. `https://services.arcgis.com/.../FeatureServer`).
   - **layers** : pour chaque couche à synchroniser :
     - **arcgis_layer_id** : indice de la couche (0, 1, …).
     - **table_slug** : slug de la table côté API (ex. `distributionpanel-branchement`).
     - **field_mapping** (optionnel) : correspondance nom de champ ArcGIS → nom de champ API (ex. `OBJECTID` → `objectid`).
     - **apply_defaults_from_api** : `true` pour appliquer les form-defaults aux champs vides.

3. Variables d’environnement (optionnel) : `API_BASE_URL`, `ARCGIS_SERVICE_URL` écrasent la config.

### Exécution

```bash
cd scripts/script_bd
python -m fieldmaps.sync_from_arcgis --config fieldmaps_config.json
```

- **--dry-run** : affiche ce qui serait envoyé sans appeler l’API.

### Exemple de config (extrait)

```json
{
  "api_base_url": "http://localhost:8000",
  "arcgis_feature_service_url": "https://services.arcgis.com/VOTRE_ORG/arcgis/rest/services/VOTRE_SERVICE/FeatureServer",
  "layers": [
    {
      "arcgis_layer_id": 0,
      "table_slug": "distributionpanel-branchement",
      "field_mapping": {
        "OBJECTID": "objectid",
        "SubscriberName": "subscribername",
        "ConnectionType": "connectiontype",
        "Notes": "notes"
      },
      "apply_defaults_from_api": true
    }
  ]
}
```

## 3. API utilisée par le module

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/gis/{table_slug}/form-defaults` | Valeurs par défaut pour une couche (utilisé par l’app web et la synchro). |
| GET | `/gis/form-defaults/export` | Export de toutes les couches avec défauts (pour export script / config ArcGIS). |
| POST | `/gis/{table_slug}` | Création / mise à jour d’un ouvrage (body JSON avec champs + `geom` en WKT). |

La documentation complète de l’API est dans `README_API.md` à la racine de `script_bd`.

- **Utiliser l’API avec Field Maps (ArcGIS Online gratuit)** : voir **docs/UTILISER_API_FIELDMAPS_ARCGIS_GRATUIT.md** (défauts formulaire, synchro, webhook).

## 4. Autres applications de collecte

Toute application capable d’appeler une API REST peut :

- Récupérer les valeurs par défaut : `GET /gis/{table_slug}/form-defaults`.
- Créer ou mettre à jour des ouvrages : `POST /gis/{table_slug}` avec un body JSON (géométrie en WKT dans le champ `geom`).

CORS est configuré côté API pour les origines autorisées ; ajouter l’origine de l’application si besoin dans `api/main.py` (CORS_ORIGINS).
