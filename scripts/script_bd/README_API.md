# API REST Python (FastAPI) – Tables GIS

API CRUD générée à partir de **`script_bd/database_structure.json`** uniquement.  
**Chaque table** définie dans ce fichier dispose de **sa propre API** (liste, détail, création/mise à jour, suppression). Aucune autre table de la base n’est exposée.

## Installation

```bash
cd scripts/script_bd
pip install -r requirements.txt
```

## Configuration

Variables d’environnement optionnelles (sinon valeurs par défaut) :

| Variable      | Défaut           | Description        |
|---------------|------------------|--------------------|
| `DB_HOST`     | `localhost`      | Hôte PostgreSQL   |
| `DB_PORT`     | `5432`           | Port               |
| `DB_NAME`     | `pre_prod_test1` | Nom de la base     |
| `DB_USER`     | `postgres`       | Utilisateur        |
| `DB_PASSWORD` | `2023`           | Mot de passe       |

L'API n'expose **que les tables qui existent** dans la base connectée. Pour régénérer la structure : `python extract_tables.py` dans `script_bd` avec les mêmes variables d'environnement (ex. `DB_NAME`).

## Lancement

Depuis le dossier `scripts/script_bd` (le fichier `database_structure.json` doit être dans ce même dossier) :

```powershell
cd scripts/script_bd
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Sous PowerShell, utiliser `python -m uvicorn` pour éviter que la commande `uvicorn` ne soit introuvable.

L’API écoute sur **http://0.0.0.0:8000**.

- **Documentation Swagger** : http://localhost:8000/docs  
- **ReDoc** : http://localhost:8000/redoc  

## Endpoints

L’API n’expose **que les tables** listées dans `script_bd/database_structure.json` (et `database_structure.txt`). Pour chaque table, le **slug** est le nom de la table en minuscules avec des tirets (ex. `branchement` → `branchement`, `ligne_bt` → `ligne-bt`).

| Méthode | URL | Description |
|--------|-----|-------------|
| `GET`  | `/` | Liste des tables disponibles (slugs) |
| `GET`  | `/gis/{table_slug}/count` | Nombre total d'enregistrements (tableau de bord) |
| `GET`  | `/gis/{table_slug}/meta` | Métadonnées (slug, table, type de géométrie) |
| `GET`  | `/gis/{table_slug}/form-defaults` | Valeurs par défaut pour le formulaire (module IA / Field Maps) |
| `GET`  | `/gis/form-defaults/export` | Export de toutes les valeurs par défaut par couche |
| `GET`  | `/gis/{table_slug}?limit=100&offset=0` | Liste des enregistrements (pagination) |
| `GET`  | `/gis/{table_slug}/{pk_value}` | Détail d’un enregistrement par clé primaire |
| `PATCH` | `/gis/{table_slug}/{pk_value}/etat-reseau` | Met à jour uniquement `etat_reseau` (`ouvert` ou `fermé`) |
| `POST` | `/gis/{table_slug}` | Création ou mise à jour (si clé primaire fournie et existante) |
| `POST` | `/gis/webhooks/arcgis` | Réception de features Esri (Field Maps / ArcGIS) : body `{ "table_slug", "features", "apply_defaults" }` |
| `DELETE` | `/gis/{table_slug}/{pk_value}` | Suppression par clé primaire |

### Exemples

```bash
# Liste des tables
curl http://localhost:8000/

# Liste des branchements (100 premiers)
curl "http://localhost:8000/gis/distributionpanel-branchement?limit=10"

# Détail d’un enregistrement (id=1)
curl http://localhost:8000/gis/distributionpanel-branchement/1

# Mettre à jour etat_reseau (ouvert|fermé)
curl -X PATCH http://localhost:8000/gis/distributionpanel-branchement/1/etat-reseau \
  -H "Content-Type: application/json" \
  -d '{"etat_reseau":"fermé"}'

# Création
curl -X POST http://localhost:8000/gis/distributionpanel-branchement \
  -H "Content-Type: application/json" \
  -d '{"subscribername":"Dupont","name":"Jean","firstname":"Pierre"}'

# Suppression
curl -X DELETE http://localhost:8000/gis/distributionpanel-branchement/1
```

**Toutes les colonnes** des tables sont incluses :
- En **lecture** (GET) : toutes les colonnes sont renvoyées ; les colonnes géométriques (`geom`) sont renvoyées en **WKT** en **WGS84 (EPSG:4326)**. Les géométries en EPSG:32630 (UTM zone 30N) sont transformées vers 4326 pour la carte.
- En **écriture** (POST) : vous pouvez envoyer n’importe quelle colonne ; pour `geom`, envoyez une chaîne **WKT** ou **EWKT** (ex. `POINT(1 2)` ou `SRID=4326;POINT(1 2)`).

## Schéma unifilaire

| Méthode | URL | Description |
|--------|-----|-------------|
| `POST` | `/gis/unifilaire/svg` | Génère le schéma unifilaire en SVG (body : `{ "ouvrage_ids": [ {"slug", "id"}, ... ] }`). |
| `POST` | `/gis/unifilaire/pdf` | Génère le schéma unifilaire en PDF (même body). Téléchargement avec `Content-Disposition: attachment`. |

## Form-defaults et intégration Field Maps

Les endpoints **form-defaults** permettent le pré-remplissage des formulaires (app web et applications de collecte) :

- `GET /gis/{table_slug}/form-defaults` : retourne les valeurs par défaut pour une couche.
- `GET /gis/form-defaults/export` : export de toutes les couches avec leurs défauts (pour configuration ArcGIS ou scripts).

Les valeurs sont définies dans **api/form_defaults.json**. Pour l’interfaçage avec **ArcGIS Field Maps** (remplissage automatique du formulaire de collecte et synchro des données), voir le module **fieldmaps** et la documentation :

- **Module Field Maps** : `script_bd/fieldmaps/README.md`
- **Vue d’ensemble intégration** : `script_bd/docs/FIELDMAPS_INTEGRATION.md`

## Dépannage

### Erreur 409 « replica_identity_required » sur DELETE

Si une suppression renvoie **409** avec le détail `replica_identity_required`, la table est dans une **publication de réplication** qui publie les suppressions, mais elle n’a pas d’**identité de réplicat**. Exécuter en base (avec les droits appropriés) :

```sql
ALTER TABLE nom_de_la_table REPLICA IDENTITY FULL;
```

Exemple pour `lignes_sections_distinct` :

```sql
ALTER TABLE lignes_sections_distinct REPLICA IDENTITY FULL;
```

## Codification unique des equipements

Un script est fourni pour integrer la codification metier dans la base et coder les equipements deja existants.

### Principe

- Cree une sequence globale `equipement_code_seq`.
- Cree une table `equipement_codification` (`table_name`, `equipement_id`, `code_equipement`).
- Genere des codes uniques au format `EQ-{TYPE}-{ANNEE}-{SEQ}` (ex. `EQ-CPT-26-000123`).
- Ignore automatiquement les tables absentes ou sans colonne `gid`.

### Execution

Depuis `scripts/script_bd` :

```powershell
python codifier_equipements.py
```

Option annee (2 chiffres) :

```powershell
python codifier_equipements.py --year 26
```

## Import de donnees SHP (CIE)

Un script batch est disponible pour importer automatiquement des shapefiles vers PostGIS :
`scripts/script_bd/import_shp_to_postgis.py`.

### Prerequis

- `ogr2ogr` installe et disponible dans le `PATH` (GDAL / QGIS / OSGeo4W).
- Base PostgreSQL avec extension PostGIS active.
- Variables d'environnement DB si differentes des valeurs par defaut :
  `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

### Execution

Depuis `scripts/script_bd` :

```powershell
python import_shp_to_postgis.py --shp-root "F:\CIE\SHP" --overwrite
```

Options utiles :

- `--target-srid 4326` : reprojection cible (defaut 4326).
- `--mapping-out shp_import_mapping.json` : export du mapping source -> table.
- sans `--overwrite`, le script travaille en mode append.

### Remarques

- Le script n'importe que les vrais shapefiles (`.shp`) et ignore les fichiers annexes seuls (`.prj`, `.cpg`, `.shp.xml`).
- Les noms de tables sont generes automatiquement depuis le chemin du fichier (normalises et tronques a 63 caracteres).
- Apres import, executer `python extract_tables.py` pour regenerer `database_structure.json` et exposer les nouvelles tables via l'API.
