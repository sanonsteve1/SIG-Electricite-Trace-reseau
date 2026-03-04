# Intégration ArcGIS Field Maps – Remplissage automatique des formulaires de collecte

Ce document décrit comment utiliser le **module Field Maps** pour interfacer l’API GIS avec ArcGIS Field Maps (ou d’autres applications de collecte) et assurer un **remplissage automatique des formulaires** grâce aux valeurs par défaut définies par couche.

---

## 1. Contexte

- **API GIS** : expose les couches (tables) en REST, avec un endpoint de valeurs par défaut par couche (`form-defaults`) pour pré-remplir les formulaires.
- **Field Maps** : application de collecte terrain (Esri) qui s’appuie sur des **Feature Services** ArcGIS. Elle ne peut pas appeler une API externe au moment de l’ouverture d’un formulaire.
- **Objectif** : que les mêmes valeurs par défaut (définies dans `form_defaults.json` et exposées par l’API) soient utilisables pour la collecte Field Maps.

---

## 2. Schéma d’intégration

```
┌─────────────────────────────────────────────────────────────────────────┐
│  form_defaults.json (source des valeurs par défaut)                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API GIS (FastAPI)                                                       │
│  • GET /gis/{slug}/form-defaults     → défauts pour une couche          │
│  • GET /gis/form-defaults/export     → export de tous les défauts       │
│  • POST /gis/{slug}                  → création/mise à jour ouvrage     │
└──────┬────────────────────────────────────────────┬─────────────────────┘
       │                                            │
       │ (app web)                                  │ (synchro / autres apps)
       ▼                                            ▼
┌──────────────────┐                    ┌──────────────────────────────────┐
│  Application web │                    │  Module fieldmaps                 │
│  (formulaires    │                    │  • export_defaults_for_arcgis.py  │
│   pré-remplis)   │                    │  • sync_from_arcgis.py           │
└──────────────────┘                    └──────────────┬───────────────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────────────┐
                                            │  ArcGIS Field Maps            │
                                            │  (config manuelle des défauts │
                                            │   ou synchro → API)           │
                                            └──────────────────────────────┘
```

---

## 3. Remplissage automatique du formulaire de collecte

### 3.1 Option recommandée : configuration dans ArcGIS

1. **Exporter les valeurs par défaut** au format prévu pour ArcGIS :
   ```bash
   cd scripts/script_bd
   python -m fieldmaps.export_defaults_for_arcgis --api http://localhost:8000 -o fieldmaps_defaults_export.json
   ```

2. **Ouvrir le fichier** `fieldmaps_defaults_export.json` : la section `layers` contient, pour chaque couche (slug), les champs et valeurs par défaut.

3. **Dans ArcGIS Online (ou Portal)** :
   - Aller sur la couche (Feature Service) utilisée dans Field Maps.
   - Ouvrir le **formulaire** (Form Builder) ou les **propriétés des champs**.
   - Pour chaque champ listé dans `defaults` du fichier exporté, définir la **valeur par défaut** correspondante.
   - Enregistrer et publier.

Dès lors, à l’ouverture d’un nouveau formulaire de collecte dans Field Maps, ces valeurs par défaut s’affichent automatiquement.

**Guide pas à pas (ArcGIS Online + Field Maps)** : voir **[GUIDE_FIELDMAPS_ARCGIS_ONLINE.md](GUIDE_FIELDMAPS_ARCGIS_ONLINE.md)** pour l’utilisation concrète de `fieldmaps_defaults_export.json` avec l’essai gratuit ArcGIS Online et la création du formulaire Field Maps.

### 3.2 Option synchro : application des défauts à l’import

Si les données sont collectées dans Field Maps puis importées vers l’API GIS via le script de synchro, les **valeurs par défaut sont appliquées côté API** pour les champs vides lors de l’envoi (POST). Voir section 4.

---

## 4. Synchronisation Field Maps → API GIS

Le script **sync_from_arcgis.py** permet d’envoyer les données d’un Feature Service ArcGIS (utilisé par Field Maps) vers l’API GIS. Pour chaque enregistrement, les champs vides sont complétés avec les valeurs renvoyées par `GET /gis/{table_slug}/form-defaults`.

- **Configuration** : fichier JSON (voir `fieldmaps/config.example.json`) avec URL de l’API, URL du Feature Service, et pour chaque couche : `arcgis_layer_id`, `table_slug`, éventuellement `field_mapping`, et `apply_defaults_from_api: true`.
- **Exécution** :
  ```bash
  cd scripts/script_bd
  python -m fieldmaps.sync_from_arcgis --config fieldmaps_config.json
  ```
- **Détails** : voir `fieldmaps/README.md`.

---

## 5. Référence API (form-defaults)

| Endpoint | Description |
|----------|-------------|
| `GET /gis/{table_slug}/form-defaults` | Retourne `{ "defaults": { "champ": valeur, ... } }` pour la couche `table_slug`. Utilisé par l’app web et par le script de synchro. |
| `GET /gis/form-defaults/export` | Retourne `{ "layers": [ { "slug", "table", "defaults" }, ... ] }`. Utilisé pour l’export vers ArcGIS ou pour des scripts. |

Les valeurs par défaut sont définies dans **api/form_defaults.json** (entrées par slug exact ou par pattern avec `*`). Voir ce fichier et le README de l’API pour les modifier.

---

## 6. Fichiers du module Field Maps

| Fichier | Rôle |
|---------|------|
| `script_bd/fieldmaps/README.md` | Documentation du module (utilisation, config, exemples). |
| `script_bd/fieldmaps/config.example.json` | Exemple de configuration pour la synchro ArcGIS → API. |
| `script_bd/fieldmaps/export_defaults_for_arcgis.py` | Export des form-defaults pour configuration ArcGIS. |
| `script_bd/fieldmaps/sync_from_arcgis.py` | Synchro Feature Service → API avec application des défauts. |
| `script_bd/fieldmaps/geometry_utils.py` | Conversion géométrie Esri JSON → WKT. |
| `script_bd/docs/FIELDMAPS_INTEGRATION.md` | Ce document (vue d’ensemble et intégration Field Maps). |
| `script_bd/docs/GUIDE_FIELDMAPS_ARCGIS_ONLINE.md` | Guide pas à pas : utiliser fieldmaps_defaults_export.json avec ArcGIS Online et Field Maps. |
| `script_bd/docs/UTILISER_API_FIELDMAPS_ARCGIS_GRATUIT.md` | Utiliser l’API dans Field Maps (ArcGIS Online gratuit) : défauts, synchro, webhook. |

---

## 7. Résumé

- **Remplissage automatique du formulaire de collecte** : configurer dans ArcGIS les valeurs par défaut exportées via `export_defaults_for_arcgis.py` (option recommandée pour Field Maps), ou appliquer les défauts lors de la synchro vers l’API avec `sync_from_arcgis.py`.
- **Documentation** : `fieldmaps/README.md` pour l’utilisation du module ; `docs/FIELDMAPS_INTEGRATION.md` pour la vue d’ensemble de l’intégration Field Maps.
