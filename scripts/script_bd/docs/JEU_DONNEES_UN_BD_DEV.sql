-- ============================================================================
-- JEU DE DONNEES DEMO - UN_BD_DEV
-- Domaine: Reseau electrique (Burkina Faso)
-- Objectif: alimenter un scenario complet pour tests UN-like
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) PRE-REQUIS MINIMUM (COMMUNE DE TEST)
-- ----------------------------------------------------------------------------
-- Le schema de reference charge les regions mais pas toujours province/commune.
-- On cree donc un minimum de referentiel si absent.

INSERT INTO ref.province (code, nom, chef_lieu, region_id)
SELECT 'KAD', 'Kadiogo', 'Ouagadougou', r.id
FROM ref.region r
WHERE r.code = 'CE'
ON CONFLICT (code) DO NOTHING;

INSERT INTO ref.commune (code, nom, type_commune, province_id)
SELECT 'OUAGA', 'Ouagadougou', 'Urbaine', p.id
FROM ref.province p
WHERE p.code = 'KAD'
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1) PRODUCTION
-- ----------------------------------------------------------------------------
INSERT INTO production.centrale (
    code, nom, source_energie_id, puissance_installee_mw, puissance_disponible_mw,
    tension_sortie_kv, date_mise_en_service, exploitant, proprietaire,
    commune_id, statut_id, geom, observation
)
SELECT
    'CEN-OUA-001',
    'Centrale Ouaga Demo',
    se.id,
    120.000, 98.500,
    90.00,
    DATE '2019-01-10',
    'SONABEL',
    'SONABEL',
    c.id,
    ds.id,
    ST_SetSRID(ST_GeomFromText('POINT(-1.525 12.365)'), 4326),
    'Centrale de demonstration UN_BD_DEV'
FROM ref.domaine_source_energie se
JOIN ref.commune c ON c.code = 'OUAGA'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE se.code = 'THERMIQUE_GAZ'
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2) TRANSPORT (POSTES + LIGNE HT)
-- ----------------------------------------------------------------------------
INSERT INTO transport.poste_source (
    code, nom, type_poste_id, tension_primaire_id, tension_secondaire_id,
    puissance_installee_mva, commune_id, exploitant, statut_id, date_mise_en_service,
    superficie_m2, geom, geom_emprise, observation
)
SELECT
    'PS-OUA-001',
    'Poste Source Ouaga Nord',
    tp.id,
    tprim.id,
    tsec.id,
    80.000,
    c.id,
    'SONABEL',
    ds.id,
    DATE '2020-03-20',
    15000.00,
    ST_SetSRID(ST_GeomFromText('POINT(-1.510 12.390)'), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((-1.511 12.389,-1.509 12.389,-1.509 12.391,-1.511 12.391,-1.511 12.389))'), 4326),
    'Poste source principal de test'
FROM ref.domaine_type_poste tp
JOIN ref.domaine_tension tprim ON tprim.code = 'HT_90'
JOIN ref.domaine_tension tsec ON tsec.code = 'MT_20'
JOIN ref.commune c ON c.code = 'OUAGA'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE tp.code = 'POSTE_SOURCE'
ON CONFLICT (code) DO NOTHING;

INSERT INTO transport.poste_source (
    code, nom, type_poste_id, tension_primaire_id, tension_secondaire_id,
    puissance_installee_mva, commune_id, exploitant, statut_id, date_mise_en_service,
    superficie_m2, geom, geom_emprise, observation
)
SELECT
    'PS-OUA-002',
    'Poste Source Ouaga Est',
    tp.id,
    tprim.id,
    tsec.id,
    63.000,
    c.id,
    'SONABEL',
    ds.id,
    DATE '2021-07-12',
    13000.00,
    ST_SetSRID(ST_GeomFromText('POINT(-1.470 12.370)'), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((-1.471 12.369,-1.469 12.369,-1.469 12.371,-1.471 12.371,-1.471 12.369))'), 4326),
    'Poste source secondaire de test'
FROM ref.domaine_type_poste tp
JOIN ref.domaine_tension tprim ON tprim.code = 'HT_90'
JOIN ref.domaine_tension tsec ON tsec.code = 'MT_20'
JOIN ref.commune c ON c.code = 'OUAGA'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE tp.code = 'POSTE_SOURCE'
ON CONFLICT (code) DO NOTHING;

INSERT INTO transport.ligne_ht (
    code, nom, tension_id, conducteur_id, type_pose, longueur_km,
    poste_depart_id, poste_arrivee_id, statut_id, date_mise_en_service,
    geom, observation
)
SELECT
    'LHT-OUA-001',
    'Interconnexion PS Nord - PS Est',
    t.id,
    dc.id,
    'Aérien',
    6.200,
    ps1.id,
    ps2.id,
    ds.id,
    DATE '2021-09-01',
    ST_SetSRID(ST_GeomFromText('MULTILINESTRING((-1.510 12.390,-1.490 12.382,-1.470 12.370))'), 4326),
    'Ligne HT de demonstration'
FROM ref.domaine_tension t
JOIN ref.domaine_conducteur dc ON dc.code = 'ACSR_228'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
JOIN transport.poste_source ps1 ON ps1.code = 'PS-OUA-001'
JOIN transport.poste_source ps2 ON ps2.code = 'PS-OUA-002'
WHERE t.code = 'HT_90'
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3) DISTRIBUTION (DEPART MT -> CABINE -> TRANSFO -> RESEAU BT)
-- ----------------------------------------------------------------------------
INSERT INTO distribution.depart_mt (
    code, nom, poste_source_id, tension_id, longueur_totale_km,
    nombre_postes_mt_bt, statut_id, geom, observation
)
SELECT
    'DMT-OUA-001',
    'Depart MT Koulouba',
    ps.id,
    t.id,
    12.300,
    1,
    ds.id,
    ST_SetSRID(ST_GeomFromText('MULTILINESTRING((-1.510 12.390,-1.503 12.381,-1.495 12.375))'), 4326),
    'Depart MT de test'
FROM transport.poste_source ps
JOIN ref.domaine_tension t ON t.code = 'MT_20'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE ps.code = 'PS-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.poste_cabine (
    code, nom, type_poste_id, depart_mt_id, poste_source_id, commune_id,
    quartier, statut_id, date_mise_en_service, geom, geom_emprise, observation
)
SELECT
    'CAB-OUA-001',
    'Cabine Koulouba',
    tp.id,
    d.id,
    ps.id,
    c.id,
    'Koulouba',
    ds.id,
    DATE '2022-01-15',
    ST_SetSRID(ST_GeomFromText('POINT(-1.495 12.375)'), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((-1.4953 12.3747,-1.4947 12.3747,-1.4947 12.3753,-1.4953 12.3753,-1.4953 12.3747))'), 4326),
    'Cabine de demonstration'
FROM distribution.depart_mt d
JOIN transport.poste_source ps ON ps.id = d.poste_source_id
JOIN ref.domaine_type_poste tp ON tp.code = 'CABINE_SECONDAIRE'
JOIN ref.commune c ON c.code = 'OUAGA'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE d.code = 'DMT-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.transformateur_mt_bt (
    code, poste_cabine_id, puissance_kva, tension_primaire_kv, tension_secondaire_v,
    couplage, marque, numero_serie, date_installation, statut_id, geom, observation
)
SELECT
    'TRMTBT-OUA-001',
    pc.id,
    400.000,
    20.00,
    400.00,
    'Dyn11',
    'ABB',
    'ABB-DEMO-0001',
    DATE '2022-01-16',
    ds.id,
    ST_SetSRID(ST_GeomFromText('POINT(-1.4951 12.3751)'), 4326),
    'Transformateur cabine Koulouba'
FROM distribution.poste_cabine pc
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE pc.code = 'CAB-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.tgbt (
    code, poste_cabine_id, transformateur_id, nombre_departs_bt, courant_nominal_a,
    statut_id, geom, observation
)
SELECT
    'TGBT-OUA-001',
    pc.id,
    tr.id,
    4,
    630.00,
    ds.id,
    ST_SetSRID(ST_GeomFromText('POINT(-1.49515 12.37515)'), 4326),
    'TGBT principal de cabine'
FROM distribution.poste_cabine pc
JOIN distribution.transformateur_mt_bt tr ON tr.poste_cabine_id = pc.id AND tr.code = 'TRMTBT-OUA-001'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE pc.code = 'CAB-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.ligne_mt (
    code, depart_id, conducteur_id, type_pose, longueur_m, tension_id,
    statut_id, date_pose, geom, observation
)
SELECT
    'LMT-OUA-001',
    d.id,
    dc.id,
    'Aérien',
    1800.00,
    t.id,
    ds.id,
    DATE '2022-01-18',
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.510 12.390,-1.503 12.381,-1.495 12.375)'), 4326),
    'Ligne MT vers cabine Koulouba'
FROM distribution.depart_mt d
JOIN ref.domaine_conducteur dc ON dc.code = 'ALU_95_MT'
JOIN ref.domaine_tension t ON t.code = 'MT_20'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE d.code = 'DMT-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.reseau_bt (
    code, transformateur_id, tgbt_id, longueur_totale_m, nombre_clients, statut_id, geom, observation
)
SELECT
    'RBT-OUA-001',
    tr.id,
    tg.id,
    950.00,
    2,
    ds.id,
    ST_SetSRID(ST_GeomFromText('MULTILINESTRING((-1.4951 12.3751,-1.492 12.373,-1.489 12.371),(-1.4951 12.3751,-1.497 12.372,-1.499 12.370))'), 4326),
    'Reseau BT quartier Koulouba'
FROM distribution.transformateur_mt_bt tr
JOIN distribution.tgbt tg ON tg.transformateur_id = tr.id
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE tr.code = 'TRMTBT-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.ligne_bt (
    code, reseau_bt_id, conducteur_id, type_pose, longueur_m, tension_id, statut_id,
    date_pose, geom, observation
)
SELECT
    'LBT-OUA-001',
    r.id,
    dc.id,
    'Torsadé aérien',
    520.00,
    t.id,
    ds.id,
    DATE '2022-01-20',
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.4951 12.3751,-1.492 12.373,-1.489 12.371)'), 4326),
    'Troncon BT branche nord'
FROM distribution.reseau_bt r
JOIN ref.domaine_conducteur dc ON dc.code = 'TORS_50'
JOIN ref.domaine_tension t ON t.code = 'BT_380'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE r.code = 'RBT-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.ligne_bt (
    code, reseau_bt_id, conducteur_id, type_pose, longueur_m, tension_id, statut_id,
    date_pose, geom, observation
)
SELECT
    'LBT-OUA-002',
    r.id,
    dc.id,
    'Torsadé aérien',
    430.00,
    t.id,
    ds.id,
    DATE '2022-01-20',
    ST_SetSRID(ST_GeomFromText('LINESTRING(-1.4951 12.3751,-1.497 12.372,-1.499 12.370)'), 4326),
    'Troncon BT branche sud'
FROM distribution.reseau_bt r
JOIN ref.domaine_conducteur dc ON dc.code = 'TORS_35'
JOIN ref.domaine_tension t ON t.code = 'BT_380'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE r.code = 'RBT-OUA-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO distribution.coffret_bt (
    code, reseau_bt_id, type_coffret, nombre_departs, statut_id, geom, observation
)
SELECT
    'CBT-OUA-001',
    r.id,
    'Coffret de branchement',
    6,
    ds.id,
    ST_SetSRID(ST_GeomFromText('POINT(-1.492 12.373)'), 4326),
    'Coffret BT demo'
FROM distribution.reseau_bt r
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE r.code = 'RBT-OUA-001'
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4) CLIENTS (ABONNES + COMPTEURS + RELEVES)
-- ----------------------------------------------------------------------------
INSERT INTO client.abonne (
    numero_contrat, nom, prenom, telephone, categorie_id, commune_id,
    quartier, adresse_complete, date_abonnement, statut, geom
)
SELECT
    'CTR-OUA-0001',
    'OUEDRAOGO',
    'Issa',
    '70000001',
    ca.id,
    c.id,
    'Koulouba',
    'Parcelle KLB-01',
    DATE '2023-02-01',
    'Actif',
    ST_SetSRID(ST_GeomFromText('POINT(-1.4902 12.3714)'), 4326)
FROM client.categorie_abonne ca
JOIN ref.commune c ON c.code = 'OUAGA'
WHERE ca.code = 'DOMESTIQUE_BT'
ON CONFLICT (numero_contrat) DO NOTHING;

INSERT INTO client.abonne (
    numero_contrat, nom, prenom, telephone, categorie_id, commune_id,
    quartier, adresse_complete, date_abonnement, statut, geom
)
SELECT
    'CTR-OUA-0002',
    'SAWADOGO',
    'Awa',
    '70000002',
    ca.id,
    c.id,
    'Koulouba',
    'Parcelle KLB-02',
    DATE '2023-03-12',
    'Actif',
    ST_SetSRID(ST_GeomFromText('POINT(-1.4988 12.3703)'), 4326)
FROM client.categorie_abonne ca
JOIN ref.commune c ON c.code = 'OUAGA'
WHERE ca.code = 'PROFESSIONNEL_BT'
ON CONFLICT (numero_contrat) DO NOTHING;

INSERT INTO client.compteur (
    numero_serie, abonne_id, reseau_bt_id, coffret_id, type_compteur, marque, date_pose,
    statut_id, puissance_souscrite_kva, index_initial, geom, observation
)
SELECT
    'CMP-OUA-0001',
    a.id,
    r.id,
    cb.id,
    'Communicant AMI',
    'Hexing',
    DATE '2023-02-02',
    ds.id,
    6.60,
    0.000,
    ST_SetSRID(ST_GeomFromText('POINT(-1.4902 12.3714)'), 4326),
    'Compteur client OUEDRAOGO'
FROM client.abonne a
JOIN distribution.reseau_bt r ON r.code = 'RBT-OUA-001'
JOIN distribution.coffret_bt cb ON cb.code = 'CBT-OUA-001'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE a.numero_contrat = 'CTR-OUA-0001'
ON CONFLICT (numero_serie) DO NOTHING;

INSERT INTO client.compteur (
    numero_serie, abonne_id, reseau_bt_id, coffret_id, type_compteur, marque, date_pose,
    statut_id, puissance_souscrite_kva, index_initial, geom, observation
)
SELECT
    'CMP-OUA-0002',
    a.id,
    r.id,
    cb.id,
    'Prépayé',
    'Landis+Gyr',
    DATE '2023-03-13',
    ds.id,
    9.90,
    0.000,
    ST_SetSRID(ST_GeomFromText('POINT(-1.4988 12.3703)'), 4326),
    'Compteur client SAWADOGO'
FROM client.abonne a
JOIN distribution.reseau_bt r ON r.code = 'RBT-OUA-001'
JOIN distribution.coffret_bt cb ON cb.code = 'CBT-OUA-001'
JOIN ref.domaine_statut ds ON ds.code = 'EN_SERVICE'
WHERE a.numero_contrat = 'CTR-OUA-0002'
ON CONFLICT (numero_serie) DO NOTHING;

INSERT INTO client.releve_compteur (
    compteur_id, date_releve, index_kwh, consommation_kwh, agent, methode, observation
)
SELECT
    cp.id,
    CURRENT_DATE - INTERVAL '1 day',
    1420.300,
    68.200,
    'Agent Test',
    'Télé-relevé',
    'Releve demo'
FROM client.compteur cp
WHERE cp.numero_serie = 'CMP-OUA-0001'
ON CONFLICT DO NOTHING;

INSERT INTO client.releve_compteur (
    compteur_id, date_releve, index_kwh, consommation_kwh, agent, methode, observation
)
SELECT
    cp.id,
    CURRENT_DATE - INTERVAL '1 day',
    980.700,
    51.900,
    'Agent Test',
    'Télé-relevé',
    'Releve demo'
FROM client.compteur cp
WHERE cp.numero_serie = 'CMP-OUA-0002'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5) MAINTENANCE (INCIDENT + INTERVENTION)
-- ----------------------------------------------------------------------------
INSERT INTO maintenance.incident (
    code, type_incident, date_debut, date_fin, cause_probable, impact_clients,
    energie_non_distribuee_kwh, commune_id, tier_affecte, objet_type, objet_id,
    resolu, geom, observation
)
SELECT
    'INC-OUA-0001',
    'Surcharge',
    NOW() - INTERVAL '3 day',
    NOW() - INTERVAL '2 day 20 hour',
    'Pointe de consommation',
    120,
    430.500,
    c.id,
    'Distribution_BT',
    'distribution.ligne_bt',
    lbt.id,
    TRUE,
    ST_SetSRID(ST_GeomFromText('POINT(-1.4925 12.3725)'), 4326),
    'Incident resolu de demonstration'
FROM ref.commune c
JOIN distribution.ligne_bt lbt ON lbt.code = 'LBT-OUA-001'
WHERE c.code = 'OUAGA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO maintenance.intervention (
    code, type_intervention_id, incident_id, date_planifiee, date_debut, date_fin,
    technicien_responsable, equipe, objet_type, objet_id, cout_materiel_fcfa,
    cout_main_oeuvre_fcfa, statut, rapport_technique, geom
)
SELECT
    'INT-OUA-0001',
    ti.id,
    i.id,
    CURRENT_DATE - 3,
    NOW() - INTERVAL '3 day',
    NOW() - INTERVAL '2 day 20 hour',
    'Technicien KABORE',
    'Equipe MT-BT 01',
    'distribution.ligne_bt',
    lbt.id,
    125000.00,
    85000.00,
    'Terminée',
    'Renforcement de section et resserrage des connexions.',
    ST_SetSRID(ST_GeomFromText('POINT(-1.4925 12.3725)'), 4326)
FROM maintenance.type_intervention ti
JOIN maintenance.incident i ON i.code = 'INC-OUA-0001'
JOIN distribution.ligne_bt lbt ON lbt.code = 'LBT-OUA-001'
WHERE ti.code = 'MAINTENANCE_PREV'
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ============================================================================
-- FIN
-- Execution:
--   psql -d UN_BD_DEV -f scripts/script_bd/docs/JEU_DONNEES_UN_BD_DEV.sql
-- ============================================================================

