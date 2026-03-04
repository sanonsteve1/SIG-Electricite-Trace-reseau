# Guide : utiliser fieldmaps_defaults_export.json avec ArcGIS Online et Field Maps

Ce guide explique **étape par étape** comment appliquer les valeurs du fichier **fieldmaps_defaults_export.json** dans un formulaire que vous créez avec **Field Maps** et l’**essai gratuit d’ArcGIS Online**.

---

## 1. Comprendre le fichier fieldmaps_defaults_export.json

Le fichier contient une liste de **couches** (`layers`). Chaque couche a :

- **slug** : identifiant de la couche côté API (ex. `distributionpanel-branchement`).
- **table** : nom de la table (ex. `DistributionPanel_branchement`).
- **defaults** : un objet **nom du champ → valeur par défaut**.

Exemple pour une couche « branchement » :

```json
{
  "slug": "distributionpanel-branchement",
  "table": "DistributionPanel_branchement",
  "defaults": {
    "notes": "Créé via formulaire",
    "connectiontype": 1,
    "existencedecompteur": "Non",
    "transformationreport": 0
  }
}
```

Vous devez **repérer la couche qui correspond** à votre couche Field Maps (par nom ou par usage), puis utiliser les paires **champ → valeur** de `defaults` dans ArcGIS.

---

## 2. Identifier la couche à configurer

1. Ouvrez **fieldmaps_defaults_export.json** dans un éditeur de texte (ou un outil comme [jsonformatter.org](https://jsonformatter.org) pour le formater).
2. Dans la section **`layers`**, repérez l’entrée qui correspond à votre formulaire Field Maps :
   - Par **nom de table** : si votre couche ArcGIS a le même nom (ou un nom proche) que le champ **`table`**.
   - Par **type** : par exemple « branchement », « poteau-bt », « ligne-bt-aerien », etc. (présents dans **`slug`** ou **`table`**).
3. Notez les **defaults** de cette entrée : ce sont les **noms de champs** et les **valeurs** à saisir dans ArcGIS.

---

## 3. Configurer les valeurs par défaut dans ArcGIS Online

Une fois la couche et les `defaults` identifiés :

### A. Accéder au formulaire de la couche

1. Connectez-vous à **ArcGIS Online** (compte essai gratuit).
2. Allez dans **Contenu** (Content).
3. Ouvrez la **carte** (web map) qui contient la couche utilisée pour Field Maps, **ou** ouvrez directement l’**élément** (Feature Layer) de cette couche.
4. Pour la couche concernée :
   - **Option 1** : Ouvrez la **carte** → cliquez sur la couche dans le panneau « Couches » → **Formulaires** (ou **Form** / **Form Builder** selon l’interface).
   - **Option 2** : Depuis **Contenu**, ouvrez l’élément **Feature Layer** → onglet **Données** (Data) → **Champs** (Fields) ; cherchez où définir le formulaire (par ex. **Créer un formulaire** / **Form** / **Form Builder**).

L’emplacement exact peut varier selon la version d’ArcGIS Online ; en général il s’agit de **Formulaires** / **Form** pour la couche.

### B. Définir la valeur par défaut pour chaque champ

Pour **chaque** champ listé dans **`defaults`** de votre couche dans le JSON :

1. Dans le Form Builder (éditeur de formulaire), trouvez le **champ** dont le nom correspond (ex. `notes`, `connectiontype`, `existencedecompteur`, etc.).  
   Les noms dans ArcGIS peuvent être en anglais ou en style « CamelCase » ; rapprochez-les de ceux du JSON (souvent en minuscules).
2. Ouvrez les **propriétés** ou **paramètres** de ce champ.
3. Repérez l’option **« Valeur par défaut »** / **« Default value »**.
4. Saisissez **exactement** la valeur indiquée dans le JSON :
   - **Nombre** : ex. `1`, `0` → saisir le nombre.
   - **Texte** : ex. `"Créé via formulaire"`, `"Non"` → saisir le texte sans les guillemets.

Répétez pour tous les champs de `defaults`.

### C. Enregistrer et synchroniser avec Field Maps

1. **Enregistrez** le formulaire (bouton Enregistrer / Save).
2. Si vous utilisez une **carte** pour Field Maps, enregistrez aussi la carte.
3. Dans l’app **Field Maps** (sur tablette ou téléphone), **synchronisez** la carte ou rechargez les paramètres pour que les nouveaux défauts soient pris en compte.

---

## 4. Correspondance des noms de champs

Les noms dans **fieldmaps_defaults_export.json** sont ceux de votre base / API (souvent en minuscules, ex. `connectiontype`, `existencedecompteur`). Dans ArcGIS, les champs peuvent avoir des **alias** ou des noms légèrement différents. Si un champ n’apparaît pas :

- Vérifiez le **nom technique** du champ dans ArcGIS (onglet Champs / Fields de la couche) et rapprochez-le du nom dans le JSON.
- Si un champ du JSON n’existe pas dans votre couche ArcGIS, ignorez-le ; seuls les champs qui existent dans la couche peuvent avoir une valeur par défaut.

---

## 5. Exemple concret : couche « Branchement »

Pour la couche **distributionpanel-branchement** dans le JSON :

| Champ dans le JSON   | Valeur par défaut   | Action dans ArcGIS                          |
|----------------------|---------------------|---------------------------------------------|
| `notes`              | Créé via formulaire | Champ « notes » → Valeur par défaut : ce texte |
| `connectiontype`     | 1                   | Champ « connectiontype » → Valeur par défaut : 1 |
| `existencedecompteur`| Non                 | Champ « existencedecompteur » → Valeur par défaut : Non |
| `transformationreport`| 0                  | Champ « transformationreport » → Valeur par défaut : 0 |

Une fois ces valeurs renseignées dans le Form Builder, chaque **nouveau** formulaire de collecte Field Maps pour cette couche s’ouvrira avec ces champs pré-remplis.

---

## 6. Réexporter le fichier si les défauts changent

Si vous modifiez **api/form_defaults.json** (ou l’API), régénérez le fichier d’export :

```bash
cd scripts/script_bd
python -m fieldmaps.export_defaults_for_arcgis --api http://localhost:8000 -o fieldmaps_defaults_export.json
```

Puis refaites les étapes 2 et 3 ci-dessus pour mettre à jour les valeurs par défaut dans ArcGIS Online.
