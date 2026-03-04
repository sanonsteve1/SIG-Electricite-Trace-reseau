-- Jeu de donnees Bobo-Dioulasso - Topologie "araignee" multi-derivations
-- ----------------------------------------------------------------------
-- Ce script construit un reseau complet en utilisant les tables coeur:
-- poste_source, depart, poteau_hta, ligne_hta, poste_cabine, transfo_poteau,
-- depart_bt, poteau_bt, ligne_bt, ligne_brcht, point_raccordement,
-- branchement, abonne.
--
-- Rendu attendu:
-- - Plusieurs departs HTA
-- - Plusieurs transformations (poste_cabine + transfo_poteau)
-- - Derivations BT en etoile/araignee autour des transfos
-- - Abonnes raccordes via ligne_brcht -> point_raccordement -> branchement
--
-- Execution:
-- psql -h localhost -p 5432 -U postgres -d <base> -f scripts/script_bd/docs/JEU_DONNEES_BOBO_ARAIGNEE.sql

BEGIN;

-- ----------------------------------------------------------------------
-- 1) Nettoyage du scenario "ARAIGNEE-BOBO"
-- ----------------------------------------------------------------------
DELETE FROM branchement
WHERE CAST(code_client AS TEXT) LIKE 'CLI-ARAIGNEE-BOBO-%';

DELETE FROM abonne
WHERE CAST(num_abonne AS TEXT) LIKE 'ABO-ARAIGNEE-BOBO-%';

DELETE FROM point_raccordement
WHERE CAST(numero AS TEXT) LIKE 'PR-ARAIGNEE-BOBO-%';

DELETE FROM ligne_brcht
WHERE CAST(numero AS TEXT) LIKE 'LBR-ARAIGNEE-BOBO-%';

DELETE FROM ligne_bt
WHERE CAST(numero AS TEXT) LIKE 'LBT-ARAIGNEE-BOBO-%';

DELETE FROM poteau_bt
WHERE CAST(numero AS TEXT) LIKE 'PBT-ARAIGNEE-BOBO-%';

DELETE FROM depart_bt
WHERE CAST(numero_depart AS TEXT) LIKE 'DEP-BT-ARAIGNEE-BOBO-%';

DELETE FROM poste_cabine
WHERE CAST(numero AS TEXT) LIKE 'PC-ARAIGNEE-BOBO-%';

-- Certaines bases publient les DELETE en replication logique.
-- transfo_poteau n'a pas de PK: on force une identite de replica pour autoriser DELETE.
DO $$
BEGIN
    BEGIN
        EXECUTE 'ALTER TABLE transfo_poteau REPLICA IDENTITY FULL';
    EXCEPTION WHEN OTHERS THEN
        -- Si deja configure ou droits limites, on continue.
        RAISE NOTICE 'Replica identity transfo_poteau non modifiee: %', SQLERRM;
    END;
END $$;

DELETE FROM transfo_poteau
WHERE CAST(numero AS TEXT) LIKE 'TP-ARAIGNEE-BOBO-%';

DELETE FROM ligne_hta
WHERE CAST(numero AS TEXT) LIKE 'LHTA-ARAIGNEE-BOBO-%';

DELETE FROM poteau_hta
WHERE CAST(numero AS TEXT) LIKE 'PHTA-ARAIGNEE-BOBO-%';

DELETE FROM depart
WHERE CAST(numero AS TEXT) LIKE 'DEP-HTA-ARAIGNEE-BOBO-%';

DELETE FROM poste_source
WHERE CAST(numero_poste AS TEXT) = 'PS-ARAIGNEE-BOBO-01';

-- ----------------------------------------------------------------------
-- 2) Generation reseau araignee
-- ----------------------------------------------------------------------
DO $$
DECLARE
    -- Volumes (modifiables)
    hta_feeders_count        int := 3;
    transfos_per_feeder      int := 4;   -- alterne poste_cabine / transfo_poteau
    bt_departs_per_transfo   int := 2;
    bt_branches_per_depart   int := 5;   -- nombre de rayons araignee
    bt_poles_per_branch      int := 4;   -- profondeur par rayon
    subs_per_branch          int := 2;   -- abonnés par rayon

    f int;
    t int;
    b int;
    br int;
    p int;
    s int;

    ps_gid text := '{araignee-bobo-ps-0001}';
    dep_hta_gid text;
    phta_gid text;
    lhta_gid_1 text;
    lhta_gid_2 text;
    cabine_gid text;
    tp_gid text;
    transfo_gid text;
    dep_bt_gid text;
    pbt_gid text;
    lbt_gid text;
    lbr_gid text;
    pr_gid text;
    ab_gid text;
    br_gid text;

    use_cabine boolean;

    lon_ps double precision := -4.3120;
    lat_ps double precision := 11.1750;
    lon_feed double precision;
    lat_feed double precision;
    lon_phta double precision;
    lat_phta double precision;
    lon_transfo double precision;
    lat_transfo double precision;
    lon_prev double precision;
    lat_prev double precision;
    lon_curr double precision;
    lat_curr double precision;
    lon_src double precision;
    lat_src double precision;
    lon_sub double precision;
    lat_sub double precision;

    angle double precision;
    dir_sign double precision;
    src_pole_idx int;
    src_pole_gid text;
    br_num numeric;
BEGIN
    -- Poste source unique
    INSERT INTO poste_source (
        gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
    ) VALUES (
        ps_gid,
        'PS-ARAIGNEE-BOBO-01',
        1,
        'Poste source reseau araignee Bobo',
        'jeu_donnees_auto',
        1,
        ST_Transform(ST_SetSRID(ST_MakePoint(lon_ps, lat_ps), 4326), 32630)
    );

    FOR f IN 1..hta_feeders_count LOOP
        dep_hta_gid := format('{araignee-bobo-dep-hta-%s}', lpad(f::text, 2, '0'));
        lon_feed := lon_ps + (0.010 * cos((2*pi()/hta_feeders_count) * (f-1)));
        lat_feed := lat_ps + (0.008 * sin((2*pi()/hta_feeders_count) * (f-1)));

        INSERT INTO depart (
            gid, numero, id_poste_source, tension, collecte_par, validation
        ) VALUES (
            dep_hta_gid,
            format('DEP-HTA-ARAIGNEE-BOBO-%s', lpad(f::text, 2, '0')),
            ps_gid,
            33000,
            'jeu_donnees_auto',
            1
        );

        FOR t IN 1..transfos_per_feeder LOOP
            use_cabine := (t % 2 = 1);
            dir_sign := CASE WHEN t % 2 = 1 THEN 1.0 ELSE -1.0 END;

            phta_gid := format('{araignee-bobo-phta-%s-%s}', lpad(f::text,2,'0'), lpad(t::text,2,'0'));
            lhta_gid_1 := format('{araignee-bobo-lhta-%s-%s-a}', lpad(f::text,2,'0'), lpad(t::text,2,'0'));
            lhta_gid_2 := format('{araignee-bobo-lhta-%s-%s-b}', lpad(f::text,2,'0'), lpad(t::text,2,'0'));

            lon_phta := lon_feed + (t * 0.0021);
            lat_phta := lat_feed + (dir_sign * 0.0017);
            lon_transfo := lon_feed + (t * 0.0027);
            lat_transfo := lat_feed + (dir_sign * 0.0023);

            INSERT INTO poteau_hta (
                gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
                noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
                collecte_par, validation, geom
            ) VALUES (
                phta_gid,
                format('PHTA-ARAIGNEE-BOBO-%s-%s', lpad(f::text,2,'0'), lpad(t::text,2,'0')),
                1, 4, 4, TRUE, TRUE, TRUE, FALSE, FALSE,
                'jeu_donnees_auto', 1,
                ST_Transform(ST_SetSRID(ST_MakePoint(lon_phta, lat_phta), 4326), 32630)
            );

            -- Segment HTA 1: depart -> poteau_hta
            INSERT INTO ligne_hta (
                gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
                id_depart_hta, id_poteau_hta, collecte_par, validation, geom
            ) VALUES (
                lhta_gid_1,
                format('LHTA-ARAIGNEE-BOBO-%s-%s-A', lpad(f::text,2,'0'), lpad(t::text,2,'0')),
                1, 1,
                dep_hta_gid, phta_gid,
                'jeu_donnees_auto', 1,
                ST_Transform(
                    ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_ps, lat_ps, lon_phta, lat_phta)), 4326),
                    32630
                )
            );

            IF use_cabine THEN
                cabine_gid := format('{araignee-bobo-cab-%s-%s}', lpad(f::text,2,'0'), lpad(t::text,2,'0'));
                transfo_gid := cabine_gid;

                INSERT INTO poste_cabine (
                    gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
                    id_ligne_hta, collecte_par, validation, geom
                ) VALUES (
                    cabine_gid,
                    format('PC-ARAIGNEE-BOBO-%s-%s', lpad(f::text,2,'0'), lpad(t::text,2,'0')),
                    1, 1, 1,
                    lhta_gid_2,
                    'jeu_donnees_auto', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_transfo, lat_transfo), 4326), 32630)
                );
            ELSE
                tp_gid := format('{araignee-bobo-tp-%s-%s}', lpad(f::text,2,'0'), lpad(t::text,2,'0'));
                transfo_gid := tp_gid;

                INSERT INTO transfo_poteau (
                    gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
                    noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
                    collecte_par, validation, geom
                ) VALUES (
                    tp_gid,
                    format('TP-ARAIGNEE-BOBO-%s-%s', lpad(f::text,2,'0'), lpad(t::text,2,'0')),
                    1, 4, 4, TRUE, TRUE, TRUE, TRUE, FALSE,
                    'jeu_donnees_auto', 1,
                    ST_Transform(ST_SetSRID(ST_MakePoint(lon_transfo, lat_transfo), 4326), 32630)
                );
            END IF;

            -- Segment HTA 2: poteau_hta -> transfo (cabine ou transfo_poteau)
            INSERT INTO ligne_hta (
                gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
                id_depart_hta, id_poteau_hta, collecte_par, validation, geom
            ) VALUES (
                lhta_gid_2,
                format('LHTA-ARAIGNEE-BOBO-%s-%s-B', lpad(f::text,2,'0'), lpad(t::text,2,'0')),
                1, 1,
                phta_gid, transfo_gid,
                'jeu_donnees_auto', 1,
                ST_Transform(
                    ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_phta, lat_phta, lon_transfo, lat_transfo)), 4326),
                    32630
                )
            );

            -- Departs BT depuis chaque transfo
            FOR b IN 1..bt_departs_per_transfo LOOP
                dep_bt_gid := format('{araignee-bobo-dep-bt-%s-%s-%s}', lpad(f::text,2,'0'), lpad(t::text,2,'0'), lpad(b::text,2,'0'));

                INSERT INTO depart_bt (
                    gid, numero_depart, id_poste_sur_poteau, id_poste_cabine,
                    collecte_par, validation
                ) VALUES (
                    dep_bt_gid,
                    format('DEP-BT-ARAIGNEE-BOBO-%s-%s-%s', lpad(f::text,2,'0'), lpad(t::text,2,'0'), lpad(b::text,2,'0')),
                    CASE WHEN use_cabine THEN NULL ELSE transfo_gid END,
                    CASE WHEN use_cabine THEN transfo_gid ELSE NULL END,
                    'jeu_donnees_auto',
                    1
                );

                -- Araignee BT: plusieurs branches radiales
                FOR br IN 1..bt_branches_per_depart LOOP
                    angle := (2 * pi() / bt_branches_per_depart) * (br - 1) + (b * 0.08);
                    lon_prev := lon_transfo;
                    lat_prev := lat_transfo;

                    FOR p IN 1..bt_poles_per_branch LOOP
                        pbt_gid := format('{araignee-bobo-pbt-%s-%s-%s-%s-%s}',
                                          lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                          lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                          lpad(p::text,2,'0'));

                        lon_curr := lon_transfo + (0.00058 * p * cos(angle)) + (0.00003 * b);
                        lat_curr := lat_transfo + (0.00058 * p * sin(angle)) + (0.00002 * br);

                        INSERT INTO poteau_bt (
                            gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
                            noeud, extension, descente, avec_lampadaire,
                            collecte_par, validation, geom
                        ) VALUES (
                            pbt_gid,
                            format('PBT-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(p::text,2,'0')),
                            1, 2, 1, TRUE, TRUE, FALSE, FALSE,
                            'jeu_donnees_auto', 1,
                            ST_Transform(ST_SetSRID(ST_MakePoint(lon_curr, lat_curr), 4326), 32630)
                        );

                        lbt_gid := format('{araignee-bobo-lbt-%s-%s-%s-%s-%s}',
                                          lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                          lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                          lpad(p::text,2,'0'));

                        INSERT INTO ligne_bt (
                            gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
                            id_depart_bt, id_poteau_bt, collecte_par, validation, geom
                        ) VALUES (
                            lbt_gid,
                            format('LBT-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(p::text,2,'0')),
                            1, 1, 1, 1,
                            CASE WHEN p = 1 THEN dep_bt_gid ELSE format('{araignee-bobo-pbt-%s-%s-%s-%s-%s}',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad((p-1)::text,2,'0')) END,
                            pbt_gid,
                            'jeu_donnees_auto', 1,
                            ST_Transform(
                                ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_prev, lat_prev, lon_curr, lat_curr)), 4326),
                                32630
                            )
                        );

                        lon_prev := lon_curr;
                        lat_prev := lat_curr;
                    END LOOP;

                    -- Branchements/abonnes sur chaque branche (plusieurs derivations)
                    FOR s IN 1..subs_per_branch LOOP
                        src_pole_idx := GREATEST(1, bt_poles_per_branch - (s - 1) * 2);
                        src_pole_gid := format('{araignee-bobo-pbt-%s-%s-%s-%s-%s}',
                                               lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                               lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                               lpad(src_pole_idx::text,2,'0'));

                        lon_src := lon_transfo + (0.00058 * src_pole_idx * cos(angle)) + (0.00003 * b);
                        lat_src := lat_transfo + (0.00058 * src_pole_idx * sin(angle)) + (0.00002 * br);

                        lon_sub := lon_src + (0.00024 * cos(angle + (pi()/2) * CASE WHEN s % 2 = 1 THEN 1 ELSE -1 END));
                        lat_sub := lat_src + (0.00024 * sin(angle + (pi()/2) * CASE WHEN s % 2 = 1 THEN 1 ELSE -1 END));

                        lbr_gid := format('{araignee-bobo-lbr-%s-%s-%s-%s-%s}',
                                          lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                          lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                          lpad(s::text,2,'0'));
                        pr_gid  := format('{araignee-bobo-pr-%s-%s-%s-%s-%s}',
                                          lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                          lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                          lpad(s::text,2,'0'));
                        ab_gid  := format('{araignee-bobo-ab-%s-%s-%s-%s-%s}',
                                          lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                          lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                          lpad(s::text,2,'0'));
                        br_gid  := format('{araignee-bobo-br-%s-%s-%s-%s-%s}',
                                          lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                          lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                          lpad(s::text,2,'0'));

                        INSERT INTO ligne_brcht (
                            gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
                            id_depart_bt, id_poteau_bt, collecte_par, validation, geom
                        ) VALUES (
                            lbr_gid,
                            format('LBR-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(s::text,2,'0')),
                            1, 1, 1,
                            src_pole_gid, src_pole_gid,
                            'jeu_donnees_auto', 1,
                            ST_Transform(
                                ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_src, lat_src, lon_sub, lat_sub)), 4326),
                                32630
                            )
                        );

                        INSERT INTO point_raccordement (
                            gid, numero, numero_abonne, id_point_raccord_organe, id_point_raccord_exploitation,
                            id_ligne_brcht, collecte_par, validation, geom
                        ) VALUES (
                            pr_gid,
                            format('PR-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(s::text,2,'0')),
                            format('ABO-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(s::text,2,'0')),
                            1, 1,
                            lbr_gid,
                            'jeu_donnees_auto', 1,
                            ST_Transform(ST_SetSRID(ST_MakePoint(lon_sub, lat_sub), 4326), 32630)
                        );

                        INSERT INTO abonne (
                            gid, num_abonne, nom, prenoms, telephone, puissance_souscrite,
                            id_abonne_usage, id_abonne_type, id_abonne_nature, id_abonne_activite,
                            collecte_par, validation
                        ) VALUES (
                            ab_gid,
                            format('ABO-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(s::text,2,'0')),
                            format('NOM_A_%s', lpad((f*10000 + t*1000 + b*100 + br*10 + s)::text, 6, '0')),
                            format('PRENOM_A_%s', lpad((f*10000 + t*1000 + b*100 + br*10 + s)::text, 6, '0')),
                            format('70%s', lpad((f*10000 + t*1000 + b*100 + br*10 + s)::text, 6, '0')),
                            3 + (s % 4),
                            1, 1, 1, 1,
                            'jeu_donnees_auto', 1
                        );

                        br_num := (f * 1000000 + t * 100000 + b * 10000 + br * 100 + s);
                        INSERT INTO branchement (
                            gid, numero, id_point_raccordement, id_branchement_type, id_branchement_rapport_transfo,
                            existence_compteur, code_client, nom, prenoms, telephone,
                            collecte_par, validation
                        ) VALUES (
                            br_gid,
                            br_num,
                            pr_gid,
                            1, 1,
                            TRUE,
                            format('CLI-ARAIGNEE-BOBO-%s-%s-%s-%s-%s',
                                   lpad(f::text,2,'0'), lpad(t::text,2,'0'),
                                   lpad(b::text,2,'0'), lpad(br::text,2,'0'),
                                   lpad(s::text,2,'0')),
                            format('NOM_A_%s', lpad((f*10000 + t*1000 + b*100 + br*10 + s)::text, 6, '0')),
                            format('PRENOM_A_%s', lpad((f*10000 + t*1000 + b*100 + br*10 + s)::text, 6, '0')),
                            format('70%s', lpad((f*10000 + t*1000 + b*100 + br*10 + s)::text, 6, '0')),
                            'jeu_donnees_auto', 1
                        );
                    END LOOP;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

COMMIT;

-- ----------------------------------------------------------------------
-- 3) Requetes de controle rapide
-- ----------------------------------------------------------------------
-- SELECT COUNT(*) AS c_depart_hta FROM depart WHERE CAST(numero AS TEXT) LIKE 'DEP-HTA-ARAIGNEE-BOBO-%';
-- SELECT COUNT(*) AS c_poste_cabine FROM poste_cabine WHERE CAST(numero AS TEXT) LIKE 'PC-ARAIGNEE-BOBO-%';
-- SELECT COUNT(*) AS c_transfo_poteau FROM transfo_poteau WHERE CAST(numero AS TEXT) LIKE 'TP-ARAIGNEE-BOBO-%';
-- SELECT COUNT(*) AS c_depart_bt FROM depart_bt WHERE CAST(numero_depart AS TEXT) LIKE 'DEP-BT-ARAIGNEE-BOBO-%';
-- SELECT COUNT(*) AS c_poteau_bt FROM poteau_bt WHERE CAST(numero AS TEXT) LIKE 'PBT-ARAIGNEE-BOBO-%';
-- SELECT COUNT(*) AS c_abonne FROM abonne WHERE CAST(num_abonne AS TEXT) LIKE 'ABO-ARAIGNEE-BOBO-%';
