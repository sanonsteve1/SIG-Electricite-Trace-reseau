-- Modelisation d'un poste source BOBO (composants internes)
-- Couvre les composants demandes:
-- 1) Transformateurs de puissance            -> transformateur_ps
-- 2) Disjoncteurs haute tension              -> cellule (type DM1/DM2)
-- 3) Sectionneurs                            -> cellule (type IS)
-- 4) Transformateurs de mesure (TC / TT)     -> cellule (type QM, modele mesure)
-- 5) Parafoudres                             -> parafoudre
-- 6) Jeux de barres                          -> documente dans poste_source.equipement
-- 7) Systeme SCADA / controle-commande       -> documente dans poste_source.equipement
-- 8) Reseau de mise a la terre               -> documente dans poste_source.equipement
-- 9) Lignes d'arrivee HT et departs MT       -> arrivee + depart
-- 10) Batteries/alimentation secourue        -> documente dans poste_source.equipement
--
-- NOTE:
-- Le schema actuel ne contient pas de table dediee pour:
-- - jeux de barres
-- - SCADA/controle-commande
-- - reseau de terre
-- - batteries/UPS
-- Ces elements sont traces dans poste_source.equipement (texte structure).
--
-- Execution:
--   psql -d <base> -f scripts/script_bd/docs/MODELISATION_POSTE_SOURCE_BOBO.sql

BEGIN;

-- Trouver le poste source de Bobo cible (priorite au PS araignee).
DO $$
DECLARE
    _ps_gid text;
BEGIN
    SELECT gid
    INTO _ps_gid
    FROM poste_source
    WHERE numero_poste IN ('PS-ARAIGNEE-BOBO-01', 'PS-VOL-BOBO-01')
    ORDER BY CASE numero_poste
        WHEN 'PS-ARAIGNEE-BOBO-01' THEN 1
        WHEN 'PS-VOL-BOBO-01' THEN 2
        ELSE 99
    END
    LIMIT 1;

    IF _ps_gid IS NULL THEN
        RAISE EXCEPTION 'Aucun poste source BOBO cible trouve (PS-ARAIGNEE-BOBO-01 / PS-VOL-BOBO-01).';
    END IF;
END $$;

-- Nettoyage idempotent (prefixe bobo-ps-mod-*).
DELETE FROM cellule WHERE gid IN (
    '{bobo-ps-mod-cell-001}','{bobo-ps-mod-cell-002}','{bobo-ps-mod-cell-003}',
    '{bobo-ps-mod-cell-004}','{bobo-ps-mod-cell-005}','{bobo-ps-mod-cell-006}',
    '{bobo-ps-mod-cell-007}'
);
DELETE FROM parafoudre WHERE gid IN (
    '{bobo-ps-mod-para-001}','{bobo-ps-mod-para-002}','{bobo-ps-mod-para-003}'
);
DELETE FROM transformateur_ps WHERE gid IN (
    '{bobo-ps-mod-trps-001}','{bobo-ps-mod-trps-002}'
);
DELETE FROM arrivee WHERE gid IN (
    '{bobo-ps-mod-arr-001}','{bobo-ps-mod-arr-002}'
);
DELETE FROM depart WHERE gid IN (
    '{bobo-ps-mod-dep-001}','{bobo-ps-mod-dep-002}','{bobo-ps-mod-dep-003}'
);

-- Metadonnees d'equipements "non tables" + synthese metier.
-- IMPORTANT:
-- Les polygones des 2 postes BOBO sont derives des donnees existantes
-- (poste + departs HTA + lignes HTA + postes cabine relies) pour respecter
-- la modelisation deja en base.
WITH ps_target AS (
    SELECT gid, numero_poste, geom
    FROM poste_source
    WHERE numero_poste IN ('PS-ARAIGNEE-BOBO-01', 'PS-VOL-BOBO-01')
),
asset_geoms AS (
    -- Geometrie du poste source existant
    SELECT p.gid AS ps_gid, p.geom AS g
    FROM ps_target p
    WHERE p.geom IS NOT NULL

    UNION ALL

    -- Lignes HTA issues des departs du poste
    SELECT p.gid AS ps_gid, l.geom AS g
    FROM ps_target p
    JOIN depart d ON d.id_poste_source = p.gid
    JOIN ligne_hta l ON l.id_depart_hta = d.gid
    WHERE l.geom IS NOT NULL

    UNION ALL

    -- Postes cabine eventuellement raccordes par id_ligne_hta
    SELECT p.gid AS ps_gid, pc.geom AS g
    FROM ps_target p
    JOIN depart d ON d.id_poste_source = p.gid
    JOIN ligne_hta l ON l.id_depart_hta = d.gid
    JOIN poste_cabine pc ON pc.id_ligne_hta = l.gid
    WHERE pc.geom IS NOT NULL
),
poly_by_ps AS (
    SELECT
        ps_gid,
        ST_CollectionExtract(
            ST_MakeValid(
                ST_Buffer(
                    ST_ConvexHull(ST_Collect(g)),
                    70.0
                )
            ),
            3
        ) AS poly
    FROM asset_geoms
    GROUP BY ps_gid
)
UPDATE poste_source p
SET
    equipement = (
        'MODELISATION_BOBO_POSTE_SOURCE;' ||
        'JEUX_DE_BARRES=JEU_A(90kV),JEU_B(90kV),JEU_MT(33kV);' ||
        'SCADA=RTU,IED,HMI,SUPERVISION_CENTRALE;' ||
        'CONTROLE_COMMANDE=LOGIQUE_INTERVERROUILLAGE,TELECONDUITE;' ||
        'MISE_A_LA_TERRE=MAILLE_TERRE_PRINCIPALE+LIAISONS_EQUIPEMENTS;' ||
        'ALIMENTATION_SECOURUE=BATTERIE_110VDC+CHARGEUR+UPS'
    ),
    geom = CASE
        WHEN pb.poly IS NOT NULL AND NOT ST_IsEmpty(pb.poly) THEN pb.poly
        WHEN p.geom IS NOT NULL AND ST_Dimension(p.geom) = 0 THEN ST_Buffer(p.geom, 70.0)
        ELSE p.geom
    END
FROM ps_target t
LEFT JOIN poly_by_ps pb ON pb.ps_gid = t.gid
WHERE p.gid = t.gid;

-- 1) Lignes d'arrivee HT (90 kV).
INSERT INTO arrivee (
    gid, numero, tension, id_poste_source, collecte_par, validation
)
SELECT
    x.gid, x.numero, x.tension, src.gid, 'modelisation_ps_bobo', 1
FROM (
    VALUES
        ('{bobo-ps-mod-arr-001}'::text, 'ARR-HT-BOBO-01'::text, 90000::int),
        ('{bobo-ps-mod-arr-002}'::text, 'ARR-HT-BOBO-02'::text, 90000::int)
) AS x(gid, numero, tension)
CROSS JOIN (
    SELECT gid
    FROM poste_source
    WHERE numero_poste IN ('PS-ARAIGNEE-BOBO-01', 'PS-VOL-BOBO-01')
    ORDER BY CASE numero_poste
        WHEN 'PS-ARAIGNEE-BOBO-01' THEN 1
        WHEN 'PS-VOL-BOBO-01' THEN 2
        ELSE 99
    END
    LIMIT 1
) src;

-- 2) Departs MT (33 kV).
INSERT INTO depart (
    gid, numero, id_poste_source, tension, collecte_par, validation
)
SELECT
    x.gid, x.numero, src.gid, 33000, 'modelisation_ps_bobo', 1
FROM (
    VALUES
        ('{bobo-ps-mod-dep-001}'::text, 'DEP-MT-BOBO-01'::text),
        ('{bobo-ps-mod-dep-002}'::text, 'DEP-MT-BOBO-02'::text),
        ('{bobo-ps-mod-dep-003}'::text, 'DEP-MT-BOBO-03'::text)
) AS x(gid, numero)
CROSS JOIN (
    SELECT gid
    FROM poste_source
    WHERE numero_poste IN ('PS-ARAIGNEE-BOBO-01', 'PS-VOL-BOBO-01')
    ORDER BY CASE numero_poste
        WHEN 'PS-ARAIGNEE-BOBO-01' THEN 1
        WHEN 'PS-VOL-BOBO-01' THEN 2
        ELSE 99
    END
    LIMIT 1
) src;

-- 3) Transformateurs de puissance.
INSERT INTO transformateur_ps (
    gid, numero_serie, marque, code_transfo, puissance, tension,
    type_borne, annee, type_refroidissement, enroulement,
    id_poste_source, collecte_par, validation
)
SELECT
    x.gid, x.numero_serie, x.marque, x.code_transfo, x.puissance, x.tension,
    x.type_borne, x.annee, x.type_refroidissement, x.enroulement,
    src.gid, 'modelisation_ps_bobo', 1
FROM (
    VALUES
        ('{bobo-ps-mod-trps-001}'::text, 'SN-TRPS-BOBO-001'::text, 'ABB'::text, 'TRPS-BOBO-001'::text, 40000::int, 90000::int, 1::int, 2021::int, 1::int, 1::int),
        ('{bobo-ps-mod-trps-002}'::text, 'SN-TRPS-BOBO-002'::text, 'SIEMENS'::text, 'TRPS-BOBO-002'::text, 40000::int, 90000::int, 1::int, 2022::int, 1::int, 1::int)
) AS x(gid, numero_serie, marque, code_transfo, puissance, tension, type_borne, annee, type_refroidissement, enroulement)
CROSS JOIN (
    SELECT gid
    FROM poste_source
    WHERE numero_poste IN ('PS-ARAIGNEE-BOBO-01', 'PS-VOL-BOBO-01')
    ORDER BY CASE numero_poste
        WHEN 'PS-ARAIGNEE-BOBO-01' THEN 1
        WHEN 'PS-VOL-BOBO-01' THEN 2
        ELSE 99
    END
    LIMIT 1
) src;

-- 4) Cellules internes du poste:
--    - Disjoncteurs HT: type DM1/DM2 (id 6/7)
--    - Sectionneurs: type IS (id 4)
--    - Transformateurs de mesure TC/TT: type QM (id 3)
--    - Jeux de barres: modelises conceptuellement dans equipement (pas de table dediee)
INSERT INTO cellule (
    gid, tension, marque, type, id_depart, id_poste_cabine, collecte_par, validation
)
VALUES
    ('{bobo-ps-mod-cell-001}', 33, 1, 6, '{bobo-ps-mod-dep-001}', NULL, 'modelisation_ps_bobo', 1), -- disjoncteur HTA depart 1
    ('{bobo-ps-mod-cell-002}', 33, 1, 7, '{bobo-ps-mod-dep-002}', NULL, 'modelisation_ps_bobo', 1), -- disjoncteur HTA depart 2
    ('{bobo-ps-mod-cell-003}', 33, 1, 6, '{bobo-ps-mod-dep-003}', NULL, 'modelisation_ps_bobo', 1), -- disjoncteur HTA depart 3
    ('{bobo-ps-mod-cell-004}', 33, 1, 4, '{bobo-ps-mod-dep-001}', NULL, 'modelisation_ps_bobo', 1), -- sectionneur
    ('{bobo-ps-mod-cell-005}', 33, 1, 4, '{bobo-ps-mod-dep-002}', NULL, 'modelisation_ps_bobo', 1), -- sectionneur
    ('{bobo-ps-mod-cell-006}', 33, 1, 3, '{bobo-ps-mod-dep-001}', NULL, 'modelisation_ps_bobo', 1), -- TC/TT mesure
    ('{bobo-ps-mod-cell-007}', 33, 1, 3, '{bobo-ps-mod-dep-002}', NULL, 'modelisation_ps_bobo', 1); -- TC/TT mesure

-- 5) Parafoudres (rattaches conceptuellement au poste; id_poteau_hta non requis ici).
INSERT INTO parafoudre (
    gid, numero, id_parafoudre_type, marque, id_parafoudre_tension_isolement,
    id_poteau_hta, collecte_par, validation
)
VALUES
    ('{bobo-ps-mod-para-001}', 'PARA-BOBO-01', 3, 'ABB', 2, NULL, 'modelisation_ps_bobo', 1),
    ('{bobo-ps-mod-para-002}', 'PARA-BOBO-02', 3, 'SIEMENS', 2, NULL, 'modelisation_ps_bobo', 1),
    ('{bobo-ps-mod-para-003}', 'PARA-BOBO-03', 3, 'SCHNEIDER', 2, NULL, 'modelisation_ps_bobo', 1);

COMMIT;
