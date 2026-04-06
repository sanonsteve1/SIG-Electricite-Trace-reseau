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
-- 0) Structures KAYA pour emprises polygonales et connectivite intra-poste
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kaya_poste_emprise (
  gid text PRIMARY KEY,
  poste_type text NOT NULL,
  poste_gid text NOT NULL,
  poste_numero text,
  collecte_par text,
  geom geometry(Polygon, 32630)
);

CREATE TABLE IF NOT EXISTS kaya_equipement_connexion (
  gid text PRIMARY KEY,
  poste_gid text NOT NULL,
  equip_gid text NOT NULL,
  relation_type text NOT NULL,
  collecte_par text,
  geom geometry(LineString, 32630)
);

-- ---------------------------------------------------------------------------
-- 1) Nettoyage cible (re-execution sure)
-- ---------------------------------------------------------------------------
DELETE FROM kaya_equipement_connexion WHERE gid LIKE 'k001-link-%';
DELETE FROM kaya_poste_emprise WHERE gid LIKE 'k001-poly-%';
DELETE FROM branchement WHERE gid LIKE '{k001%';
DELETE FROM abonne WHERE gid LIKE '{k001%';
DELETE FROM point_raccordement WHERE gid LIKE '{k001%';
DELETE FROM point_connecte WHERE gid LIKE 'k001-eq-%';
DELETE FROM compteur WHERE gid LIKE '{k001%';
DELETE FROM tur WHERE gid LIKE '{k001%';
DELETE FROM parafoudre WHERE gid LIKE '{k001%';
DELETE FROM ocr WHERE gid LIKE '{k001%';
DELETE FROM cellule WHERE gid LIKE '{k001%';
DELETE FROM transfo_ht_bt WHERE gid LIKE '{k001%';
DELETE FROM transformateur_ps WHERE gid LIKE '{k001%';
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
-- NOTE: la colonne geom de poste_source est de type POINT dans ce schema.
-- On stocke donc le centroide; l'emprise polygonale est reconstruite dans la vue.
INSERT INTO poste_source (
  gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
) VALUES (
  '{k0010001-0001-4001-8001-000000000001}',
  'PS-KAYA-01',
  1,
  'Poste source Kaya: 2 transformateurs de puissance, disjoncteurs HTB, sectionneurs ligne/barre, rames cellules HTA, combines de mesure (TC/TT), systeme controle-commande, relais de protection, batteries accumulateurs, bobines de compensation',
  'jeu_donnees_kaya',
  1,
  ST_Transform(ST_SetSRID(ST_MakePoint(-1.0850, 13.0910), 4326), 32630)
);
INSERT INTO kaya_poste_emprise (
  gid, poste_type, poste_gid, poste_numero, collecte_par, geom
) VALUES (
  'k001-poly-ps-01',
  'poste_source',
  '{k0010001-0001-4001-8001-000000000001}',
  'PS-KAYA-01',
  'jeu_donnees_kaya',
  ST_Transform(
    ST_SetSRID(
      ST_GeomFromText('POLYGON((-1.08535 13.09075, -1.08465 13.09075, -1.08465 13.09125, -1.08535 13.09125, -1.08535 13.09075))'),
      4326
    ),
    32630
  )
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
-- NOTE: la colonne geom de poste_cabine est de type POINT dans ce schema.
-- On stocke donc le centroide; l'emprise polygonale est reconstruite dans la vue.
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
INSERT INTO kaya_poste_emprise (
  gid, poste_type, poste_gid, poste_numero, collecte_par, geom
) VALUES (
  'k001-poly-pc-01',
  'poste_cabine',
  '{k0010005-0005-4001-8001-000000000001}',
  'PC-KAYA-01',
  'jeu_donnees_kaya',
  ST_Transform(
    ST_SetSRID(
      ST_GeomFromText('POLYGON((-1.07890 13.09395, -1.07830 13.09395, -1.07830 13.09445, -1.07890 13.09445, -1.07890 13.09395))'),
      4326
    ),
    32630
  )
);

-- ---------------------------------------------------------------------------
-- 2.1) Modelisation des equipements du poste source (HTB/HTA)
-- ---------------------------------------------------------------------------
-- Representation spatiale interne des equipements dans l'emprise du poste source
INSERT INTO point_connecte (gid, geom, t, id) VALUES
('k001-eq-ps-01', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08520, 13.09112), 4326), 32630), 'PS: Transformateur puissance #1', 10001),
('k001-eq-ps-02', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08508, 13.09112), 4326), 32630), 'PS: Transformateur puissance #2', 10002),
('k001-eq-ps-03', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08496, 13.09110), 4326), 32630), 'PS: Disjoncteur HTB', 10003),
('k001-eq-ps-04', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08486, 13.09108), 4326), 32630), 'PS: Sectionneur ligne/barre', 10004),
('k001-eq-ps-05', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08518, 13.09098), 4326), 32630), 'PS: Rame cellules HTA', 10005),
('k001-eq-ps-06', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08504, 13.09098), 4326), 32630), 'PS: Combine de mesure TC/TT', 10006),
('k001-eq-ps-07', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08490, 13.09098), 4326), 32630), 'PS: Controle-commande', 10007),
('k001-eq-ps-08', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08516, 13.09086), 4326), 32630), 'PS: Relais de protection', 10008),
('k001-eq-ps-09', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08502, 13.09086), 4326), 32630), 'PS: Batteries accumulateurs', 10009),
('k001-eq-ps-10', ST_Transform(ST_SetSRID(ST_MakePoint(-1.08488, 13.09086), 4326), 32630), 'PS: Bobine de compensation', 10010);
-- Connexions poste source -> equipements internes
INSERT INTO kaya_equipement_connexion (
  gid, poste_gid, equip_gid, relation_type, collecte_par, geom
)
SELECT
  'k001-link-ps-' || LPAD(ROW_NUMBER() OVER (ORDER BY pc.id)::text, 2, '0') AS gid,
  '{k0010001-0001-4001-8001-000000000001}' AS poste_gid,
  pc.gid AS equip_gid,
  'intra-poste-source' AS relation_type,
  'jeu_donnees_kaya' AS collecte_par,
  ST_MakeLine(ps.geom, pc.geom)::geometry(LineString, 32630) AS geom
FROM point_connecte pc
JOIN poste_source ps
  ON ps.gid = '{k0010001-0001-4001-8001-000000000001}'
WHERE pc.gid LIKE 'k001-eq-ps-%';

-- Transformateurs de puissance HTB/HTA
INSERT INTO transformateur_ps (
  gid, code_transfo, numero_serie, marque, puissance, tension, type_borne, annee,
  tension_cc, mass, type_refroidissement, enroulement, id_poste_source,
  collecte_par, validation
) VALUES
(
  '{k0010030-0030-4001-8001-000000000001}',
  'TR-PS-KAYA-01', 'SN-KAYA-PS-001', 'SONABEL-STD', 40, 90000, 1, 2020,
  10.5, 28000, 1, 1, '{k0010001-0001-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
),
(
  '{k0010031-0031-4001-8001-000000000001}',
  'TR-PS-KAYA-02', 'SN-KAYA-PS-002', 'SONABEL-STD', 40, 90000, 1, 2021,
  10.5, 28200, 1, 1, '{k0010001-0001-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
);

-- Cellules HTA (rames + sectionnement/protection depart)
INSERT INTO cellule (
  gid, id_depart, id_poste_cabine, tension, marque, "type", collecte_par, validation
) VALUES
('{k0010032-0032-4001-8001-000000000001}', '{k0010002-0002-4001-8001-000000000001}', NULL, 20000, 1, 1, 'jeu_donnees_kaya', 1),
('{k0010033-0033-4001-8001-000000000001}', '{k0010002-0002-4001-8001-000000000001}', NULL, 20000, 1, 2, 'jeu_donnees_kaya', 1),
('{k0010034-0034-4001-8001-000000000001}', '{k0010002-0002-4001-8001-000000000001}', NULL, 20000, 1, 3, 'jeu_donnees_kaya', 1);

-- Protections/mesures de reseau HTA (relais, OCR, parafoudre, combines de mesure)
INSERT INTO ocr (
  gid, numero, numero_ocr, id_ocr_type, id_ocr_marque, id_ocr_tension,
  id_poteau_hta, collecte_par, validation
) VALUES
(
  '{k0010035-0035-4001-8001-000000000001}',
  'OCR-KAYA-PS-01', 'OCR-KAYA-001', 1, 1, 1,
  '{k0010003-0003-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
);

INSERT INTO parafoudre (
  gid, numero, id_parafoudre_type, marque, id_parafoudre_tension_isolement,
  id_poteau_hta, collecte_par, validation
) VALUES
(
  '{k0010036-0036-4001-8001-000000000001}',
  'PARA-KAYA-PS-01', 1, 'STD', 1,
  '{k0010003-0003-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
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

-- ---------------------------------------------------------------------------
-- 2.2) Modelisation des equipements du poste cabine (HTA/BT)
-- ---------------------------------------------------------------------------
-- Representation spatiale interne des equipements dans l'emprise du poste cabine
INSERT INTO point_connecte (gid, geom, t, id) VALUES
('k001-eq-pc-01', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07874, 13.09433), 4326), 32630), 'PC: Transformateur HTA/BT', 10101),
('k001-eq-pc-02', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07862, 13.09433), 4326), 32630), 'PC: Cellule HTA arrivee/depart', 10102),
('k001-eq-pc-03', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07850, 13.09431), 4326), 32630), 'PC: Cellule protection transfo', 10103),
('k001-eq-pc-04', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07874, 13.09421), 4326), 32630), 'PC: TGBT', 10104),
('k001-eq-pc-05', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07862, 13.09421), 4326), 32630), 'PC: Disjoncteur general BT', 10105),
('k001-eq-pc-06', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07850, 13.09421), 4326), 32630), 'PC: Circuit de terre', 10106),
('k001-eq-pc-07', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07874, 13.09411), 4326), 32630), 'PC: Equipements de securite', 10107),
('k001-eq-pc-08', ST_Transform(ST_SetSRID(ST_MakePoint(-1.07862, 13.09411), 4326), 32630), 'PC: Eclairage de securite', 10108);
-- Connexions poste cabine -> equipements internes
INSERT INTO kaya_equipement_connexion (
  gid, poste_gid, equip_gid, relation_type, collecte_par, geom
)
SELECT
  'k001-link-pc-' || LPAD(ROW_NUMBER() OVER (ORDER BY pc.id)::text, 2, '0') AS gid,
  '{k0010005-0005-4001-8001-000000000001}' AS poste_gid,
  pc.gid AS equip_gid,
  'intra-poste-cabine' AS relation_type,
  'jeu_donnees_kaya' AS collecte_par,
  ST_MakeLine(ps.geom, pc.geom)::geometry(LineString, 32630) AS geom
FROM point_connecte pc
JOIN poste_cabine ps
  ON ps.gid = '{k0010005-0005-4001-8001-000000000001}'
WHERE pc.gid LIKE 'k001-eq-pc-%';

-- Transformateur de distribution HTA/BT (20kV -> 400V)
INSERT INTO transfo_ht_bt (
  gid, numero, marque, code_poste,
  id_transfo_ht_bt_puissance, id_transfo_ht_bt_tension_entree, id_transfo_ht_bt_tension_sortie,
  id_transfo_ht_bt_type_borne, annee_fabrication, id_transfo_ht_bt_prise,
  tension_cc, id_transfo_ht_bt_enroulement, id_poste_cabine,
  collecte_par, validation
) VALUES (
  '{k0010037-0037-4001-8001-000000000001}',
  'TR-KAYA-CAB-01', 'SONABEL-STD', 'PC-KAYA-01',
  160, 20000, 400,
  1, 2022, 1,
  4.5, 1, '{k0010005-0005-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
);

-- Cellules HTA d'arrivee, depart et protection transfo
INSERT INTO cellule (
  gid, id_depart, id_poste_cabine, tension, marque, "type", collecte_par, validation
) VALUES
('{k0010038-0038-4001-8001-000000000001}', NULL, '{k0010005-0005-4001-8001-000000000001}', 20000, 1, 1, 'jeu_donnees_kaya', 1),
('{k0010039-0039-4001-8001-000000000001}', NULL, '{k0010005-0005-4001-8001-000000000001}', 20000, 1, 2, 'jeu_donnees_kaya', 1),
('{k0010040-0040-4001-8001-000000000001}', NULL, '{k0010005-0005-4001-8001-000000000001}', 20000, 1, 3, 'jeu_donnees_kaya', 1);

-- Disjoncteur general BT (sortie transfo vers depart BT)
INSERT INTO tur (
  gid, id_tur_type, pouvoir_coupure, id_depart_bt, collecte_par, validation
) VALUES (
  '{k0010041-0041-4001-8001-000000000001}',
  1, 25, '{k0010009-0009-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
);

-- Complements metier non spatiaux du poste cabine:
-- TGBT, circuit de terre, equipements de securite, eclairage de securite
UPDATE poste_cabine
SET anomalie = 'Inventaire cabine: TGBT present, circuit de terre et equipotentialite verifies, equipements de securite (perche, gants, tabouret, signaletique), eclairage de securite autonome'
WHERE gid = '{k0010005-0005-4001-8001-000000000001}';

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

-- Compteurs clients (completes de mesure aval)
INSERT INTO compteur (
  gid, numero, id_compteur_type, id_compteur_facturation, id_branchement,
  collecte_par, validation
) VALUES
(
  '{k0010042-0042-4001-8001-000000000001}',
  'CP-KAYA-001', 1, 1, '{k0010020-0020-4001-8001-000000000001}',
  'jeu_donnees_kaya', 1
),
(
  '{k0010043-0043-4001-8001-000000000001}',
  'CP-KAYA-002', 1, 1, '{k0010021-0021-4001-8001-000000000001}',
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

-- ---------------------------------------------------------------------------
-- Vue metier: equipements internes des postes KAYA (cartographie / controle)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_kaya_equipements_postes;
CREATE VIEW v_kaya_equipements_postes AS
WITH poste_emprises AS (
    SELECT
        'poste_source'::text AS poste_type,
        ps.gid AS poste_gid,
        ps.poste_numero AS poste_numero,
        ps.collecte_par,
        CASE WHEN ps.geom IS NOT NULL THEN ST_PointOnSurface(ps.geom)::geometry(Point, 32630) ELSE NULL END AS poste_centroid,
        ps.geom AS poste_emprise_geom
    FROM kaya_poste_emprise ps
    WHERE ps.collecte_par = 'jeu_donnees_kaya'
),
equip_points AS (
    SELECT
        p.gid AS equip_gid,
        p.t AS equipement_label,
        p.id AS equipement_id,
        p.geom
    FROM point_connecte p
    WHERE p.gid LIKE 'k001-eq-%'
)
SELECT
    pe.poste_type,
    pe.poste_gid,
    pe.poste_numero,
    ep.equip_gid,
    ep.equipement_label,
    ep.equipement_id,
    pe.poste_centroid,
    pe.poste_emprise_geom,
    c.gid AS connexion_gid,
    c.relation_type,
    c.geom AS connexion_geom,
    ep.geom AS equip_geom
FROM poste_emprises pe
JOIN equip_points ep
  ON ST_Contains(pe.poste_emprise_geom, ep.geom)
LEFT JOIN kaya_equipement_connexion c
  ON c.poste_gid = pe.poste_gid
 AND c.equip_gid = ep.equip_gid
ORDER BY pe.poste_type, ep.equipement_id;

-- Exemple d'usage:
-- SELECT poste_type, poste_numero, equipement_label
-- FROM v_kaya_equipements_postes
-- ORDER BY poste_type, equipement_id;
