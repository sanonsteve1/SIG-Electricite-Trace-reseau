# Elements a utiliser pour les tests (tracé amont/aval)

Ce document liste les elements identifies par le script `discover_test_data.py` pour tester l'API de tracé (`GET /gis/trace`). Relancer le script pour mettre a jour avec l'etat actuel de la base.

## Résumé des données parcourues (exemple de run)

| Table         | Effectif | Remarque |
|---------------|----------|----------|
| poste_source  | 46       | Points de départ possibles |
| depart        | 25       | Liés aux postes via `id_poste_source` |
| ligne_hta     | 113      | **Vérifier** : `id_depart_hta` / `id_poteau_hta` renseignés |
| ligne_bt      | 144      | **Vérifier** : `id_depart_bt` / `id_poteau_bt` renseignés |
| ligne_brcht   | 41       | Lignes de branchement |
| transfo_ht_bt | 69       | Points de départ type « poste transformation » |
| branchement   | 21       | Points de départ type « abonné » |
| poteau_hta    | 831      | Noeuds du graphe HTA |
| poteau_bt     | 675      | Noeuds du graphe BT |
| depart_bt     | 59       | Départs BT |

## Chaine poste source -> depart -> lignes

- Les **depart** ont `id_poste_source` = gid d'un **poste_source**.
- Le tracé résout d'abord : poste_source.gid -> tous les **depart.gid** tels que `depart.id_poste_source = poste_source.gid`.
- Ensuite le BFS cherche dans **ligne_hta**, **ligne_bt**, **ligne_brcht** les lignes dont `id_depart_hta`, `id_depart_bt`, `id_poteau_bt`, etc. sont dans l'ensemble des noeuds (depart, poteaux).
- **Important** : si les lignes n'ont pas `id_depart_hta` / `id_depart_bt` renseignés, le tracé restera vide. Il faut que ces champs pointent vers de vrais `depart.gid` ou `poteau_bt.gid` / `poteau_hta.gid`.

## Elements recommandés pour les tests

Exécuter depuis `script_bd/` :

```bash
python discover_test_data.py
```

Le script affiche des **ref_id** utilisables directement. Exemples (à adapter selon ta base) :

### Poste source (avec departs)

- **type** : `poste_source`
- **ref_id** : un gid de poste_source qui a au moins un enregistrement dans `depart` avec `id_poste_source = ce gid`.
- Exemple (si le script l'a affiché) :
  - `ref_id={4e641e67-0d97-409c-8cd8-c22742c1c7a0}` (Poste source avec 3 depart(s))
  - `ref_id={58728845-908a-43fd-b80d-bd41eb4763cc}` (Poste source avec 3 depart(s))

Requête :

```bash
curl "http://localhost:8000/gis/trace?type=poste_source&ref_id=4e641e67-0d97-409c-8cd8-c22742c1c7a0&direction=aval"
```

(Adapter le ref_id : avec ou sans accolades selon comment l'API accepte le gid.)

### Poste de transformation

- **type** : `poste_transformation`
- **ref_id** : un **gid** de la table `transfo_ht_bt`.
- Exemple : premier transfo en base, ex. `ref_id={d30b2c88-ed85-431e-8fe4-f9387fbd8582}`

```bash
curl "http://localhost:8000/gis/trace?type=poste_transformation&ref_id=d30b2c88-ed85-431e-8fe4-f9387fbd8582&direction=aval"
```

### Abonné / branchement

- **type** : `abonne`
- **ref_id** : un **gid** de la table `branchement`.
- Exemple : `ref_id={b0ba4603-933e-4a74-8d61-d46cc411e039}`

```bash
curl "http://localhost:8000/gis/trace?type=abonne&ref_id=b0ba4603-933e-4a74-8d61-d46cc411e039&direction=aval"
```

## Pourquoi le tracé peut rester vide

1. **Poste source** : aucun `depart` avec `id_poste_source` = ce gid -> résolution donne 0 noeud de départ.
2. **Lignes sans noeuds** : `ligne_hta` / `ligne_bt` / `ligne_brcht` ont `id_depart_hta`, `id_depart_bt`, `id_poteau_bt` vides -> le BFS ne trouve aucune ligne.
3. **Graphe non connecté** : les noeuds de départ (depart.gid, poteau.gid) n'apparaissent dans aucune ligne.

Action recommandée : renseigner en base les champs **id_depart_hta**, **id_depart_bt**, **id_poteau_bt**, **id_poteau_hta** sur les lignes pour qu'ils pointent vers de vrais gid de **depart**, **depart_bt**, **poteau_hta**, **poteau_bt**. Ensuite relancer `discover_test_data.py` et retester le tracé.
