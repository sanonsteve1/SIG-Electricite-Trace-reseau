Principe métier de génération des schémas unifilaires
Un schéma unifilaire est la représentation graphique simplifiée d'un réseau électrique où chaque conducteur multi-phasé est remplacé par un seul trait, indépendamment du nombre de phases réelles. C'est le langage universel des ingénieurs électriciens pour représenter, analyser et exploiter un réseau.

1. Le principe de simplification unifilaire
Dans la réalité, un réseau triphasé comporte 3 conducteurs actifs (phases A, B, C) + un neutre + une terre. Le schéma unifilaire les réduit à un seul trait, car en régime équilibré, ce qui se passe sur une phase se reproduit identiquement sur les deux autres avec un simple déphasage de 120°. L'information utile (topologie, équipements, puissances) est donc entièrement préservée avec un trait unique.

2. La donnée source : le modèle de réseau
Tout schéma unifilaire est généré depuis un modèle de données réseau. Dans ArcGIS Utility Network, ce modèle contient :

la topologie : qui est connecté à qui, dans quel ordre, avec quelle continuité électrique
les équipements : chaque asset (disjoncteur, transformateur, câble…) avec son Asset Group, Asset Type, et ses attributs métier (tension, puissance, section, longueur)
les subnetworks : les îlots électriques cohérents alimentés depuis un contrôleur source
l'état des appareils : ouvert/fermé, en service/hors service, normal/anormal

Le schéma n'est pas dessiné manuellement — il est déduit automatiquement de ces données.

3. Le moteur de génération : les règles de tracé
La génération applique un ensemble de règles métier pour transformer les données en représentation graphique :
a) Règles topologiques — la traversée du graphe réseau suit les connexions électriques en partant du nœud source (subnetwork controller) jusqu'aux endpoints (abonnés). Chaque arc du graphe devient un segment du trait unifilaire, chaque nœud devient un symbole IEC.
b) Règles de symbologie IEC 60617 — chaque Asset Type est associé à un symbole normalisé : un disjoncteur = rectangle barré en diagonale, un transformateur = deux cercles tangents, un sectionneur = lame entre deux points, un fusible = rectangle avec fil pointillé, etc.
c) Règles de hiérarchie de tension — le tracé est organisé verticalement ou horizontalement en niveaux de tension (HTB → HTA → BTA), séparés visuellement par les jeux de barres. Chaque changement de tension via un transformateur est un pivot structurant du schéma.
d) Règles de mise en page — les équipements sont placés selon leur position dans la chaîne de puissance (ordre électrique), pas selon leur position géographique. C'est ce qui distingue le schéma unifilaire d'une carte GIS.