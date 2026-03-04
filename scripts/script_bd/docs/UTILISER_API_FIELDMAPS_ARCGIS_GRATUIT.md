# Utiliser l’API dans Field Maps (ArcGIS Online gratuit)

Ce guide décrit **comment utiliser l’API GIS du projet** avec **Field Maps** sur **ArcGIS Online (essai gratuit)** : valeurs par défaut des formulaires et envoi des données collectées vers l’API.

---

## 1. Ce qui est possible avec ArcGIS Online gratuit

| Action | Comment |
|--------|--------|
| **Valeurs par défaut du formulaire** | Exporter les défauts de l’API → les saisir dans le Form Builder de la couche (voir ci‑dessous). |
| **Envoyer les données collectées vers l’API** | **Option A** : script de synchro `sync_from_arcgis.py` (planifié ou manuel). **Option B** : webhook ArcGIS → votre API (nécessite une URL en **HTTPS** et, si besoin, un relais). |

Field Maps ne peut pas appeler directement une URL au moment de l’ouverture du formulaire. Les valeurs par défaut doivent donc être **configurées dans ArcGIS** à partir de l’export fourni par l’API.

---

## 2. Utiliser l’API pour les valeurs par défaut du formulaire

1. **Exporter les valeurs par défaut** (depuis votre machine où l’API tourne) :
   ```bash
   cd scripts/script_bd
   python -m fieldmaps.export_defaults_for_arcgis --api http://localhost:8000 -o fieldmaps_defaults_export.json
   ```
   Si l’API est sur un autre serveur, remplacez `http://localhost:8000` par l’URL de l’API.

2. **Ouvrir** `fieldmaps_defaults_export.json` et repérer la **couche** qui correspond à votre formulaire Field Maps (section `layers` : champs `slug` / `table` et objet `defaults`).

3. **Dans ArcGIS Online** :
   - Ouvrez la **carte** ou la **couche** (Feature Layer) utilisée dans Field Maps.
   - Ouvrez le **formulaire** (Form Builder / Form).
   - Pour **chaque** champ listé dans `defaults` de cette couche, définissez la **valeur par défaut** indiquée dans le fichier.

Détail pas à pas : voir **[GUIDE_FIELDMAPS_ARCGIS_ONLINE.md](GUIDE_FIELDMAPS_ARCGIS_ONLINE.md)**.

---

## 3. Utiliser l’API pour recevoir les données collectées (Field Maps → API)

Deux possibilités : **synchro par script** (recommandé pour démarrer) ou **webhook** (si vous avez une URL HTTPS).

### 3.1 Option A : Script de synchro (recommandé)

Les données restent dans ArcGIS ; un script les lit et les envoie à l’API (avec application des valeurs par défaut sur les champs vides).

1. **Configurer** le fichier de config (voir `fieldmaps/config.example.json`) :
   - `api_base_url` : URL de votre API (ex. `http://votre-serveur:8000`).
   - `arcgis_feature_service_url` : URL du Feature Service de la couche (ex. `https://services.arcgis.com/.../FeatureServer`).
   - `layers` : pour chaque couche, `arcgis_layer_id`, `table_slug` (slug de l’API), et éventuellement `field_mapping`.

2. **Lancer la synchro** (à la main ou en planifié, ex. cron / Task Scheduler) :
   ```bash
   cd scripts/script_bd
   python -m fieldmaps.sync_from_arcgis --config fieldmaps_config.json
   ```

Voir **fieldmaps/README.md** pour le détail de la configuration.

### 3.2 Option B : Webhook ArcGIS vers l’API

Quand une feature est créée ou mise à jour dans ArcGIS, ArcGIS Online peut envoyer une requête (webhook) vers une URL. Votre API peut recevoir ces données si elle est exposée en **HTTPS**.

**Endpoint de l’API** (à appeler en POST) :

```http
POST /gis/webhooks/arcgis
Content-Type: application/json
```

**Body attendu** (format simplifié pour envoi manuel ou relais) :

```json
{
  "table_slug": "distributionpanel-branchement",
  "features": [
    {
      "attributes": {
        "subscribername": "Dupont",
        "connectiontype": 1,
        "notes": "Collecte Field Maps"
      },
      "geometry": { "x": -1.5, "y": 12.4 }
    }
  ],
  "apply_defaults": true
}
```

- **table_slug** : slug de la table côté API (ex. `distributionpanel-branchement`).
- **features** : tableau de features au format Esri (`attributes` + `geometry`). Pour un point : `{ "x": longitude, "y": latitude }`. Pour une ligne : `"paths": [[[x,y], ...]]`. Pour un polygone : `"rings": [[[x,y], ...]]`.
- **apply_defaults** : si `true`, les champs vides sont complétés avec les valeurs par défaut de l’API (form-defaults).

**Dans ArcGIS Online** (si votre organisation le permet) :

1. Activer le **suivi des changements** sur la couche (Feature Layer) : paramètres de la couche → « Keep track of changes to the data ».
2. Créer un **webhook** sur cette couche (paramètres de l’élément ou Organisation → Webhooks) : événement **FeaturesCreated** (et éventuellement **FeaturesUpdated**), URL = votre API en HTTPS (ex. `https://votre-domaine.com/gis/webhooks/arcgis`).
3. **Important** : le payload envoyé par ArcGIS n’est pas exactement ce format simplifié ; il contient notamment une URL `changesUrl`. Pour utiliser directement ce webhook avec l’API, il faut soit :
   - un **relais** (Azure Function, AWS Lambda, etc.) qui reçoit le webhook ArcGIS, récupère les changements via `changesUrl`, les transforme en le format ci‑dessus et appelle votre API ;  
   - soit continuer à utiliser le **script de synchro** (Option A), plus simple avec un compte gratuit.

En résumé : avec ArcGIS Online gratuit, **utiliser l’API pour les données** se fait en pratique surtout via le **script de synchro** ; le webhook est possible si vous avez une URL HTTPS et éventuellement un relais.

---

## 4. Récapitulatif des endpoints API utiles pour Field Maps

| Méthode | URL | Usage |
|--------|-----|--------|
| GET | `/gis/form-defaults/export` | Export de toutes les valeurs par défaut (pour configurer le formulaire dans ArcGIS). |
| GET | `/gis/{table_slug}/form-defaults` | Valeurs par défaut pour une couche (utilisé par le script de synchro). |
| POST | `/gis/{table_slug}` | Création / mise à jour d’un enregistrement (utilisé par le script de synchro et le webhook). |
| POST | `/gis/webhooks/arcgis` | Réception d’un lot de features (format Esri) pour enregistrement en base avec application des défauts. |

---

## 5. En pratique : scénario complet avec ArcGIS Online gratuit

1. **Créer / publier** votre couche (Feature Layer) et votre carte dans ArcGIS Online.
2. **Exporter** les défauts : `python -m fieldmaps.export_defaults_for_arcgis --api http://localhost:8000 -o fieldmaps_defaults_export.json`.
3. **Configurer le formulaire** Field Maps : dans le Form Builder, saisir les valeurs par défaut à partir de `fieldmaps_defaults_export.json` (voir [GUIDE_FIELDMAPS_ARCGIS_ONLINE.md](GUIDE_FIELDMAPS_ARCGIS_ONLINE.md)).
4. **Collecter** avec Field Maps sur le terrain ; les données sont enregistrées dans ArcGIS.
5. **Envoyer les données vers l’API** : lancer régulièrement (ou après la collecte) :
   ```bash
   python -m fieldmaps.sync_from_arcgis --config fieldmaps_config.json
   ```

Ainsi, vous **utilisez bien l’API** avec Field Maps sur ArcGIS Online gratuit : pour les **valeurs par défaut** (export → formulaire) et pour **réceptionner les données** (script de synchro ou, si vous le mettez en place, webhook).
