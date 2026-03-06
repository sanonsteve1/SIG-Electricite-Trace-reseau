-- Jeu de donnees reseau DORI (Sahel, Burkina Faso)
-- Reflete la realite et les difficultes du reseau electrique au Burkina Faso :
-- - Un seul poste source (infrastructure limitee en zone sahelienne)
-- - Longues lignes HTA (pertes, fragilite, peu de noeuds intermediaires)
-- - Peu de postes de transformation (goulot d'etranglement)
-- - Faible densite d'abonnes (zone semi-urbaine / rurale)
-- - Deux departs HTA pour illustrer la simulation de coupure et realisation par ligne de secours
--
-- Coordonnees : Dori ~ 14.0346 N, 0.035 W (capitale regionale du Sahel)
-- Execution : psql -d <base> -f scripts/script_bd/docs/JEU_DONNEES_DORI.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Nettoyage (re-execution sure) - supprimer d'abord les dependances
-- ---------------------------------------------------------------------------
DELETE FROM branchement WHERE gid LIKE '{b001%';
DELETE FROM abonne WHERE gid LIKE '{b001%';
DELETE FROM point_raccordement WHERE gid LIKE '{b001%';
DELETE FROM ligne_brcht WHERE gid LIKE '{b001%';
DELETE FROM ligne_bt WHERE gid LIKE '{b001%';
DELETE FROM poteau_bt WHERE gid LIKE '{b001%';
DELETE FROM depart_bt WHERE gid LIKE '{b001%';
DELETE FROM poste_cabine WHERE gid LIKE '{b001%';
DELETE FROM ligne_hta WHERE gid LIKE '{b001%';
DELETE FROM poteau_hta WHERE gid LIKE '{b001%';
DELETE FROM depart WHERE gid LIKE '{b001%';
DELETE FROM poste_source WHERE gid LIKE '{b001%';

-- ---------------------------------------------------------------------------
-- 2) Insertion reseau DORI
-- ---------------------------------------------------------------------------

-- Poste source unique (realite : une seule alimentation principale en zone sahelienne)
INSERT INTO poste_source (
  gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
) VALUES (
  '{b0010001-0001-4001-8001-000000000001}',
  'PS-DORI-01',
  1,
  'Poste source Dori - unique alimentation region Sahel',
  'jeu_donnees_dori',
  1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0350, 14.0346), 4326), 32630)
);

-- Deux departs HTA (feeder principal + feeder secours pour tests realisation)
INSERT INTO depart (
  gid, numero, id_poste_source, tension, collecte_par, validation
) VALUES
(
  '{b0010002-0002-4001-8001-000000000001}',
  'DEP-HTA-DORI-01',
  '{b0010001-0001-4001-8001-000000000001}',
  33000,
  'jeu_donnees_dori',
  1
),
(
  '{b0010003-0003-4001-8001-000000000001}',
  'DEP-HTA-DORI-02',
  '{b0010001-0001-4001-8001-000000000001}',
  33000,
  'jeu_donnees_dori',
  1
);

-- Poteaux HTA (peu de noeuds = longues portees = realite difficulte reseau)
INSERT INTO poteau_hta (
  gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
  noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
  collecte_par, validation, geom
) VALUES
(
  '{b0010004-0004-4001-8001-000000000001}',
  'PHTA-DORI-001', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0320, 14.0370), 4326), 32630)
),
(
  '{b0010005-0005-4001-8001-000000000001}',
  'PHTA-DORI-002', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0280, 14.0395), 4326), 32630)
),
(
  '{b0010006-0006-4001-8001-000000000001}',
  'PHTA-DORI-003', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0380, 14.0310), 4326), 32630)
);

-- Poste cabine (un seul = goulot d'etranglement HTA/BT) - insere avant les lignes HTA qui y aboutissent
INSERT INTO poste_cabine (
  gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
  id_ligne_hta, collecte_par, validation, geom
) VALUES (
  '{b0010010-0010-4001-8001-000000000001}',
  'PC-DORI-01',
  1, 1, 1,
  NULL,
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0260, 14.0410), 4326), 32630)
);

-- Lignes HTA - feeder 1 : longue ligne vers le nord-est (pertes, peu de transfo)
INSERT INTO ligne_hta (
  gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
  id_depart_hta, id_poteau_hta, collecte_par, validation, geom
) VALUES
(
  '{b0010007-0007-4001-8001-000000000001}',
  'LHTA-DORI-001', 1, 1,
  '{b0010002-0002-4001-8001-000000000001}',
  '{b0010004-0004-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0350 14.0346, -0.0320 14.0370)'), 4326),
    32630
  )
),
(
  '{b0010008-0008-4001-8001-000000000001}',
  'LHTA-DORI-002', 1, 1,
  '{b0010004-0004-4001-8001-000000000001}',
  '{b0010005-0005-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0320 14.0370, -0.0280 14.0395)'), 4326),
    32630
  )
),
(
  '{b0010009-0009-4001-8001-000000000001}',
  'LHTA-DORI-003', 1, 1,
  '{b0010005-0005-4001-8001-000000000001}',
  '{b0010010-0010-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0280 14.0395, -0.0260 14.0410)'), 4326),
    32630
  )
),
-- Feeder 2 (secours) : ligne plus courte vers le sud
(
  '{b0010011-0011-4001-8001-000000000001}',
  'LHTA-DORI-004', 1, 1,
  '{b0010003-0003-4001-8001-000000000001}',
  '{b0010006-0006-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0350 14.0346, -0.0380 14.0310)'), 4326),
    32630
  )
),
(
  '{b0010012-0012-4001-8001-000000000001}',
  'LHTA-DORI-005', 1, 1,
  '{b0010006-0006-4001-8001-000000000001}',
  '{b0010010-0010-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0380 14.0310, -0.0260 14.0410)'), 4326),
    32630
  )
);

-- Lien poste cabine -> ligne HTA d'alimentation (mise a jour)
UPDATE poste_cabine SET id_ligne_hta = '{b0010009-0009-4001-8001-000000000001}' WHERE gid = '{b0010010-0010-4001-8001-000000000001}';

-- Depart BT (un seul depuis la cabine)
INSERT INTO depart_bt (
  gid, numero_depart, id_poste_cabine, collecte_par, validation
) VALUES (
  '{b0010013-0013-4001-8001-000000000001}',
  'DEP-BT-DORI-01',
  '{b0010010-0010-4001-8001-000000000001}',
  'jeu_donnees_dori',
  1
);

-- Poteaux BT (faible densite)
INSERT INTO poteau_bt (
  gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
  noeud, extension, descente, avec_lampadaire, collecte_par, validation, geom
) VALUES
(
  '{b0010014-0014-4001-8001-000000000001}',
  'PBT-DORI-001', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0245, 14.0415), 4326), 32630)
),
(
  '{b0010015-0015-4001-8001-000000000001}',
  'PBT-DORI-002', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0230, 14.0420), 4326), 32630)
);

-- Lignes BT
INSERT INTO ligne_bt (
  gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
) VALUES
(
  '{b0010016-0016-4001-8001-000000000001}',
  'LBT-DORI-001', 1, 1, 1, 1,
  '{b0010013-0013-4001-8001-000000000001}',
  '{b0010014-0014-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0260 14.0410, -0.0245 14.0415)'), 4326),
    32630
  )
),
(
  '{b0010017-0017-4001-8001-000000000001}',
  'LBT-DORI-002', 1, 1, 1, 1,
  '{b0010014-0014-4001-8001-000000000001}',
  '{b0010015-0015-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0245 14.0415, -0.0230 14.0420)'), 4326),
    32630
  )
);

-- Lignes de branchement (peu d'abonnes = realite rurale/sahel)
INSERT INTO ligne_brcht (
  gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
) VALUES
(
  '{b0010018-0018-4001-8001-000000000001}',
  'LBR-DORI-001', 1, 1, 1,
  '{b0010014-0014-4001-8001-000000000001}',
  '{b0010014-0014-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0245 14.0415, -0.0240 14.0418)'), 4326),
    32630
  )
),
(
  '{b0010019-0019-4001-8001-000000000001}',
  'LBR-DORI-002', 1, 1, 1,
  '{b0010015-0015-4001-8001-000000000001}',
  '{b0010015-0015-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-0.0230 14.0420, -0.0225 14.0422)'), 4326),
    32630
  )
);

-- Points de raccordement
INSERT INTO point_raccordement (
  gid, numero, numero_abonne, id_point_raccord_organe, id_point_raccord_exploitation,
  id_ligne_brcht, collecte_par, validation, geom
) VALUES
(
  '{b0010020-0020-4001-8001-000000000001}',
  'PR-DORI-001', 'ABO-DORI-001', 1, 1,
  '{b0010018-0018-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0240, 14.0418), 4326), 32630)
),
(
  '{b0010021-0021-4001-8001-000000000001}',
  'PR-DORI-002', 'ABO-DORI-002', 1, 1,
  '{b0010019-0019-4001-8001-000000000001}',
  'jeu_donnees_dori', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-0.0225, 14.0422), 4326), 32630)
);

-- Abonnes (faible densite, typique zone Sahel)
INSERT INTO abonne (
  gid, num_abonne, nom, prenoms, telephone, puissance_souscrite,
  id_abonne_usage, id_abonne_type, id_abonne_nature, id_abonne_activite,
  collecte_par, validation
) VALUES
(
  '{b0010022-0022-4001-8001-000000000001}',
  'ABO-DORI-001', 'OUEDRAOGO', 'Boukary', '70010001', 3,
  1, 1, 1, 1,
  'jeu_donnees_dori', 1
),
(
  '{b0010023-0023-4001-8001-000000000001}',
  'ABO-DORI-002', 'TANKOANO', 'Fati', '70010002', 6,
  1, 1, 1, 1,
  'jeu_donnees_dori', 1
);

-- Branchements (numero = type numeric en base)
INSERT INTO branchement (
  gid, numero, id_point_raccordement, id_branchement_type, id_branchement_rapport_transfo,
  existence_compteur, code_client, nom, prenoms, telephone,
  collecte_par, validation
) VALUES
(
  '{b0010024-0024-4001-8001-000000000001}',
  1, '{b0010020-0020-4001-8001-000000000001}', 1, 1,
  TRUE, 'CLI-DORI-001', 'OUEDRAOGO', 'Boukary', '70010001',
  'jeu_donnees_dori', 1
),
(
  '{b0010025-0025-4001-8001-000000000001}',
  2, '{b0010021-0021-4001-8001-000000000001}', 1, 1,
  TRUE, 'CLI-DORI-002', 'TANKOANO', 'Fati', '70010002',
  'jeu_donnees_dori', 1
);

COMMIT;

-- ---------------------------------------------------------------------------
-- Resume : difficultes reseau refletees
-- ---------------------------------------------------------------------------
-- 1 poste source      -> dependance a une seule alimentation
-- 2 departs HTA       -> possibilite de secours (ligne LHTA-DORI-004/005)
-- 3 poteaux HTA       -> longues portees, pertes, fragilite
-- 1 poste cabine      -> goulot d'etranglement HTA/BT
-- 2 poteaux BT        -> faible maillage BT
-- 2 abonnes           -> faible densite (zone semi-urbaine / rurale Sahel)
-- Coordonnees Dori    -> 14.03-14.04 N, 0.02-0.04 W (region Sahel)
