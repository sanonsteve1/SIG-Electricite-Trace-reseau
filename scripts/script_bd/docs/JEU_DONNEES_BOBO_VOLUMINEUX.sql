-- Jeu de donnees reseau volumineux (Bobo-Dioulasso)
-- Generation automatique d'un reseau complet et coherent:
-- poste_source -> departs HTA -> postes cabine -> departs BT -> poteaux BT
-- -> lignes branchement -> points de raccordement -> branchements -> abonnes
--
-- Objectif: tests de charge, cartographie, tracage et UX.
--
-- Execution:
-- psql -d <base> -f scripts/script_bd/docs/JEU_DONNEES_BOBO_VOLUMINEUX.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Nettoyage des donnees precedentes de ce scenario
-- ---------------------------------------------------------------------------
DELETE FROM branchement WHERE CAST(numero AS TEXT) LIKE 'BR-VOL-BOBO-%' OR CAST(code_client AS TEXT) LIKE 'CLI-VOL-BOBO-%';
DELETE FROM abonne WHERE CAST(num_abonne AS TEXT) LIKE 'ABO-VOL-BOBO-%';
DELETE FROM point_raccordement WHERE CAST(numero AS TEXT) LIKE 'PR-VOL-BOBO-%';
DELETE FROM ligne_brcht WHERE CAST(numero AS TEXT) LIKE 'LBR-VOL-BOBO-%';
DELETE FROM ligne_bt WHERE CAST(numero AS TEXT) LIKE 'LBT-VOL-BOBO-%';
DELETE FROM poteau_bt WHERE CAST(numero AS TEXT) LIKE 'PBT-VOL-BOBO-%';
DELETE FROM depart_bt WHERE CAST(numero_depart AS TEXT) LIKE 'DEP-BT-VOL-BOBO-%';
DELETE FROM poste_cabine WHERE CAST(numero AS TEXT) LIKE 'PC-VOL-BOBO-%';
DELETE FROM ligne_hta WHERE CAST(numero AS TEXT) LIKE 'LHTA-VOL-BOBO-%';
DELETE FROM poteau_hta WHERE CAST(numero AS TEXT) LIKE 'PHTA-VOL-BOBO-%';
DELETE FROM depart WHERE CAST(numero AS TEXT) LIKE 'DEP-HTA-VOL-BOBO-%';
DELETE FROM poste_source WHERE CAST(numero_poste AS TEXT) = 'PS-VOL-BOBO-01';

-- ---------------------------------------------------------------------------
-- 2) Generation volumineuse
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    -- Volumetrie (ajuste ici selon ton besoin)
    feeders_count            int := 6;   -- nombre de departs HTA
    bt_departs_per_cabine    int := 3;   -- departs BT par poste cabine
    bt_poles_per_depart      int := 20;  -- poteaux BT par depart BT
    subscribers_per_depart   int := 12;  -- abonnes par depart BT

    f int;
    b int;
    p int;
    s int;

    ps_gid text := '{vol-bobo-ps-0001}';
    dep_hta_gid text;
    phta_gid_prev text;
    phta_gid_curr text;
    lhta_gid text;
    cabine_gid text;
    dep_bt_gid text;
    pbt_gid_prev text;
    pbt_gid_curr text;
    lbt_gid text;
    lbr_gid text;
    pr_gid text;
    ab_gid text;
    br_gid text;

    lon_base double precision;
    lat_base double precision;
    lon_prev double precision;
    lat_prev double precision;
    lon_curr double precision;
    lat_curr double precision;

    lon_bt_base double precision;
    lat_bt_base double precision;
    lon_sub double precision;
    lat_sub double precision;
    src_pole_idx int;
    src_pole_gid text;
BEGIN
    -- Poste source unique du scenario volumineux
    INSERT INTO poste_source (
      gid, numero_poste, exploitation, equipement, collecte_par, validation, geom
    ) VALUES (
      ps_gid,
      'PS-VOL-BOBO-01',
      1,
      'Poste source volumineux de test',
      'jeu_donnees_auto',
      1,
      ST_Transform(ST_SetSRID(ST_MakePoint(-4.3120, 11.1750), 4326), 32630)
    );

    -- Boucle depart HTA
    FOR f IN 1..feeders_count LOOP
        dep_hta_gid := format('{vol-bobo-dep-hta-%s}', lpad(f::text, 4, '0'));
        lon_base := -4.3300 + (f * 0.0100);
        lat_base := 11.1500 + (f * 0.0035);

        INSERT INTO depart (
          gid, numero, id_poste_source, tension, collecte_par, validation
        ) VALUES (
          dep_hta_gid,
          format('DEP-HTA-VOL-BOBO-%s', lpad(f::text, 2, '0')),
          ps_gid,
          33000,
          'jeu_donnees_auto',
          1
        );

        -- Deux poteaux HTA + une cabine par depart
        phta_gid_prev := format('{vol-bobo-phta-%s-01}', lpad(f::text, 2, '0'));
        phta_gid_curr := format('{vol-bobo-phta-%s-02}', lpad(f::text, 2, '0'));
        cabine_gid    := format('{vol-bobo-cab-%s}', lpad(f::text, 2, '0'));

        -- Poteau HTA #1
        INSERT INTO poteau_hta (
          gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
          noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
          collecte_par, validation, geom
        ) VALUES (
          phta_gid_prev,
          format('PHTA-VOL-BOBO-%s-01', lpad(f::text, 2, '0')),
          1, 4, 4, TRUE, TRUE, FALSE, FALSE, FALSE,
          'jeu_donnees_auto', 1,
          ST_Transform(ST_SetSRID(ST_MakePoint(lon_base + 0.0020, lat_base + 0.0013), 4326), 32630)
        );

        -- Poteau HTA #2
        INSERT INTO poteau_hta (
          gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
          noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire,
          collecte_par, validation, geom
        ) VALUES (
          phta_gid_curr,
          format('PHTA-VOL-BOBO-%s-02', lpad(f::text, 2, '0')),
          1, 4, 4, TRUE, TRUE, FALSE, FALSE, FALSE,
          'jeu_donnees_auto', 1,
          ST_Transform(ST_SetSRID(ST_MakePoint(lon_base + 0.0040, lat_base + 0.0026), 4326), 32630)
        );

        -- Ligne HTA PS -> PHTA1
        lhta_gid := format('{vol-bobo-lhta-%s-01}', lpad(f::text, 2, '0'));
        INSERT INTO ligne_hta (
          gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
          id_depart_hta, id_poteau_hta, collecte_par, validation, geom
        ) VALUES (
          lhta_gid,
          format('LHTA-VOL-BOBO-%s-01', lpad(f::text, 2, '0')),
          1, 1,
          dep_hta_gid, phta_gid_prev,
          'jeu_donnees_auto', 1,
          ST_Transform(
            ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', -4.3120, 11.1750, lon_base + 0.0020, lat_base + 0.0013)), 4326),
            32630
          )
        );

        -- Ligne HTA PHTA1 -> PHTA2
        lhta_gid := format('{vol-bobo-lhta-%s-02}', lpad(f::text, 2, '0'));
        INSERT INTO ligne_hta (
          gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
          id_depart_hta, id_poteau_hta, collecte_par, validation, geom
        ) VALUES (
          lhta_gid,
          format('LHTA-VOL-BOBO-%s-02', lpad(f::text, 2, '0')),
          1, 1,
          phta_gid_prev, phta_gid_curr,
          'jeu_donnees_auto', 1,
          ST_Transform(
            ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_base + 0.0020, lat_base + 0.0013, lon_base + 0.0040, lat_base + 0.0026)), 4326),
            32630
          )
        );

        -- Poste cabine
        INSERT INTO poste_cabine (
          gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
          id_ligne_hta, collecte_par, validation, geom
        ) VALUES (
          cabine_gid,
          format('PC-VOL-BOBO-%s', lpad(f::text, 2, '0')),
          1, 1, 1,
          format('{vol-bobo-lhta-%s-03}', lpad(f::text, 2, '0')),
          'jeu_donnees_auto', 1,
          ST_Transform(ST_SetSRID(ST_MakePoint(lon_base + 0.0052, lat_base + 0.0032), 4326), 32630)
        );

        -- Ligne HTA PHTA2 -> CABINE
        lhta_gid := format('{vol-bobo-lhta-%s-03}', lpad(f::text, 2, '0'));
        INSERT INTO ligne_hta (
          gid, numero, id_ligne_hta_type, id_ligne_hta_tension,
          id_depart_hta, id_poteau_hta, collecte_par, validation, geom
        ) VALUES (
          lhta_gid,
          format('LHTA-VOL-BOBO-%s-03', lpad(f::text, 2, '0')),
          1, 1,
          phta_gid_curr, cabine_gid,
          'jeu_donnees_auto', 1,
          ST_Transform(
            ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_base + 0.0040, lat_base + 0.0026, lon_base + 0.0052, lat_base + 0.0032)), 4326),
            32630
          )
        );

        -- Boucle departs BT
        FOR b IN 1..bt_departs_per_cabine LOOP
            dep_bt_gid := format('{vol-bobo-dep-bt-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'));
            lon_bt_base := lon_base + 0.0052 + (b * 0.0008);
            lat_bt_base := lat_base + 0.0032 - (b * 0.0006);

            INSERT INTO depart_bt (
              gid, numero_depart, id_poste_cabine, collecte_par, validation
            ) VALUES (
              dep_bt_gid,
              format('DEP-BT-VOL-BOBO-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0')),
              cabine_gid,
              'jeu_donnees_auto',
              1
            );

            -- Chaine poteaux BT + lignes BT
            pbt_gid_prev := dep_bt_gid;
            lon_prev := lon_bt_base;
            lat_prev := lat_bt_base;

            FOR p IN 1..bt_poles_per_depart LOOP
                pbt_gid_curr := format('{vol-bobo-pbt-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(p::text, 3, '0'));
                lon_curr := lon_bt_base + (p * 0.00055);
                lat_curr := lat_bt_base + (p * 0.00035);

                INSERT INTO poteau_bt (
                  gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
                  noeud, extension, descente, avec_lampadaire, collecte_par, validation, geom
                ) VALUES (
                  pbt_gid_curr,
                  format('PBT-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(p::text, 3, '0')),
                  1, 2, 1, TRUE, TRUE, FALSE, FALSE,
                  'jeu_donnees_auto', 1,
                  ST_Transform(ST_SetSRID(ST_MakePoint(lon_curr, lat_curr), 4326), 32630)
                );

                lbt_gid := format('{vol-bobo-lbt-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(p::text, 3, '0'));
                INSERT INTO ligne_bt (
                  gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
                  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
                ) VALUES (
                  lbt_gid,
                  format('LBT-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(p::text, 3, '0')),
                  1, 1, 1, 1,
                  pbt_gid_prev, pbt_gid_curr,
                  'jeu_donnees_auto', 1,
                  ST_Transform(
                    ST_SetSRID(ST_GeomFromText(format('LINESTRING(%s %s, %s %s)', lon_prev, lat_prev, lon_curr, lat_curr)), 4326),
                    32630
                  )
                );

                pbt_gid_prev := pbt_gid_curr;
                lon_prev := lon_curr;
                lat_prev := lat_curr;
            END LOOP;

            -- Abonnes + branchements par depart BT
            FOR s IN 1..subscribers_per_depart LOOP
                src_pole_idx := 4 + ((s - 1) % GREATEST(bt_poles_per_depart - 3, 1));
                src_pole_gid := format('{vol-bobo-pbt-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(src_pole_idx::text, 3, '0'));
                lon_sub := lon_bt_base + (src_pole_idx * 0.00055) + (0.00022 * ((s % 3) - 1));
                lat_sub := lat_bt_base + (src_pole_idx * 0.00035) - (0.00025 * ((s % 4) - 1.5));

                lbr_gid := format('{vol-bobo-lbr-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0'));
                pr_gid  := format('{vol-bobo-pr-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0'));
                ab_gid  := format('{vol-bobo-ab-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0'));
                br_gid  := format('{vol-bobo-br-%s-%s-%s}', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0'));

                INSERT INTO ligne_brcht (
                  gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
                  id_depart_bt, id_poteau_bt, collecte_par, validation, geom
                ) VALUES (
                  lbr_gid,
                  format('LBR-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0')),
                  1, 1, 1,
                  src_pole_gid, src_pole_gid,
                  'jeu_donnees_auto', 1,
                  ST_Transform(
                    ST_SetSRID(ST_GeomFromText(format(
                      'LINESTRING(%s %s, %s %s)',
                      lon_bt_base + (src_pole_idx * 0.00055),
                      lat_bt_base + (src_pole_idx * 0.00035),
                      lon_sub, lat_sub
                    )), 4326),
                    32630
                  )
                );

                INSERT INTO point_raccordement (
                  gid, numero, numero_abonne, id_point_raccord_organe, id_point_raccord_exploitation,
                  id_ligne_brcht, collecte_par, validation, geom
                ) VALUES (
                  pr_gid,
                  format('PR-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0')),
                  format('ABO-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0')),
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
                  format('ABO-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0')),
                  format('NOM%s', lpad((f*10000 + b*100 + s)::text, 6, '0')),
                  format('PRENOM%s', lpad((f*10000 + b*100 + s)::text, 6, '0')),
                  format('70%s', lpad((f*10000 + b*100 + s)::text, 6, '0')),
                  3 + (s % 5),
                  1, 1, 1, 1,
                  'jeu_donnees_auto', 1
                );

                INSERT INTO branchement (
                  gid, numero, id_point_raccordement, id_branchement_type, id_branchement_rapport_transfo,
                  existence_compteur, code_client, nom, prenoms, telephone,
                  collecte_par, validation
                ) VALUES (
                  br_gid,
                  (f * 100000 + b * 1000 + s),
                  pr_gid,
                  1, 1,
                  TRUE,
                  format('CLI-VOL-BOBO-%s-%s-%s', lpad(f::text, 2, '0'), lpad(b::text, 2, '0'), lpad(s::text, 3, '0')),
                  format('NOM%s', lpad((f*10000 + b*100 + s)::text, 6, '0')),
                  format('PRENOM%s', lpad((f*10000 + b*100 + s)::text, 6, '0')),
                  format('70%s', lpad((f*10000 + b*100 + s)::text, 6, '0')),
                  'jeu_donnees_auto', 1
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 3) Controle rapide des volumes generes
-- ---------------------------------------------------------------------------
-- SELECT COUNT(*) AS c_poste_source FROM poste_source WHERE numero_poste = 'PS-VOL-BOBO-01';
-- SELECT COUNT(*) AS c_depart_hta FROM depart WHERE numero LIKE 'DEP-HTA-VOL-BOBO-%';
-- SELECT COUNT(*) AS c_poste_cabine FROM poste_cabine WHERE numero LIKE 'PC-VOL-BOBO-%';
-- SELECT COUNT(*) AS c_depart_bt FROM depart_bt WHERE numero_depart LIKE 'DEP-BT-VOL-BOBO-%';
-- SELECT COUNT(*) AS c_poteau_bt FROM poteau_bt WHERE numero LIKE 'PBT-VOL-BOBO-%';
-- SELECT COUNT(*) AS c_abonne FROM abonne WHERE num_abonne LIKE 'ABO-VOL-BOBO-%';
