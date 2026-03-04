# Tracé amont / aval – processus et dépannage

## Objectif

Le **tracé amont** et le **tracé aval** permettent d’afficher sur la carte tous les ouvrages (lignes BT, HTA, lignes de branchement) **connectés** à un point de départ que vous choisissez :

- **Poste source** : départ depuis le poste (côté source du réseau).
- **Poste de transformation** : départ depuis un transformateur HT/BT.
- **Abonné** : départ depuis un branchement / abonné.

- **Aval** : vers les consommateurs (poste → transfo → branchements).
- **Amont** : vers la source (branchement → transfo → poste).

Pour l’instant, l’API ne distingue pas amont/aval : elle retourne toute la **composante connexe** (tous les ouvrages reliés au point de départ).

---

## Processus technique (côté API)

### 1. Point de départ (ref_id)

Vous envoyez :

- `type` : `poste_source` | `poste_transformation` | `abonne`
- `ref_id` : **gid** de l’enregistrement sélectionné (poste source, transfo ou abonné/branchement).

Exemple :  
`GET /gis/trace?type=poste_source&ref_id=abc-123&direction=aval`

### 2. Résolution des nœuds de départ

Les tables de **lignes** ne stockent pas le gid du poste source directement. Elles stockent des liens vers des **nœuds** du graphe :

- **ligne_hta** : `id_depart_hta`, `id_poteau_hta` (référence à la table **depart** et **poteau_hta**).
- **ligne_bt** : `id_depart_bt`, `id_poteau_bt` (référence à **depart_bt** et **poteau_bt**).
- **ligne_brcht** : `id_depart_bt`, `id_poteau_bt`, `id_poteau_hta`.

Donc :

- Pour un **poste source** : l’API cherche les **depart** dont `id_poste_source = ref_id` et utilise leurs **gid** comme nœuds de départ (en plus de `ref_id`).
- Pour un **poste de transformation** ou un **abonné** : on utilise directement `ref_id` (et à terme on pourra ajouter d’autres résolutions si le schéma le permet).

Sans cette étape, un tracé à partir d’un poste source donnerait **vide**, car aucune ligne n’a `id_depart_hta = poste_source.gid` ; elles ont `id_depart_hta = depart.gid`.

### 3. Parcours du graphe (BFS)

À partir de l’ensemble des nœuds de départ :

1. On cherche dans **ligne_bt**, **ligne_hta**, **ligne_brcht** toutes les lignes dont au moins un des champs (id_depart_bt, id_poteau_bt, id_depart_hta, id_poteau_hta, etc.) est dans la frontière courante.
2. On ajoute ces lignes au résultat (slug + gid).
3. On ajoute les **autres extrémités** de ces lignes (les autres champs id_…) à la frontière.
4. On recommence jusqu’à ce qu’il n’y ait plus de nouveaux nœuds.

Résultat : liste de `{ "slug": "ligne-bt" | "ligne-hta" | "ligne-brcht", "id": "<gid>" }`.

### 4. Affichage côté frontend

Le frontend reçoit `ouvrage_ids`, met en surbrillance ces lignes sur la carte et atténue le reste.

---

## Pourquoi le tracé peut être vide (`ouvrage_ids: []`)

1. **Poste source sans départs HTA**  
   Si vous partez d’un **poste source** mais qu’il n’existe **aucun enregistrement** dans la table **depart** avec `id_poste_source = ref_id`, alors aucun nœud de départ n’est trouvé pour les lignes HTA → le BFS ne trouve aucune ligne.

2. **Données incohérentes**  
   Les champs `id_depart_hta`, `id_poteau_hta`, `id_depart_bt`, `id_poteau_bt` dans les tables de lignes doivent pointer vers de vrais gid existant en base (depart, poteau_hta, depart_bt, poteau_bt). Sinon le graphe est « cassé » et le tracé s’arrête vite.

3. **Tables de lignes vides**  
   Si **ligne_bt**, **ligne_hta** et **ligne_brcht** sont vides ou ne contiennent pas de lignes reliées à ces nœuds, le résultat sera vide.

4. **Mauvais ref_id**  
   Si le frontend envoie un mauvais identifiant (mauvaise clé, mauvais type), le point de départ ne correspond à aucun nœud du graphe.

---

## Que vérifier en base

- Pour un **poste source** donné (son `gid`) :
  - Il doit exister au moins une ligne dans **depart** avec `id_poste_source = gid` du poste.
  - Les **ligne_hta** doivent avoir `id_depart_hta` = `depart.gid` (et éventuellement `id_poteau_hta` pour l’autre bout).
- Les tables **ligne_bt**, **ligne_hta**, **ligne_brcht** doivent contenir des lignes et des références cohérentes vers **depart**, **depart_bt**, **poteau_bt**, **poteau_hta**.

Après avoir corrigé la résolution des nœuds de départ (poste source → depart), relancer un tracé à partir d’un poste source qui a bien des départs en base ; si les données sont cohérentes, vous devriez obtenir des `ouvrage_ids` non vides.
