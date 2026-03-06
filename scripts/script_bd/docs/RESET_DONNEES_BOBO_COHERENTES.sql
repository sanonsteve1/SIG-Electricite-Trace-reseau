-- Reset complet des donnees BOBO puis recreation d'un jeu coherent et realiste.
-- Objectif: supprimer toutes les donnees BOBO existantes (quelle que soit leur source),
-- puis recreer un reseau BOBO compact, lisible, et topologiquement coherent.
--
-- Execution:
--   psql -d <base> -f scripts/script_bd/docs/RESET_DONNEES_BOBO_COHERENTES.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Purge BOBO (ordre dependances)
-- ---------------------------------------------------------------------------
DELETE FROM branchement        x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM abonne             x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM point_raccordement x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM ligne_brcht        x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM ligne_bt           x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM poteau_bt          x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM tur                x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM depart_bt          x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM poste_cabine       x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM ocr                x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM parafoudre         x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM ligne_hta          x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM poteau_hta         x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM cellule            x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM transformateur_ps  x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM transfo_poteau     x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM arrivee            x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM depart             x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';
DELETE FROM poste_source       x WHERE lower(to_jsonb(x)::text) LIKE '%bobo%';

-- Colonnes geometriques pour modeliser les ouvrages internes des postes sources.
ALTER TABLE arrivee          ADD COLUMN IF NOT EXISTS geom geometry(Point, 32630);
ALTER TABLE depart           ADD COLUMN IF NOT EXISTS geom geometry(Point, 32630);
ALTER TABLE transformateur_ps ADD COLUMN IF NOT EXISTS geom geometry(Point, 32630);
ALTER TABLE cellule          ADD COLUMN IF NOT EXISTS geom geometry(Point, 32630);
ALTER TABLE parafoudre       ADD COLUMN IF NOT EXISTS geom geometry(Point, 32630);

-- ---------------------------------------------------------------------------
-- 2) Recreation d'un reseau BOBO coherent
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    ps_idx int;
    dep_idx int;
    b_idx int;
    dep_count int;

    ps_gid text;
    ps_num text;
    ps_lon double precision;
    ps_lat double precision;

    arr_gid text;
    dep_gid text;
    tr_gid text;
    para_gid text;

    phta1_gid text;
    phta2_gid text;
    cab_gid text;
    lhta1_gid text;
    lhta2_gid text;
    lhta3_gid text;
    lhta4_gid text;
    lhta5_gid text;
    lhta6_gid text;
    lhta7_gid text;
    lhta8_gid text;
    lhta9_gid text;
    depbt_gid text;
    arr_ref_gid text;
    tr_ref_gid text;
    arr_slot int;
    tr_slot int;
    lon_arr_ref double precision;
    lat_arr_ref double precision;
    lon_tr_ref double precision;
    lat_tr_ref double precision;
    cell_disj_gid text;
    cell_sect_gid text;
    cell_mes_gid text;

    pbt1_gid text;
    pbt2_gid text;
    lbt1_gid text;
    lbt2_gid text;

    lbr_gid text;
    pr_gid text;
    br_gid text;
    ab_gid text;

    angle double precision;
    lon_arr double precision;
    lat_arr double precision;
    lon_tr double precision;
    lat_tr double precision;
    lon_para double precision;
    lat_para double precision;
    lon_dep_int double precision;
    lat_dep_int double precision;
    lon_disj double precision;
    lat_disj double precision;
    lon_sect double precision;
    lat_sect double precision;
    lon_mes double precision;
    lat_mes double precision;
    lon1 double precision;
    lat1 double precision;
    lon2 double precision;
    lat2 double precision;
    lon3 double precision;
    lat3 double precision;
    lon_bt1 double precision;
    lat_bt1 double precision;
    lon_bt2 double precision;
    lat_bt2 double precision;
    lon_pr double precision;
    lat_pr double precision;
BEGIN
    FOR ps_idx IN 1..2 LOOP
        IF ps_idx = 1 THEN
            ps_gid := '{bobo-real-ps-ouest-0001}';
            ps_num := 'PS-BOBO-OUEST-01';
            ps_lon := -4.3149;
            ps_lat := 11.1713;
            dep_count := 3;
        ELSE
            ps_gid := '{bobo-real-ps-est-0001}';
            ps_num := 'PS-BOBO-EST-01';
            ps_lon := -4.2872;
            ps_lat := 11.1899;
            dep_count := 2;
        END IF;

        -- Poste source en polygone (emprise poste, pas un simple point).
        INSERT INTO poste_source (
            gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
        ) VALUES (
            ps_gid,
            ps_num,
            1,
            'JEUX_DE_BARRES=JEU_A/JEU_B;SCADA=RTU+IED+HMI;MISE_A_LA_TERRE=MAILLE_PRINCIPALE;ALIMENTATION_SECOURUE=BATTERIES_110VDC+CHARGEUR+UPS',
            'reset_bobo_coherent',
            1,
            ST_Transform(
                ST_SetSRID(
                    ST_GeomFromText(
                        format(
                            'POLYGON((%s %s,%s %s,%s %s,%s %s,%s %s))',
                            ps_lon - 0.00055, ps_lat - 0.00040,
                            ps_lon + 0.00055, ps_lat - 0.00040,
                            ps_lon + 0.00055, ps_lat + 0.00040,
                            ps_lon - 0.00055, ps_lat + 0.00040,
                            ps_lon - 0.00055, ps_lat - 0.00040
                        )
                    ),
                    4326
                ),
                32630
            )
        );

        -- Arrivees HT.
        FOR b_idx IN 1..2 LOOP
            arr_gid := format('{bobo-real-arr-%s-%s}', ps_idx, b_idx);
            lon_arr := ps_lon - 0.00030 + (b_idx * 0.00020);
            lat_arr := ps_lat + 0.00026;
            INSERT INTO arrivee (
                gid, numero, tension, id_poste_source, collecte_par, validation, geom
            ) VALUES (
                arr_gid,
                format('ARR-HT-BOBO-%s-%s', ps_idx, lpad(b_idx::text, 2, '0')),
                90000,
                ps_gid,
                'reset_bobo_coherent',
                1,
                ST_Transform(ST_SetSRID(ST_MakePoint(lon_arr, lat_arr), 4326), 32630)
            );
        END LOOP;

        -- Transformateurs de puissance.
        FOR b_idx IN 1..2 LOOP
            tr_gid := format('{bobo-real-trps-%s-%s}', ps_idx, b_idx);
            lon_tr := ps_lon - 0.00020 + (b_idx * 0.00017);
            lat_tr := ps_lat - 0.00012;
            INSERT INTO transformateur_ps (
                gid, numero_serie, marque, code_transfo, puissance, tension,
                type_borne, annee, type_refroidissement, enroulement,
                id_poste_source, collecte_par, validation, geom
            ) VALUES (
                tr_gid,
                format('SN-BOBO-%s-%s', ps_idx, b_idx),
                CASE WHEN b_idx = 1 THEN 'ABB' ELSE 'SIEMENS' END,
                format('TRPS-BOBO-%s-%s', ps_idx, b_idx),
                40000,
                90000,
                1,
                2020 + b_idx,
                1,
                1,
                ps_gid,
                'reset_bobo_coherent',
                1,
                ST_Transform(ST_SetSRID(ST_MakePoint(lon_tr, lat_tr), 4326), 32630)
            );
        END LOOP;

        -- Departs HTA + chaine HTA->cabine->BT.
        FOR dep_idx IN 1..dep_count LOOP
            dep_gid := format('{bobo-real-dep-%s-%s}', ps_idx, dep_idx);
            angle := (dep_idx - 1) * (2 * pi() / GREATEST(dep_count, 2));
            lon_dep_int := ps_lon + 0.00022 * cos(angle);
            lat_dep_int := ps_lat + 0.00016 * sin(angle);
            para_gid := format('{bobo-real-para-%s-%s}', ps_idx, dep_idx);
            arr_slot := ((dep_idx - 1) % 2) + 1;
            tr_slot := ((dep_idx - 1) % 2) + 1;
            arr_ref_gid := format('{bobo-real-arr-%s-%s}', ps_idx, arr_slot);
            tr_ref_gid := format('{bobo-real-trps-%s-%s}', ps_idx, tr_slot);
            lon_arr_ref := ps_lon - 0.00030 + (arr_slot * 0.00020);
            lat_arr_ref := ps_lat + 0.00026;
            lon_tr_ref := ps_lon - 0.00020 + (tr_slot * 0.00017);
            lat_tr_ref := ps_lat - 0.00012;
            INSERT INTO depart (
                gid, numero, id_poste_source, tension, collecte_par, validation, geom
            ) VALUES (
                dep_gid,
                format('DEP-MT-BOBO-%s-%s', ps_idx, lpad(dep_idx::text, 2, '0')),
                ps_gid,
                33000,
                'reset_bobo_coherent',
                1,
                ST_Transform(ST_SetSRID(ST_MakePoint(lon_dep_int, lat_dep_int), 4326), 32630)
            );

            -- Parafoudre relie a la baie du depart (protection interne).
            lon_para := lon_dep_int + 0.00007;
            lat_para := lat_dep_int - 0.00005;
            INSERT INTO parafoudre (
                gid, numero, id_parafoudre_type, marque, id_parafoudre_tension_isolement,
                id_poteau_hta, collecte_par, validation, geom
            ) VALUES (
                para_gid,
                format('PARA-BOBO-%s-%s', ps_idx, lpad(dep_idx::text, 2, '0')),
                3,
                'ABB',
                2,
                dep_gid,
                'reset_bobo_coherent',
                1,
                ST_Transform(ST_SetSRID(ST_MakePoint(lon_para, lat_para), 4326), 32630)
            );

            -- Cellules internes du poste: disjoncteur (DM1), sectionneur (IS), mesure (QM).
            lon_disj := lon_dep_int + 0.00003;
            lat_disj := lat_dep_int + 0.00003;
            lon_sect := lon_dep_int - 0.00003;
            lat_sect := lat_dep_int + 0.00003;
            lon_mes  := lon_dep_int;
            lat_mes  := lat_dep_int - 0.00003;
            cell_disj_gid := format('{bobo-real-cell-disj-%s-%s}', ps_idx, dep_idx);
            cell_sect_gid := format('{bobo-real-cell-sect-%s-%s}', ps_idx, dep_idx);
            cell_mes_gid  := format('{bobo-real-cell-mes-%s-%s}', ps_idx, dep_idx);
            INSERT INTO cellule (gid, tension, marque, type, id_depart, id_poste_cabine, collecte_par, validation, geom)
            VALUES
                (
                    cell_disj_gid,
                    33, 1, 6, dep_gid, NULL, 'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_disj, lat_disj), 4326), 32630)
                ),
                (
                    cell_sect_gid,
                    33, 1, 4, dep_gid, NULL, 'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_sect, lat_sect), 4326), 32630)
                ),
                (
                    cell_mes_gid,
                    33, 1, 3, dep_gid, NULL, 'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_mes, lat_mes), 4326), 32630)
                );

            -- Geometrie radiale compacte (pas araignee gigantesque).
            angle := (dep_idx - 1) * (2 * pi() / GREATEST(dep_count, 2));
            lon1 := ps_lon + 0.0022 * cos(angle);
            lat1 := ps_lat + 0.0018 * sin(angle);
            lon2 := ps_lon + 0.0043 * cos(angle);
            lat2 := ps_lat + 0.0033 * sin(angle);
            lon3 := ps_lon + 0.0062 * cos(angle);
            lat3 := ps_lat + 0.0048 * sin(angle);

            phta1_gid := format('{bobo-real-phta1-%s-%s}', ps_idx, dep_idx);
            phta2_gid := format('{bobo-real-phta2-%s-%s}', ps_idx, dep_idx);
            cab_gid   := format('{bobo-real-cab-%s-%s}', ps_idx, dep_idx);
            lhta1_gid := format('{bobo-real-lhta1-%s-%s}', ps_idx, dep_idx);
            lhta2_gid := format('{bobo-real-lhta2-%s-%s}', ps_idx, dep_idx);
            lhta3_gid := format('{bobo-real-lhta3-%s-%s}', ps_idx, dep_idx);
            lhta4_gid := format('{bobo-real-lhta4-%s-%s}', ps_idx, dep_idx);
            lhta5_gid := format('{bobo-real-lhta5-%s-%s}', ps_idx, dep_idx);
            lhta6_gid := format('{bobo-real-lhta6-%s-%s}', ps_idx, dep_idx);
            lhta7_gid := format('{bobo-real-lhta7-%s-%s}', ps_idx, dep_idx);
            lhta8_gid := format('{bobo-real-lhta8-%s-%s}', ps_idx, dep_idx);
            lhta9_gid := format('{bobo-real-lhta9-%s-%s}', ps_idx, dep_idx);

            INSERT INTO poteau_hta (
                gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
                noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
                collecte_par, validation, geom
            ) VALUES
                (
                    phta1_gid,
                    format('PHTA-BOBO-%s-%s-A', ps_idx, dep_idx),
                    1, 4, 4, TRUE, TRUE, FALSE, FALSE, FALSE,
                    'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon1, lat1), 4326), 32630)
                ),
                (
                    phta2_gid,
                    format('PHTA-BOBO-%s-%s-B', ps_idx, dep_idx),
                    1, 4, 4, TRUE, TRUE, FALSE, FALSE, FALSE,
                    'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon2, lat2), 4326), 32630)
                );

            INSERT INTO poste_cabine (
                gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
                id_ligne_hta, collecte_par, validation, geom
            ) VALUES (
                cab_gid,
                format('PC-BOBO-%s-%s', ps_idx, dep_idx),
                1, 1, 1,
                NULL,
                'reset_bobo_coherent',
                1,
                ST_Transform(ST_SetSRID(ST_MakePoint(lon3, lat3), 4326), 32630)
            );

            INSERT INTO ligne_hta (
                gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
                id_depart_hta, id_poteau_hta, collecte_par, validation, geom
            ) VALUES
                (
                    lhta1_gid,
                    format('LHTA-BOBO-%s-%s-INT-01', ps_idx, dep_idx),
                    1, 1,
                    dep_gid, cell_mes_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_dep_int, lat_dep_int, lon_mes, lat_mes)), 4326),
                        32630
                    )
                ),
                (
                    lhta2_gid,
                    format('LHTA-BOBO-%s-%s-INT-02', ps_idx, dep_idx),
                    1, 1,
                    cell_mes_gid, cell_disj_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_mes, lat_mes, lon_disj, lat_disj)), 4326),
                        32630
                    )
                ),
                (
                    lhta3_gid,
                    format('LHTA-BOBO-%s-%s-INT-03', ps_idx, dep_idx),
                    1, 1,
                    cell_disj_gid, cell_sect_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_disj, lat_disj, lon_sect, lat_sect)), 4326),
                        32630
                    )
                ),
                (
                    lhta4_gid,
                    format('LHTA-BOBO-%s-%s-INT-04', ps_idx, dep_idx),
                    1, 1,
                    cell_sect_gid, para_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_sect, lat_sect, lon_para, lat_para)), 4326),
                        32630
                    )
                ),
                (
                    lhta5_gid,
                    format('LHTA-BOBO-%s-%s-EXT-01', ps_idx, dep_idx),
                    1, 1,
                    para_gid, phta1_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_para, lat_para, lon1, lat1)), 4326),
                        32630
                    )
                ),
                (
                    lhta6_gid,
                    format('LHTA-BOBO-%s-%s-EXT-02', ps_idx, dep_idx),
                    1, 1,
                    phta1_gid, phta2_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon1, lat1, lon2, lat2)), 4326),
                        32630
                    )
                ),
                (
                    lhta7_gid,
                    format('LHTA-BOBO-%s-%s-EXT-03', ps_idx, dep_idx),
                    1, 1,
                    phta2_gid, cab_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon2, lat2, lon3, lat3)), 4326),
                        32630
                    )
                ),
                (
                    lhta8_gid,
                    format('LHTA-BOBO-%s-%s-ARR-INT', ps_idx, dep_idx),
                    1, 1,
                    arr_ref_gid, dep_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_arr_ref, lat_arr_ref, lon_dep_int, lat_dep_int)), 4326),
                        32630
                    )
                ),
                (
                    lhta9_gid,
                    format('LHTA-BOBO-%s-%s-TR-INT', ps_idx, dep_idx),
                    1, 1,
                    dep_gid, tr_ref_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_dep_int, lat_dep_int, lon_tr_ref, lat_tr_ref)), 4326),
                        32630
                    )
                );

            UPDATE poste_cabine SET id_ligne_hta = lhta7_gid WHERE gid = cab_gid;

            -- Niveau BT.
            depbt_gid := format('{bobo-real-depbt-%s-%s}', ps_idx, dep_idx);
            INSERT INTO depart_bt (
                gid, numero_depart, id_poste_sur_poteau, id_poste_cabine, collecte_par, validation
            ) VALUES (
                depbt_gid,
                format('DEP-BT-BOBO-%s-%s', ps_idx, dep_idx),
                NULL,
                cab_gid,
                'reset_bobo_coherent',
                1
            );

            lon_bt1 := lon3 + 0.0011 * cos(angle + 0.35);
            lat_bt1 := lat3 + 0.0011 * sin(angle + 0.35);
            lon_bt2 := lon3 + 0.0022 * cos(angle + 0.28);
            lat_bt2 := lat3 + 0.0022 * sin(angle + 0.28);
            pbt1_gid := format('{bobo-real-pbt1-%s-%s}', ps_idx, dep_idx);
            pbt2_gid := format('{bobo-real-pbt2-%s-%s}', ps_idx, dep_idx);
            lbt1_gid := format('{bobo-real-lbt1-%s-%s}', ps_idx, dep_idx);
            lbt2_gid := format('{bobo-real-lbt2-%s-%s}', ps_idx, dep_idx);

            INSERT INTO poteau_bt (
                gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
                noeud, extension, descente, avec_lampadaire,
                collecte_par, validation, geom
            ) VALUES
                (
                    pbt1_gid,
                    format('PBT-BOBO-%s-%s-A', ps_idx, dep_idx),
                    1, 2, 1, TRUE, TRUE, FALSE, FALSE,
                    'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_bt1, lat_bt1), 4326), 32630)
                ),
                (
                    pbt2_gid,
                    format('PBT-BOBO-%s-%s-B', ps_idx, dep_idx),
                    1, 2, 1, TRUE, TRUE, FALSE, FALSE,
                    'reset_bobo_coherent', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_bt2, lat_bt2), 4326), 32630)
                );

            INSERT INTO ligne_bt (
                gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
                id_depart_bt, id_poteau_bt, collecte_par, validation, geom
            ) VALUES
                (
                    lbt1_gid,
                    format('LBT-BOBO-%s-%s-01', ps_idx, dep_idx),
                    1, 1, 1, 1,
                    depbt_gid, pbt1_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon3, lat3, lon_bt1, lat_bt1)), 4326),
                        32630
                    )
                ),
                (
                    lbt2_gid,
                    format('LBT-BOBO-%s-%s-02', ps_idx, dep_idx),
                    1, 1, 1, 1,
                    pbt1_gid, pbt2_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_bt1, lat_bt1, lon_bt2, lat_bt2)), 4326),
                        32630
                    )
                );

            -- Branchement + point de raccordement + abonne (3 par depart BT).
            FOR b_idx IN 1..3 LOOP
                lon_pr := lon_bt2 + (0.00045 * b_idx) * cos(angle - 0.9);
                lat_pr := lat_bt2 + (0.00045 * b_idx) * sin(angle - 0.9);
                lbr_gid := format('{bobo-real-lbr-%s-%s-%s}', ps_idx, dep_idx, b_idx);
                pr_gid  := format('{bobo-real-pr-%s-%s-%s}',  ps_idx, dep_idx, b_idx);
                br_gid  := format('{bobo-real-br-%s-%s-%s}',  ps_idx, dep_idx, b_idx);
                ab_gid  := format('{bobo-real-ab-%s-%s-%s}',  ps_idx, dep_idx, b_idx);

                INSERT INTO ligne_brcht (
                    gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
                    id_depart_bt, id_poteau_bt, collecte_par, validation, geom
                ) VALUES (
                    lbr_gid,
                    format('LBR-BOBO-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    1, 1, 1,
                    depbt_gid, pbt2_gid,
                    'reset_bobo_coherent', 1,
                    ST_Transform(
                        ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s,%s %s)', lon_bt2, lat_bt2, lon_pr, lat_pr)), 4326),
                        32630
                    )
                );

                INSERT INTO point_raccordement (
                    gid, numero, id_point_raccord_organe, id_point_raccord_exploitation,
                    numero_abonne, id_ligne_brcht, collecte_par, validation, geom
                ) VALUES (
                    pr_gid,
                    format('PR-BOBO-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    1, 1,
                    format('ABN-BOBO-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    lbr_gid,
                    'reset_bobo_coherent',
                    1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_pr, lat_pr), 4326), 32630)
                );

                INSERT INTO branchement (
                    gid, numero, id_branchement_type, code_client, nom, prenoms, telephone,
                    id_point_raccordement, collecte_par, validation
                ) VALUES (
                    br_gid,
                    b_idx,
                    1,
                    format('CL-BOBO-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    format('Client-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    'Bobo',
                    '70000000',
                    pr_gid,
                    'reset_bobo_coherent',
                    1
                );

                INSERT INTO abonne (
                    gid, num_abonne, nom, prenoms, telephone, id_compteur, collecte_par, validation
                ) VALUES (
                    ab_gid,
                    format('ABN-BOBO-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    format('Client-%s-%s-%s', ps_idx, dep_idx, b_idx),
                    'Bobo',
                    '70000000',
                    NULL,
                    'reset_bobo_coherent',
                    1
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Validation: chaque poste source BOBO doit contenir toutes les categories
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r record;
    n_arr int;
    n_arr_in int;
    n_dep int;
    n_dep_in int;
    n_trps int;
    n_trps_in int;
    n_para int;
    n_para_in int;
    n_disj int;
    n_disj_in int;
    n_sect int;
    n_sect_in int;
    n_mes int;
    n_mes_in int;
    n_liaison_int int;
    n_liaison_arr int;
    n_liaison_tr int;
BEGIN
    FOR r IN
        SELECT gid, numero_poste, geom, coalesce(equipement, '') AS equipement
        FROM poste_source
        WHERE gid LIKE '{bobo-real-ps-%'
    LOOP
        SELECT COUNT(*) INTO n_arr FROM arrivee WHERE id_poste_source = r.gid;
        SELECT COUNT(*)
        INTO n_arr_in
        FROM arrivee a
        WHERE a.id_poste_source = r.gid
          AND a.geom IS NOT NULL
          AND ST_Within(a.geom, r.geom);
        SELECT COUNT(*) INTO n_dep FROM depart WHERE id_poste_source = r.gid;
        SELECT COUNT(*)
        INTO n_dep_in
        FROM depart d
        WHERE d.id_poste_source = r.gid
          AND d.geom IS NOT NULL
          AND ST_Within(d.geom, r.geom);
        SELECT COUNT(*) INTO n_trps FROM transformateur_ps WHERE id_poste_source = r.gid;
        SELECT COUNT(*)
        INTO n_trps_in
        FROM transformateur_ps t
        WHERE t.id_poste_source = r.gid
          AND t.geom IS NOT NULL
          AND ST_Within(t.geom, r.geom);
        SELECT COUNT(*)
        INTO n_para
        FROM parafoudre p
        WHERE p.numero LIKE
            CASE
                WHEN r.numero_poste = 'PS-BOBO-OUEST-01' THEN 'PARA-BOBO-1-%'
                WHEN r.numero_poste = 'PS-BOBO-EST-01' THEN 'PARA-BOBO-2-%'
                ELSE 'PARA-BOBO-%'
            END;
        SELECT COUNT(*)
        INTO n_para_in
        FROM parafoudre p
        WHERE p.numero LIKE
            CASE
                WHEN r.numero_poste = 'PS-BOBO-OUEST-01' THEN 'PARA-BOBO-1-%'
                WHEN r.numero_poste = 'PS-BOBO-EST-01' THEN 'PARA-BOBO-2-%'
                ELSE 'PARA-BOBO-%'
            END
          AND p.geom IS NOT NULL
          AND ST_Within(p.geom, r.geom);
        SELECT COUNT(*) INTO n_disj
        FROM cellule c
        JOIN depart d ON d.gid = c.id_depart
        WHERE d.id_poste_source = r.gid AND c.type IN (6, 7); -- disjoncteurs
        SELECT COUNT(*) INTO n_disj_in
        FROM cellule c
        JOIN depart d ON d.gid = c.id_depart
        WHERE d.id_poste_source = r.gid
          AND c.type IN (6, 7)
          AND c.geom IS NOT NULL
          AND ST_Within(c.geom, r.geom);
        SELECT COUNT(*) INTO n_sect
        FROM cellule c
        JOIN depart d ON d.gid = c.id_depart
        WHERE d.id_poste_source = r.gid AND c.type = 4; -- sectionneurs
        SELECT COUNT(*) INTO n_sect_in
        FROM cellule c
        JOIN depart d ON d.gid = c.id_depart
        WHERE d.id_poste_source = r.gid
          AND c.type = 4
          AND c.geom IS NOT NULL
          AND ST_Within(c.geom, r.geom);
        SELECT COUNT(*) INTO n_mes
        FROM cellule c
        JOIN depart d ON d.gid = c.id_depart
        WHERE d.id_poste_source = r.gid AND c.type = 3; -- TC/TT (mesure)
        SELECT COUNT(*) INTO n_mes_in
        FROM cellule c
        JOIN depart d ON d.gid = c.id_depart
        WHERE d.id_poste_source = r.gid
          AND c.type = 3
          AND c.geom IS NOT NULL
          AND ST_Within(c.geom, r.geom);
        SELECT COUNT(*)
        INTO n_liaison_int
        FROM ligne_hta l
        WHERE l.numero LIKE
            CASE
                WHEN r.numero_poste = 'PS-BOBO-OUEST-01' THEN 'LHTA-BOBO-1-%-INT-01'
                WHEN r.numero_poste = 'PS-BOBO-EST-01' THEN 'LHTA-BOBO-2-%-INT-01'
                ELSE 'LHTA-BOBO-%-INT-01'
            END;
        SELECT COUNT(*)
        INTO n_liaison_arr
        FROM ligne_hta l
        WHERE l.numero LIKE
            CASE
                WHEN r.numero_poste = 'PS-BOBO-OUEST-01' THEN 'LHTA-BOBO-1-%-ARR-INT'
                WHEN r.numero_poste = 'PS-BOBO-EST-01' THEN 'LHTA-BOBO-2-%-ARR-INT'
                ELSE 'LHTA-BOBO-%-ARR-INT'
            END;
        SELECT COUNT(*)
        INTO n_liaison_tr
        FROM ligne_hta l
        WHERE l.numero LIKE
            CASE
                WHEN r.numero_poste = 'PS-BOBO-OUEST-01' THEN 'LHTA-BOBO-1-%-TR-INT'
                WHEN r.numero_poste = 'PS-BOBO-EST-01' THEN 'LHTA-BOBO-2-%-TR-INT'
                ELSE 'LHTA-BOBO-%-TR-INT'
            END;

        IF n_arr = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucune arrivee HT', r.numero_poste;
        END IF;
        IF n_arr_in <> n_arr THEN
            RAISE EXCEPTION 'Validation KO (%): arrivees HT hors emprise poste (%/% internes)', r.numero_poste, n_arr_in, n_arr;
        END IF;
        IF n_dep = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucun depart MT', r.numero_poste;
        END IF;
        IF n_dep_in <> n_dep THEN
            RAISE EXCEPTION 'Validation KO (%): departs MT hors emprise poste (%/% internes)', r.numero_poste, n_dep_in, n_dep;
        END IF;
        IF n_trps = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucun transformateur de puissance', r.numero_poste;
        END IF;
        IF n_trps_in <> n_trps THEN
            RAISE EXCEPTION 'Validation KO (%): transformateurs de puissance hors emprise poste (%/% internes)', r.numero_poste, n_trps_in, n_trps;
        END IF;
        IF n_para = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucun parafoudre', r.numero_poste;
        END IF;
        IF n_para_in <> n_para THEN
            RAISE EXCEPTION 'Validation KO (%): parafoudres hors emprise poste (%/% internes)', r.numero_poste, n_para_in, n_para;
        END IF;
        IF n_disj = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucun disjoncteur HT', r.numero_poste;
        END IF;
        IF n_disj_in <> n_disj THEN
            RAISE EXCEPTION 'Validation KO (%): disjoncteurs HT hors emprise poste (%/% internes)', r.numero_poste, n_disj_in, n_disj;
        END IF;
        IF n_sect = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucun sectionneur', r.numero_poste;
        END IF;
        IF n_sect_in <> n_sect THEN
            RAISE EXCEPTION 'Validation KO (%): sectionneurs hors emprise poste (%/% internes)', r.numero_poste, n_sect_in, n_sect;
        END IF;
        IF n_mes = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): aucun transformateur de mesure (TC/TT)', r.numero_poste;
        END IF;
        IF n_mes_in <> n_mes THEN
            RAISE EXCEPTION 'Validation KO (%): TC/TT hors emprise poste (%/% internes)', r.numero_poste, n_mes_in, n_mes;
        END IF;
        IF n_liaison_int <> n_dep THEN
            RAISE EXCEPTION 'Validation KO (%): interconnexion interne incomplete (% liaisons INT-01 pour % departs)', r.numero_poste, n_liaison_int, n_dep;
        END IF;
        IF n_liaison_arr <> n_dep THEN
            RAISE EXCEPTION 'Validation KO (%): liaisons arrivee->depart incompletes (%/%).', r.numero_poste, n_liaison_arr, n_dep;
        END IF;
        IF n_liaison_tr <> n_dep THEN
            RAISE EXCEPTION 'Validation KO (%): liaisons depart->transformateur incompletes (%/%).', r.numero_poste, n_liaison_tr, n_dep;
        END IF;
        IF position('JEUX_DE_BARRES=' in r.equipement) = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): jeux de barres non renseignes', r.numero_poste;
        END IF;
        IF position('SCADA=' in r.equipement) = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): SCADA/controle-commande non renseigne', r.numero_poste;
        END IF;
        IF position('MISE_A_LA_TERRE=' in r.equipement) = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): reseau de mise a la terre non renseigne', r.numero_poste;
        END IF;
        IF position('ALIMENTATION_SECOURUE=' in r.equipement) = 0 THEN
            RAISE EXCEPTION 'Validation KO (%): batteries/alimentation secourue non renseignees', r.numero_poste;
        END IF;
    END LOOP;
END $$;

COMMIT;
