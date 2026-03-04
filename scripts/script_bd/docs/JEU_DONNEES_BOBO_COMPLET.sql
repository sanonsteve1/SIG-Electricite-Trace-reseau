-- Jeu de donnees reseau complet (Bobo-Dioulasso)
-- Chaîne metier: poste_source -> depart HTA -> lignes HTA -> poste_cabine
--                -> depart BT -> lignes BT -> lignes branchement
--                -> points de raccordement -> branchements -> abonnes
--
-- Objectif:
-- - Fournir un dataset coherent pour tests de visualisation et tracage amont/aval.
-- - Geometries saisies en WGS84 puis transformees en SRID 32630.
--
-- Execution:
-- psql -d <base> -f scripts/script_bd/docs/JEU_DONNEES_BOBO_COMPLET.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Nettoyage ciblé (re-execution sure)
-- ---------------------------------------------------------------------------
DELETE FROM branchement
WHERE gid IN (
  '{7cf9fd31-c2a8-4af2-95f4-ec90d7468001}',
  '{7cf9fd31-c2a8-4af2-95f4-ec90d7468002}',
  '{7cf9fd31-c2a8-4af2-95f4-ec90d7468003}'
);

DELETE FROM abonne
WHERE gid IN (
  '{dc59f416-29ef-4d28-b43d-66f0d3197001}',
  '{dc59f416-29ef-4d28-b43d-66f0d3197002}',
  '{dc59f416-29ef-4d28-b43d-66f0d3197003}'
);

DELETE FROM point_raccordement
WHERE gid IN (
  '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66001}',
  '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66002}',
  '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66003}'
);

DELETE FROM ligne_brcht
WHERE gid IN (
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b001}',
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b002}',
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b003}'
);

DELETE FROM ligne_bt
WHERE gid IN (
  '{f85f0a6f-7e8f-4fe2-89ce-73202c938001}',
  '{f85f0a6f-7e8f-4fe2-89ce-73202c938002}',
  '{f85f0a6f-7e8f-4fe2-89ce-73202c938003}'
);

DELETE FROM poteau_bt
WHERE gid IN (
  '{9b8489b4-c57f-48e3-95df-15735f5b9001}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9002}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}'
);

DELETE FROM depart_bt
WHERE gid IN ('{f07fc625-fc25-48e1-95f1-e1f6f96ea001}');

DELETE FROM poste_cabine
WHERE gid IN ('{2fbf43a3-7f42-4c8f-a6f0-1f62e4f8a001}');

DELETE FROM ligne_hta
WHERE gid IN (
  '{4e23553f-ef72-4f98-86a0-42312c9f5001}',
  '{4e23553f-ef72-4f98-86a0-42312c9f5002}',
  '{4e23553f-ef72-4f98-86a0-42312c9f5003}'
);

DELETE FROM poteau_hta
WHERE gid IN (
  '{38618dc4-2d75-4c49-b65b-3b2a76a54001}',
  '{38618dc4-2d75-4c49-b65b-3b2a76a54002}'
);

DELETE FROM depart
WHERE gid IN ('{b4bd6784-0f5d-4e26-85f8-7b63108fb001}');

DELETE FROM poste_source
WHERE gid IN ('{8e8d0f9d-8cb2-4f15-99a2-6d8a33a13001}');

-- ---------------------------------------------------------------------------
-- 2) Insertion reseau Bobo-Dioulasso
-- ---------------------------------------------------------------------------

-- Poste source
INSERT INTO poste_source (
  gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
) VALUES (
  '{8e8d0f9d-8cb2-4f15-99a2-6d8a33a13001}',
  'PS-BOBO-01',
  1,
  'Poste source de test complet',
  'jeu_donnees_auto',
  1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.3050, 11.1800), 4326), 32630)
);

-- Depart HTA
INSERT INTO depart (
  gid, numero, id_poste_source, tension, collecte_par, validation
) VALUES (
  '{b4bd6784-0f5d-4e26-85f8-7b63108fb001}',
  'DEP-HTA-BOBO-01',
  '{8e8d0f9d-8cb2-4f15-99a2-6d8a33a13001}',
  33000,
  'jeu_donnees_auto',
  1
);

-- Poteaux HTA intermediaires
INSERT INTO poteau_hta (
  gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
  noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
  collecte_par, validation, geom
) VALUES
(
  '{38618dc4-2d75-4c49-b65b-3b2a76a54001}',
  'PHTA-BOBO-001', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.3038, 11.1812), 4326), 32630)
),
(
  '{38618dc4-2d75-4c49-b65b-3b2a76a54002}',
  'PHTA-BOBO-002', 1, 4, 4,
  TRUE, TRUE, FALSE, FALSE, FALSE,
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.3020, 11.1825), 4326), 32630)
);

-- Lignes HTA (sens amont -> aval)
INSERT INTO ligne_hta (
  gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
  id_depart_hta, id_poteau_hta, collecte_par, validation, geom
) VALUES
(
  '{4e23553f-ef72-4f98-86a0-42312c9f5001}',
  'LHTA-BOBO-001', 1, 1,
  '{b4bd6784-0f5d-4e26-85f8-7b63108fb001}',
  '{38618dc4-2d75-4c49-b65b-3b2a76a54001}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.3050 11.1800, -4.3038 11.1812)'), 4326),
    32630
  )
),
(
  '{4e23553f-ef72-4f98-86a0-42312c9f5002}',
  'LHTA-BOBO-002', 1, 1,
  '{38618dc4-2d75-4c49-b65b-3b2a76a54001}',
  '{38618dc4-2d75-4c49-b65b-3b2a76a54002}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.3038 11.1812, -4.3020 11.1825)'), 4326),
    32630
  )
),
(
  '{4e23553f-ef72-4f98-86a0-42312c9f5003}',
  'LHTA-BOBO-003', 1, 1,
  '{38618dc4-2d75-4c49-b65b-3b2a76a54002}',
  '{2fbf43a3-7f42-4c8f-a6f0-1f62e4f8a001}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.3020 11.1825, -4.3008 11.1832)'), 4326),
    32630
  )
);

-- Poste cabine (point de transformation HTA/BT)
INSERT INTO poste_cabine (
  gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
  id_ligne_hta, collecte_par, validation, geom
) VALUES (
  '{2fbf43a3-7f42-4c8f-a6f0-1f62e4f8a001}',
  'PC-BOBO-01',
  1, 1, 1,
  '{4e23553f-ef72-4f98-86a0-42312c9f5003}',
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.3008, 11.1832), 4326), 32630)
);

-- Depart BT
INSERT INTO depart_bt (
  gid, numero_depart, id_poste_cabine, collecte_par, validation
) VALUES (
  '{f07fc625-fc25-48e1-95f1-e1f6f96ea001}',
  'DEP-BT-BOBO-01',
  '{2fbf43a3-7f42-4c8f-a6f0-1f62e4f8a001}',
  'jeu_donnees_auto',
  1
);

-- Poteaux BT
INSERT INTO poteau_bt (
  gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
  noeud, extension, descente, avec_lampadaire, collecte_par, validation, geom
) VALUES
(
  '{9b8489b4-c57f-48e3-95df-15735f5b9001}',
  'PBT-BOBO-001', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.3000, 11.1838), 4326), 32630)
),
(
  '{9b8489b4-c57f-48e3-95df-15735f5b9002}',
  'PBT-BOBO-002', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.2990, 11.1844), 4326), 32630)
),
(
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}',
  'PBT-BOBO-003', 1, 2, 1,
  TRUE, TRUE, FALSE, FALSE,
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.2980, 11.1850), 4326), 32630)
);

-- Lignes BT (sens amont -> aval)
INSERT INTO ligne_bt (
  gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
) VALUES
(
  '{f85f0a6f-7e8f-4fe2-89ce-73202c938001}',
  'LBT-BOBO-001', 1, 1, 1, 1,
  '{f07fc625-fc25-48e1-95f1-e1f6f96ea001}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9001}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.3008 11.1832, -4.3000 11.1838)'), 4326),
    32630
  )
),
(
  '{f85f0a6f-7e8f-4fe2-89ce-73202c938002}',
  'LBT-BOBO-002', 1, 1, 1, 1,
  '{9b8489b4-c57f-48e3-95df-15735f5b9001}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9002}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.3000 11.1838, -4.2990 11.1844)'), 4326),
    32630
  )
),
(
  '{f85f0a6f-7e8f-4fe2-89ce-73202c938003}',
  'LBT-BOBO-003', 1, 1, 1, 1,
  '{9b8489b4-c57f-48e3-95df-15735f5b9002}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.2990 11.1844, -4.2980 11.1850)'), 4326),
    32630
  )
);

-- Lignes de branchement
INSERT INTO ligne_brcht (
  gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
) VALUES
(
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b001}',
  'LBR-BOBO-001', 1, 1, 1,
  '{9b8489b4-c57f-48e3-95df-15735f5b9002}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9002}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.2990 11.1844, -4.2973 11.1854)'), 4326),
    32630
  )
),
(
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b002}',
  'LBR-BOBO-002', 1, 1, 1,
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.2980 11.1850, -4.2968 11.1851)'), 4326),
    32630
  )
),
(
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b003}',
  'LBR-BOBO-003', 1, 1, 1,
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}',
  '{9b8489b4-c57f-48e3-95df-15735f5b9003}',
  'jeu_donnees_auto', 1,
  ST_Transform(
    ST_SetSRID(ST_GeomFromText('LINESTRING(-4.2980 11.1850, -4.2962 11.1848)'), 4326),
    32630
  )
);

-- Points de raccordement
INSERT INTO point_raccordement (
  gid, numero, numero_abonne, id_point_raccord_organe, id_point_raccord_exploitation,
  id_ligne_brcht, collecte_par, validation, geom
) VALUES
(
  '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66001}',
  'PR-BOBO-001', 'ABO-BOBO-001', 1, 1,
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b001}',
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.2973, 11.1854), 4326), 32630)
),
(
  '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66002}',
  'PR-BOBO-002', 'ABO-BOBO-002', 1, 1,
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b002}',
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.2968, 11.1851), 4326), 32630)
),
(
  '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66003}',
  'PR-BOBO-003', 'ABO-BOBO-003', 1, 1,
  '{9ff5d8d9-94d7-47b3-99fe-9b6e2cd5b003}',
  'jeu_donnees_auto', 1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-4.2962, 11.1848), 4326), 32630)
);

-- Abonnes
INSERT INTO abonne (
  gid, num_abonne, nom, prenoms, telephone, puissance_souscrite,
  id_abonne_usage, id_abonne_type, id_abonne_nature, id_abonne_activite,
  collecte_par, validation
) VALUES
(
  '{dc59f416-29ef-4d28-b43d-66f0d3197001}',
  'ABO-BOBO-001', 'OUEDRAOGO', 'Awa', '70000001', 3,
  1, 1, 1, 1,
  'jeu_donnees_auto', 1
),
(
  '{dc59f416-29ef-4d28-b43d-66f0d3197002}',
  'ABO-BOBO-002', 'KABORE', 'Issa', '70000002', 6,
  1, 1, 1, 1,
  'jeu_donnees_auto', 1
),
(
  '{dc59f416-29ef-4d28-b43d-66f0d3197003}',
  'ABO-BOBO-003', 'SANKARA', 'Mariam', '70000003', 9,
  1, 1, 1, 1,
  'jeu_donnees_auto', 1
);

-- Branchement client -> point de raccordement
INSERT INTO branchement (
  gid, numero, id_point_raccordement, id_branchement_type, id_branchement_rapport_transfo,
  existence_compteur, code_client, nom, prenoms, telephone,
  collecte_par, validation
) VALUES
(
  '{7cf9fd31-c2a8-4af2-95f4-ec90d7468001}',
  'BR-BOBO-001', '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66001}', 1, 1,
  TRUE, 'CLI-BOBO-001', 'OUEDRAOGO', 'Awa', '70000001',
  'jeu_donnees_auto', 1
),
(
  '{7cf9fd31-c2a8-4af2-95f4-ec90d7468002}',
  'BR-BOBO-002', '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66002}', 1, 1,
  TRUE, 'CLI-BOBO-002', 'KABORE', 'Issa', '70000002',
  'jeu_donnees_auto', 1
),
(
  '{7cf9fd31-c2a8-4af2-95f4-ec90d7468003}',
  'BR-BOBO-003', '{1d986a6c-37f5-48e5-8c4a-e1b9a2e66003}', 1, 1,
  TRUE, 'CLI-BOBO-003', 'SANKARA', 'Mariam', '70000003',
  'jeu_donnees_auto', 1
);

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification rapide (optionnelle)
-- ---------------------------------------------------------------------------
-- SELECT numero_poste, gid FROM poste_source WHERE gid = '{8e8d0f9d-8cb2-4f15-99a2-6d8a33a13001}';
-- SELECT numero, id_depart_hta, id_poteau_hta FROM ligne_hta WHERE gid LIKE '{4e23553f-%';
-- SELECT numero, id_depart_bt, id_poteau_bt FROM ligne_bt WHERE gid LIKE '{f85f0a6f-%';
-- SELECT numero, id_ligne_brcht FROM point_raccordement WHERE gid LIKE '{1d986a6c-%';
