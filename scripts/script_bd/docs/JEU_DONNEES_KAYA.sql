-- Jeu de donnees reseau KAYA (Centre-Nord, Burkina Faso)
-- Chaine metier complete:
-- poste_source -> depart HTA -> lignes HTA -> poste_cabine
-- -> depart BT -> lignes BT -> lignes branchement
-- -> points de raccordement -> branchements -> abonnes
--
-- Coordonnees de reference: Kaya ~ 13.091 N, -1.085 W
-- Geometries saisies en WGS84 puis transformees en SRID 32630.
--
-- Execution:
-- psql -d <base> -f scripts/script_bd/docs/JEU_DONNEES_KAYA.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Nettoyage cible (re-execution sure)
-- ---------------------------------------------------------------------------
DELETE FROM branchement WHERE gid LIKE '{k001%';
DELETE FROM abonne WHERE gid LIKE '{k001%';
DELETE FROM point_raccordement WHERE gid LIKE '{k001%';
DELETE FROM ligne_brcht WHERE gid LIKE '{k001%';
DELETE FROM ligne_bt WHERE gid LIKE '{k001%';
DELETE FROM poteau_bt WHERE gid LIKE '{k001%';
DELETE FROM depart_bt WHERE gid LIKE '{k001%';
DELETE FROM poste_cabine WHERE gid LIKE '{k001%';
DELETE FROM ligne_hta WHERE gid LIKE '{k001%';
DELETE FROM poteau_hta WHERE gid LIKE '{k001%';
DELETE FROM depart WHERE gid LIKE '{k001%';
DELETE FROM poste_source WHERE gid LIKE '{k001%';

-- ---------------------------------------------------------------------------
-- 2) Insertion reseau KAYA
-- ---------------------------------------------------------------------------

-- Poste source
INSERT INTO poste_source (
  gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
) VALUES (
  '{k0010001-0001-4001-8001-000000000001}',
  'PS-KAYA-01',
  1,
  'Poste source Kaya - jeu de tests',
  'jeu_donnees_kaya',
  1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0850, 13.0910), 4326), 32630)
);

-- Depart HTA
INSERT INTO depart (
  gid, numero, id_poste_source, tension, collecte_par, validation
) VALUES (
  '{k0010002-0002-4001-8001-000000000001}',
  'DEP-HTA-KAYA-01',
  '{k0010001-0001-4001-8001-000000000001}',
  33000,
  'jeu_donnees_kaya',
  1
);

-- Poteaux HTA
INSERT INTO poteau_hta (
  gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
  noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
  collecte_par, validation, geom
) VALUES
(
  '{k0010003-0003-4001-8001-000000000001}',
  'PHTA-KAYA-001', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0828, 13.0923), 4326), 32630)
),
(
  '{k0010004-0004-4001-8001-000000000001}',
  'PHTA-KAYA-002', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0804, 13.0935), 4326), 32630)
);

-- Poste cabine (point de transition HTA -> BT)
INSERT INTO poste_cabine (
  gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
  id_ligne_hta, collecte_par, validation, geom
) VALUES (
  '{k0010005-0005-4001-8001-000000000001}',
  'PC-KAYA-01',
  1, 1, 1,
  NULL,
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0786, 13.0942), 4326), 32630)
);

-- Lignes HTA (amont -> aval)
INSERT INTO ligne_hta (
  gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
  id_depart_hta, id_poteau_hta, collecte_par, validation, geom
) VALUES
(
  '{k0010006-0006-4001-8001-000000000001}',
  'LHTA-KAYA-001', 1, 1,
  '{k0010002-0002-4001-8001-000000000001}',
  '{k0010003-0003-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0850 13.0910, -1.0828 13.0923)'), 4326),
    32630
  )
),
(
  '{k0010007-0007-4001-8001-000000000001}',
  'LHTA-KAYA-002', 1, 1,
  '{k0010003-0003-4001-8001-000000000001}',
  '{k0010004-0004-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0828 13.0923, -1.0804 13.0935)'), 4326),
    32630
  )
),
(
  '{k0010008-0008-4001-8001-000000000001}',
  'LHTA-KAYA-003', 1, 1,
  '{k0010004-0004-4001-8001-000000000001}',
  '{k0010005-0005-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0804 13.0935, -1.0786 13.0942)'), 4326),
    32630
  )
);

-- Lien poste cabine -> ligne HTA d'alimentation
UPDATE poste_cabine
SET id_ligne_hta = '{k0010008-0008-4001-8001-000000000001}'
WHERE gid = '{k0010005-0005-4001-8001-000000000001}';

-- Depart BT
INSERT INTO depart_bt (
  gid, numero_depart, id_poste_cabine, collecte_par, validation
) VALUES (
  '{k0010009-0009-4001-8001-000000000001}',
  'DEP-BT-KAYA-01',
  '{k0010005-0005-4001-8001-000000000001}',
  'jeu_donnees_kaya',
  1
);

-- Poteaux BT
INSERT INTO poteau_bt (
  gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
  noeud, extension, descente, avec_lampadaire, collecte_par, validation, geom
) VALUES
(
  '{k0010010-0010-4001-8001-000000000001}',
  'PBT-KAYA-001', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0774, 13.0948), 4326), 32630)
),
(
  '{k0010011-0011-4001-8001-000000000001}',
  'PBT-KAYA-002', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0760, 13.0954), 4326), 32630)
);

-- Lignes BT (amont -> aval)
INSERT INTO ligne_bt (
  gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
) VALUES
(
  '{k0010012-0012-4001-8001-000000000001}',
  'LBT-KAYA-001', 1, 1, 1, 1,
  '{k0010009-0009-4001-8001-000000000001}',
  '{k0010010-0010-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0786 13.0942, -1.0774 13.0948)'), 4326),
    32630
  )
),
(
  '{k0010013-0013-4001-8001-000000000001}',
  'LBT-KAYA-002', 1, 1, 1, 1,
  '{k0010010-0010-4001-8001-000000000001}',
  '{k0010011-0011-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0774 13.0948, -1.0760 13.0954)'), 4326),
    32630
  )
);

-- Lignes de branchement
INSERT INTO ligne_brcht (
  gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
) VALUES
(
  '{k0010014-0014-4001-8001-000000000001}',
  'LBR-KAYA-001', 1, 1, 1,
  '{k0010010-0010-4001-8001-000000000001}',
  '{k0010010-0010-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0774 13.0948, -1.0758 13.0959)'), 4326),
    32630
  )
),
(
  '{k0010015-0015-4001-8001-000000000001}',
  'LBR-KAYA-002', 1, 1, 1,
  '{k0010011-0011-4001-8001-000000000001}',
  '{k0010011-0011-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.0760 13.0954, -1.0748 13.0960)'), 4326),
    32630
  )
);

-- Points de raccordement
INSERT INTO point_raccordement (
  gid, numero, numero_abonne, id_point_raccord_organe, id_point_raccord_exploitation,
  id_ligne_brcht, collecte_par, validation, geom
) VALUES
(
  '{k0010016-0016-4001-8001-000000000001}',
  'PR-KAYA-001', 'ABO-KAYA-001', 1, 1,
  '{k0010014-0014-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0758, 13.0959), 4326), 32630)
),
(
  '{k0010017-0017-4001-8001-000000000001}',
  'PR-KAYA-002', 'ABO-KAYA-002', 1, 1,
  '{k0010015-0015-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0748, 13.0960), 4326), 32630)
);

-- Abonnes
INSERT INTO abonne (
  gid, num_abonne, nom, prenoms, telephone, puissance_souscrite,
  id_abonne_usage, id_abonne_type, id_abonne_nature, id_abonne_activite,
  collecte_par, validation
) VALUES
(
  '{k0010018-0018-4001-8001-000000000001}',
  'ABO-KAYA-001', 'OUEDRAOGO', 'Abdoulaye', '70020001', 3,
  1, 1, 1, 1,
  'jeu_donnees_kaya', 1
),
(
  '{k0010019-0019-4001-8001-000000000001}',
  'ABO-KAYA-002', 'KONATE', 'Aminata', '70020002', 6,
  1, 1, 1, 1,
  'jeu_donnees_kaya', 1
);

-- Branchements clients
INSERT INTO branchement (
  gid, numero, id_point_raccordement, id_branchement_type, id_branchement_rapport_transfo,
  existence_compteur, code_client, nom, prenoms, telephone,
  collecte_par, validation
) VALUES
(
  '{k0010020-0020-4001-8001-000000000001}',
  1, '{k0010016-0016-4001-8001-000000000001}', 1, 1,
  TRUE, 'CLI-KAYA-001', 'OUEDRAOGO', 'Abdoulaye', '70020001',
  'jeu_donnees_kaya', 1
),
(
  '{k0010021-0021-4001-8001-000000000001}',
  2, '{k0010017-0017-4001-8001-000000000001}', 1, 1,
  TRUE, 'CLI-KAYA-002', 'KONATE', 'Aminata', '70020002',
  'jeu_donnees_kaya', 1
);

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification rapide (optionnelle)
-- ---------------------------------------------------------------------------
-- SELECT numero_poste, gid FROM poste_source WHERE gid = '{k0010001-0001-4001-8001-000000000001}';
-- SELECT numero, id_depart_hta, id_poteau_hta FROM ligne_hta WHERE gid LIKE '{k001000%';
-- SELECT numero, id_depart_bt, id_poteau_bt FROM ligne_bt WHERE gid LIKE '{k001001%';
-- SELECT numero, id_ligne_brcht FROM point_raccordement WHERE gid LIKE '{k001001%';
