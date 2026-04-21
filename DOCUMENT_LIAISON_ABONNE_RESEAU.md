# Document explicatif
## Collecte des ouvrages et processus de liaison du client (abonné) au réseau électrique

## 1) Objet du document

Ce document décrit :

- les formulaires de collecte à prévoir pour chaque type d'ouvrage du réseau ;
- les champs obligatoires pour garantir la qualité SIG et métier ;
- le processus standard pour lier correctement un client (abonné) au réseau électrique BT/HTA ;
- la gestion du cas multi-compteurs sur un même bâtiment.

## 2) Principes de base (à respecter partout)

Chaque objet collecté doit contenir 4 dimensions :

- Géométrie : position/forme exacte sur la carte (point/ligne/polygone) ;
- Topologie : connexions réseau correctes (ce qui est relié à quoi) ;
- Métier : identifiants et informations d'exploitation/facturation ;
- Traçabilité : qui a créé/modifié, quand, et niveau de validation qualité.

## 3) Formulaires de collecte par ouvrage

## 3.0 Géométrie requise par formulaire

- Poteau BT / HTA : géométrie obligatoire de type `Point`
- Poste / transformateur : géométrie obligatoire de type `Point` ou `Polygone` (selon standard)
- Noeud BT / coffret / fin de ligne : géométrie obligatoire de type `Point`
- Ligne BT aérienne/souterraine : géométrie obligatoire de type `Ligne`
- Ligne HTA aérienne/souterraine : géométrie obligatoire de type `Ligne`
- Branchement BT : géométrie obligatoire de type `Ligne`
- Compteur : géométrie obligatoire de type `Point`
- Abonné / Client : géométrie obligatoire de type `Point` (ou fiche non spatiale si exception validée)

## 3.1 Formulaire générique (commun à tous les ouvrages)

A inclure dans tous les formulaires :

- `globalid` (unique, obligatoire)
- `objectid` (technique)
- `created_user`, `created_date`
- `last_edited_user`, `last_edited_date`
- `qualityverified` (0/1)
- `validator` (si validé)
- `notes`
- `source_collecte` (mobile, bureau, import, etc.)
- `geometry_type` (`Point`, `LineString`, `Polygon`)
- `geometry_wkt` ou `geom` (géométrie stockée)
- `srid` (ex: 4326)

## 3.2 Ouvrages de structure réseau (infrastructure)

### A) Poteau BT / HTA (point)
Champs clés :

- `geometry_type = Point` (obligatoire)
- `geom` (obligatoire)
- `code_ouvrage` (identifiant visible terrain)
- `type_poteau` (béton, bois, métal...)
- `status` (en service, projet, hors service)
- `constructionstatus`
- `commune`, `quartier`, `secteur`

### B) Poste / transformateur (point ou polygone)
Champs clés :

- `geometry_type = Point` ou `Polygon` (obligatoire)
- `geom` (obligatoire)
- `code_poste`
- `type_poste` (cabine, H59, etc.)
- `puissance_kva`
- `tension_amont`, `tension_aval`
- `source_alimentation` (poste source / départ)
- `statut_exploitation`

### C) Noeud BT / coffret / fin de ligne (point)
Champs clés :

- `geometry_type = Point` (obligatoire)
- `geom` (obligatoire)
- `code_noeud` ou `code_coffret`
- `fonction` (jonction, dérivation, protection)
- `etat`
- `accessibilite`

## 3.3 Ouvrages linéaires (lignes/câbles)

### D) Ligne BT aérienne/souterraine (ligne)
Champs clés :

- `geometry_type = LineString` (obligatoire)
- `geom` (obligatoire)
- `code_ligne`
- `type_ligne` (aérien/souterrain)
- `section_conducteur`
- `phasesnormal`
- `lifecyclestatus`
- `origine_noeud`, `destination_noeud` (IDs logiques)
- `longueur_m`

### E) Ligne HTA aérienne/souterraine (ligne)
Champs clés :

- `geometry_type = LineString` (obligatoire)
- `geom` (obligatoire)
- `code_ligne_hta`
- `type_ligne`
- `section`
- `phasesnormal`
- `lifecyclestatus`
- `origine`, `destination`
- `longueur_m`

## 3.4 Ouvrages de raccordement client

### F) Branchement BT (ligne)
Champs clés :

- `geometry_type = LineString` (obligatoire)
- `geom` (obligatoire)
- `code_branchement`
- `connectiontype`
- `existencedecompteur` (Oui/Non)
- `point_reseau_source` (poteau/coffret/noeud BT)
- `point_livraison_client`
- `statut_branchement`
- `date_pose`

### G) Compteur (point / équipement)
Champs clés :

- `geometry_type = Point` (obligatoire)
- `geom` (obligatoire)
- `meternumber` / `counternumber` (obligatoire)
- `subscriptionnumber` (numéro abonnement)
- `policeno` (police)
- `metertype`
- `subscribedpower`
- `billing` (prépayé/postpayé)
- `customertype` (catégorie client)
- `accessibility`
- `building_ref` (référence bâtiment/parcelle)

### H) Abonné / Client (point / fiche)
Champs clés :

- `geometry_type = Point` (obligatoire en collecte SIG)
- `geom` (obligatoire en collecte SIG)
- `subscribernumber` / `subscriptionnumber`
- `name`, `firstname`
- `phonenumber`
- `customernature`
- `customertype`
- `use` / `activities`
- `adresse`, `lot`, `parcelle`
- `building_type` (villa, maison en bande, immeuble)
- `building_ref` (clé de regroupement bâtiment)

## 4) Processus de liaison du client (abonné) au réseau

## Etape 1 : Collecte infrastructure d'abord
Collecter et valider en premier :

- postes/transfos ;
- lignes HTA puis BT ;
- poteaux/noeuds/coffrets.

Sans cette base, la liaison client sera fragile.

## Etape 2 : Collecte du branchement client
Pour chaque nouveau client :

- créer la géométrie du branchement BT ;
- relier le branchement au point réseau BT réel (poteau/coffret/noeud) ;
- positionner le point de livraison (façade/local compteur).

## Etape 3 : Création abonné + compteur(s)
Créer :

- la fiche abonné ;
- au moins un compteur associé.

Règle recommandée : 1 enregistrement par compteur physique actif.

## Etape 4 : Rattachement sous-réseau
Affecter le client/compteur au bon sous-réseau BT (ex. `r227`, `r333`) selon :

- la desserte BT réelle ;
- le câble/départ de rattachement ;
- les règles topo en vigueur.

## Etape 5 : Contrôle topologique et métier
Valider :

- continuité électrique (trace amont/aval OK) ;
- pas d'objet isolé ;
- identifiants uniques ;
- cohérence client-compteur-branchement.

## Etape 6 : Validation qualité
Passer `qualityverified=1` uniquement après contrôle terrain/SIG.

## 5) Cas spécifiques de bâtiment

### Villa
- souvent 1 branchement, 1 compteur (ou plus selon usage) ;
- liaison directe au point BT de desserte.

### Maison en bande
- 1 compteur par unité d'occupation ;
- possible point de desserte commun, mais compteurs distincts.

### Immeuble
- plusieurs compteurs possibles sur une même emprise ;
- conserver un `building_ref` commun + compteurs distincts.

## 6) Cas "un abonné, 2 compteurs sur le même bâtiment"

Procédure recommandée :

- créer 2 enregistrements compteur (`meternumber` différents) ;
- garder le même `building_ref` ;
- conserver le même `subscriptionnumber` seulement si la politique métier le permet ;
- lier les deux au branchement/point de livraison réel (ou deux branchements si physiquement distincts).

Ne pas fusionner deux compteurs physiques dans une seule fiche compteur.

## 7) Règles de qualité des données (checklist)

Avant validation finale :

- géométrie correcte (point/ligne au bon endroit) ;
- snapping et connectivité topo corrects ;
- `globalid` et numéros métier non dupliqués ;
- cohérence entre client, compteur, branchement, ouvrage BT ;
- test de traçage : "ce client est alimenté depuis quel poste ?" doit donner une réponse claire.

## 8) Modèle minimal de formulaires (prêt à implémenter)

- Formulaire Ouvrage réseau : Identité, Géométrie, Caractéristiques techniques, Statut, Traçabilité.
- Formulaire Branchement : Source BT, Point livraison, Type branchement, Statut, Date pose.
- Formulaire Compteur : Numéro compteur, Abonnement, Type facturation, Puissance, Accessibilité, Bâtiment.
- Formulaire Abonné : Identité client, Contact, Usage, Type client, Référence bâtiment, Commentaires.
