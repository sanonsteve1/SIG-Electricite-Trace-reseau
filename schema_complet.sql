-- =============================================================================
-- BASE DE DONNÉES RÉSEAU ÉLECTRIQUE — BURKINA FASO
-- Solution inspirée d'ArcGIS Utility Network
-- SGBD : PostgreSQL / PostGIS
-- Auteur : Généré automatiquement (Complété avec Postes Sources et Cabines)
-- =============================================================================

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CRÉATION DES SCHÉMAS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS ref;           -- Référentiels et domaines métier
CREATE SCHEMA IF NOT EXISTS production;    -- Centrales et sources d'énergie
CREATE SCHEMA IF NOT EXISTS transport;     -- Réseau Haute Tension (HT)
CREATE SCHEMA IF NOT EXISTS distribution;  -- Réseau Moyenne et Basse Tension
CREATE SCHEMA IF NOT EXISTS client;        -- Abonnés et compteurs
CREATE SCHEMA IF NOT EXISTS reseau;        -- Topologie (Utility Network)
CREATE SCHEMA IF NOT EXISTS maintenance;   -- Incidents et interventions


-- =============================================================================
-- SCHÉMA REF — RÉFÉRENTIELS ET DOMAINES MÉTIER
-- =============================================================================

-- Régions administratives du Burkina Faso (13 régions)
CREATE TABLE ref.region (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(10)  UNIQUE NOT NULL,
    nom         VARCHAR(100) NOT NULL,
    chef_lieu   VARCHAR(100),
    geom        GEOMETRY(MULTIPOLYGON, 4326)
);

-- Provinces du Burkina Faso (45 provinces)
CREATE TABLE ref.province (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(10)  UNIQUE NOT NULL,
    nom         VARCHAR(100) NOT NULL,
    chef_lieu   VARCHAR(100),
    region_id   INT REFERENCES ref.region(id),
    geom        GEOMETRY(MULTIPOLYGON, 4326)
);

-- Communes du Burkina Faso
CREATE TABLE ref.commune (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(10)  UNIQUE NOT NULL,
    nom           VARCHAR(100) NOT NULL,
    type_commune  VARCHAR(10)  CHECK (type_commune IN ('Urbaine','Rurale')),
    province_id   INT REFERENCES ref.province(id),
    geom          GEOMETRY(MULTIPOLYGON, 4326)
);

-- Données de référence : Régions BF
INSERT INTO ref.region (code, nom, chef_lieu) VALUES
('BL',  'Boucle du Mouhoun',  'Dédougou'),
('CA',  'Cascades',           'Banfora'),
('CE',  'Centre',             'Ouagadougou'),
('CEN', 'Centre-Est',         'Tenkodogo'),
('CN',  'Centre-Nord',        'Kaya'),
('CO',  'Centre-Ouest',       'Koudougou'),
('CS',  'Centre-Sud',         'Manga'),
('ES',  'Est',                'Fada N''Gourma'),
('HA',  'Hauts-Bassins',      'Bobo-Dioulasso'),
('NO',  'Nord',               'Ouahigouya'),
('PL',  'Plateau-Central',    'Ziniaré'),
('SA',  'Sahel',              'Dori'),
('SU',  'Sud-Ouest',          'Gaoua');

-- Domaine : Niveaux de tension électrique
CREATE TABLE ref.domaine_tension (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(20) UNIQUE NOT NULL,
    libelle               VARCHAR(100) NOT NULL,
    tension_nominale_kv   NUMERIC(8,2),
    categorie             VARCHAR(5) CHECK (categorie IN ('THT','HT','MT','BT'))
);

INSERT INTO ref.domaine_tension (code, libelle, tension_nominale_kv, categorie) VALUES
('THT_225', 'Très Haute Tension 225 kV', 225.00,  'THT'),
('HT_132',  'Haute Tension 132 kV',      132.00,  'HT'),
('HT_90',   'Haute Tension 90 kV',        90.00,  'HT'),
('HT_33',   'Haute Tension 33 kV',        33.00,  'HT'),
('MT_20',   'Moyenne Tension 20 kV',      20.00,  'MT'),
('MT_15',   'Moyenne Tension 15 kV',      15.00,  'MT'),
('BT_380',  'Basse Tension 380 V (triphasé)', 0.38,'BT'),
('BT_220',  'Basse Tension 220 V (monophasé)',0.22,'BT');

-- Domaine : Types de conducteur électrique
CREATE TABLE ref.domaine_conducteur (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,
    libelle         VARCHAR(200) NOT NULL,
    matiere         VARCHAR(30)  CHECK (matiere IN ('Cuivre','Aluminium','Acier-Aluminium','XLPE','HDPE','Autre')),
    section_mm2     NUMERIC(8,2),
    intensite_max_a NUMERIC(8,2),
    type_pose       VARCHAR(15)  CHECK (type_pose IN ('Aérien','Souterrain','Immergé'))
);

INSERT INTO ref.domaine_conducteur (code, libelle, matiere, section_mm2, intensite_max_a, type_pose) VALUES
('ACSR_95',   'ACSR 95 mm² (Poulet)',              'Acier-Aluminium',  95,  330, 'Aérien'),
('ACSR_147',  'ACSR 147 mm² (Ibis)',               'Acier-Aluminium', 147,  440, 'Aérien'),
('ACSR_228',  'ACSR 228 mm² (Pélican)',            'Acier-Aluminium', 228,  560, 'Aérien'),
('ALU_50_MT', 'Aluminium 50 mm² MT aérien',        'Aluminium',        50,  160, 'Aérien'),
('ALU_95_MT', 'Aluminium 95 mm² MT aérien',        'Aluminium',        95,  240, 'Aérien'),
('TORS_35',   'Câble torsadé 35 mm² BT',           'Aluminium',        35,  120, 'Aérien'),
('TORS_50',   'Câble torsadé 50 mm² BT',           'Aluminium',        50,  155, 'Aérien'),
('XLPE_95',   'XLPE 95 mm² souterrain MT',         'XLPE',             95,  195, 'Souterrain'),
('XLPE_150',  'XLPE 150 mm² souterrain MT',        'XLPE',            150,  240, 'Souterrain'),
('CU_25_BT',  'Cuivre 25 mm² BT souterrain',       'Cuivre',           25,  105, 'Souterrain');

-- Domaine : Statut opérationnel des équipements
CREATE TABLE ref.domaine_statut (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    categorie   VARCHAR(20) CHECK (categorie IN ('Opérationnel','Travaux','Hors service','Planifié'))
);

INSERT INTO ref.domaine_statut (code, libelle, categorie) VALUES
('EN_SERVICE',      'En service',             'Opérationnel'),
('HORS_SERVICE',    'Hors service',           'Hors service'),
('EN_TRAVAUX',      'En travaux',             'Travaux'),
('EN_CONSTRUCTION', 'En construction',        'Planifié'),
('ABANDONNE',       'Abandonné',              'Hors service'),
('PLANIFIE',        'Planifié',               'Planifié'),
('DEPOSE',          'Déposé',                 'Hors service');

-- Domaine : Sources d'énergie
CREATE TABLE ref.domaine_source_energie (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(30) UNIQUE NOT NULL,
    libelle      VARCHAR(100) NOT NULL,
    renouvelable BOOLEAN DEFAULT FALSE
);

INSERT INTO ref.domaine_source_energie (code, libelle, renouvelable) VALUES
('THERMIQUE_FIOUL',   'Thermique Fioul',                    FALSE),
('THERMIQUE_DIESEL',  'Thermique Diesel',                   FALSE),
('THERMIQUE_GAZ',     'Thermique Gaz',                      FALSE),
('SOLAIRE_PV',        'Solaire Photovoltaïque',             TRUE),
('SOLAIRE_HYBRIDE',   'Solaire Hybride (PV + Diesel)',      TRUE),
('HYDROELECTRIQUE',   'Hydroélectrique',                    TRUE),
('EOLIEN',            'Éolien',                             TRUE),
('BIOMASSE',          'Biomasse',                           TRUE),
('IMPORTATION',       'Importation (interconnexion régionale)', FALSE);

-- Domaine : Types de poste électrique
CREATE TABLE ref.domaine_type_poste (
    id      SERIAL PRIMARY KEY,
    code    VARCHAR(30) UNIQUE NOT NULL,
    libelle VARCHAR(150) NOT NULL
);

INSERT INTO ref.domaine_type_poste (code, libelle) VALUES
('POSTE_SOURCE',       'Poste Source (HTB/HTA)'),
('POSTE_HT_MT',        'Poste Haute Tension / Moyenne Tension'),
('POSTE_MT_BT',        'Poste de Distribution MT/BT (Transformateur)'),
('CABINE_PRIMAIRE',    'Cabine Primaire'),
('CABINE_SECONDAIRE',  'Cabine Secondaire'),
('POSTE_MOBILE',       'Poste Mobile'),
('POSTE_PREFABRIQUE',  'Poste Préfabriqué (Compact)');

-- Domaine : Types d'appareillage électrique
CREATE TABLE ref.domaine_appareillage (
    id               SERIAL PRIMARY KEY,
    code             VARCHAR(30) UNIQUE NOT NULL,
    libelle          VARCHAR(150) NOT NULL,
    peut_interrompre BOOLEAN DEFAULT FALSE,
    telecommande     BOOLEAN DEFAULT FALSE
);

INSERT INTO ref.domaine_appareillage (code, libelle, peut_interrompre, telecommande) VALUES
('DISJONCTEUR',       'Disjoncteur',                          TRUE,  TRUE),
('SECTIONNEUR',       'Sectionneur',                          FALSE, FALSE),
('INTERRUPTEUR',      'Interrupteur',                         TRUE,  FALSE),
('INTERRUPTEUR_TLC',  'Interrupteur Télécommandé (ITC)',      TRUE,  TRUE),
('FUSIBLE',           'Fusible (coupe-circuit)',              TRUE,  FALSE),
('PARAFOUDRE',        'Parafoudre (limiteur de surtension)',  FALSE, FALSE),
('RECLOSER',          'Réenclencheur automatique',            TRUE,  TRUE),
('SECTIONNEUR_SOL',   'Sectionneur de mise à la terre',       FALSE, FALSE),
('TRANSFORMATEUR_MT', 'Transformateur de mesure MT',          FALSE, FALSE),
('TC',                'Transformateur de courant (TC)',        FALSE, FALSE),
('TT',                'Transformateur de tension (TT)',        FALSE, FALSE);

-- Fournisseurs et constructeurs d'équipements
CREATE TABLE ref.fournisseur (
    id      SERIAL PRIMARY KEY,
    nom     VARCHAR(200) NOT NULL,
    pays    VARCHAR(100),
    contact VARCHAR(200),
    email   VARCHAR(150)
);


-- =============================================================================
-- SCHÉMA PRODUCTION — CENTRALES ET SOURCES D'ÉNERGIE
-- =============================================================================

-- Centrales de production électrique
CREATE TABLE production.centrale (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                    VARCHAR(30) UNIQUE NOT NULL,
    nom                     VARCHAR(200) NOT NULL,
    source_energie_id       INT REFERENCES ref.domaine_source_energie(id),
    puissance_installee_mw  NUMERIC(10,3),
    puissance_disponible_mw NUMERIC(10,3),
    tension_sortie_kv       NUMERIC(8,2),
    date_mise_en_service    DATE,
    exploitant              VARCHAR(200),  -- Ex : SONABEL
    proprietaire            VARCHAR(200),
    commune_id              INT REFERENCES ref.commune(id),
    statut_id               INT REFERENCES ref.domaine_statut(id),
    geom                    GEOMETRY(POINT, 4326),
    observation             TEXT,
    date_creation           TIMESTAMP DEFAULT NOW(),
    date_modification       TIMESTAMP DEFAULT NOW()
);

-- Groupes électrogènes rattachés à une centrale
CREATE TABLE production.groupe_electrogene (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    centrale_id          UUID REFERENCES production.centrale(id) ON DELETE CASCADE,
    puissance_nominale_mw NUMERIC(10,3),
    marque               VARCHAR(100),
    modele               VARCHAR(100),
    numero_serie         VARCHAR(100),
    date_mise_en_service DATE,
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);

-- Champs photovoltaïques (fermes solaires)
CREATE TABLE production.champ_photovoltaique (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code              VARCHAR(30) UNIQUE NOT NULL,
    nom               VARCHAR(200) NOT NULL,
    centrale_id       UUID REFERENCES production.centrale(id) ON DELETE CASCADE,
    puissance_crete_kwc NUMERIC(10,3),
    nombre_panneaux   INT,
    marque_panneau    VARCHAR(100),
    superficie_m2     NUMERIC(12,2),
    inclinaison_deg   NUMERIC(5,2),
    orientation       VARCHAR(20),  -- Ex : Sud, Sud-Est
    geom              GEOMETRY(POLYGON, 4326),
    observation       TEXT
);

-- Systèmes de stockage / Batteries
CREATE TABLE production.systeme_stockage (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(30) UNIQUE NOT NULL,
    centrale_id    UUID REFERENCES production.centrale(id),
    type_stockage  VARCHAR(30) CHECK (type_stockage IN ('Lithium-Ion','Plomb-Acide','Nickel-Cadmium','NMC','LFP','Autre')),
    capacite_kwh   NUMERIC(10,3),
    puissance_kw   NUMERIC(10,3),
    marque         VARCHAR(100),
    date_installation DATE,
    statut_id      INT REFERENCES ref.domaine_statut(id),
    geom           GEOMETRY(POINT, 4326),
    observation    TEXT
);


-- =============================================================================
-- SCHÉMA TRANSPORT — RÉSEAU HAUTE TENSION ET POSTES SOURCES
-- =============================================================================

-- Pylônes et supports de ligne HT
CREATE TABLE transport.pylone (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         VARCHAR(30) UNIQUE NOT NULL,
    type_pylone  VARCHAR(30) CHECK (type_pylone IN ('Treillis Acier','Béton','Bois','Tubulaire')),
    fonction     VARCHAR(30) CHECK (fonction IN ('Alignement','Angle','Ancrage','Dérivation','Fin de ligne','Arrêt')),
    hauteur_m    NUMERIC(6,2),
    tension_id   INT REFERENCES ref.domaine_tension(id),
    commune_id   INT REFERENCES ref.commune(id),
    statut_id    INT REFERENCES ref.domaine_statut(id),
    date_pose    DATE,
    geom         GEOMETRY(POINT, 4326),
    observation  TEXT
);

-- Postes électriques haute tension (Postes Sources HTB/HTA)
CREATE TABLE transport.poste_source (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                   VARCHAR(30) UNIQUE NOT NULL,
    nom                    VARCHAR(200) NOT NULL,
    type_poste_id          INT REFERENCES ref.domaine_type_poste(id),
    tension_primaire_id    INT REFERENCES ref.domaine_tension(id),
    tension_secondaire_id  INT REFERENCES ref.domaine_tension(id),
    puissance_installee_mva NUMERIC(10,3),
    commune_id             INT REFERENCES ref.commune(id),
    exploitant             VARCHAR(200),
    statut_id              INT REFERENCES ref.domaine_statut(id),
    date_mise_en_service   DATE,
    superficie_m2          NUMERIC(12,2),
    geom                   GEOMETRY(POINT, 4326),
    geom_emprise           GEOMETRY(POLYGON, 4326),  -- Emprise au sol du poste
    observation            TEXT,
    date_creation          TIMESTAMP DEFAULT NOW(),
    date_modification      TIMESTAMP DEFAULT NOW()
);

-- Transformateurs de puissance HT (Composant du Poste Source)
CREATE TABLE transport.transformateur_ht (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    poste_source_id      UUID REFERENCES transport.poste_source(id),
    puissance_mva        NUMERIC(10,3),
    tension_primaire_kv  NUMERIC(8,2),
    tension_secondaire_kv NUMERIC(8,2),
    couplage             VARCHAR(10),    -- Ex : YNd11, Dyn11
    marque               VARCHAR(100),
    numero_serie         VARCHAR(100),
    fournisseur_id       INT REFERENCES ref.fournisseur(id),
    date_installation    DATE,
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);

-- Jeux de barres HT/MT (Composant du Poste Source)
CREATE TABLE transport.jeu_de_barres (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    poste_source_id      UUID REFERENCES transport.poste_source(id),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    courant_nominal_a    NUMERIC(8,2),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(LINESTRING, 4326),
    observation          TEXT
);

-- Cellules HT/MT (Composant du Poste Source)
CREATE TABLE transport.cellule_poste_source (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    poste_source_id      UUID REFERENCES transport.poste_source(id),
    jeu_de_barres_id     UUID REFERENCES transport.jeu_de_barres(id),
    type_cellule         VARCHAR(50) CHECK (type_cellule IN ('Arrivée', 'Départ', 'Couplage', 'Mesure', 'Protection')),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);

-- Lignes de transport haute tension
CREATE TABLE transport.ligne_ht (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    conducteur_id        INT REFERENCES ref.domaine_conducteur(id),
    type_pose            VARCHAR(15) CHECK (type_pose IN ('Aérien','Souterrain')),
    longueur_km          NUMERIC(10,3),
    poste_depart_id      UUID REFERENCES transport.poste_source(id),
    poste_arrivee_id     UUID REFERENCES transport.poste_source(id),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    date_mise_en_service DATE,
    geom                 GEOMETRY(MULTILINESTRING, 4326),
    observation          TEXT,
    date_creation        TIMESTAMP DEFAULT NOW(),
    date_modification    TIMESTAMP DEFAULT NOW()
);

-- Tronçons de ligne HT (segmentation entre pylônes)
CREATE TABLE transport.troncon_ht (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ligne_id          UUID REFERENCES transport.ligne_ht(id) ON DELETE CASCADE,
    pylone_depart_id  UUID REFERENCES transport.pylone(id),
    pylone_arrivee_id UUID REFERENCES transport.pylone(id),
    ordre_troncon     INT NOT NULL,
    longueur_m        NUMERIC(10,2),
    geom              GEOMETRY(LINESTRING, 4326)
);

-- Appareillage haute tension (disjoncteurs, sectionneurs, etc.)
CREATE TABLE transport.appareillage_ht (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    type_appareillage_id INT REFERENCES ref.domaine_appareillage(id),
    poste_source_id      UUID REFERENCES transport.poste_source(id),
    cellule_id           UUID REFERENCES transport.cellule_poste_source(id),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    marque               VARCHAR(100),
    numero_serie         VARCHAR(100),
    courant_nominal_a    NUMERIC(8,2),
    pouvoir_coupure_ka   NUMERIC(8,2),
    etat_normal          VARCHAR(10) CHECK (etat_normal IN ('Ouvert','Fermé')),
    etat_actuel          VARCHAR(10) CHECK (etat_actuel IN ('Ouvert','Fermé')),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    date_installation    DATE,
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);


-- =============================================================================
-- SCHÉMA DISTRIBUTION — RÉSEAU MOYENNE ET BASSE TENSION ET CABINES
-- =============================================================================

-- Départs MT (circuits issus d'un poste source)
CREATE TABLE distribution.depart_mt (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    poste_source_id      UUID REFERENCES transport.poste_source(id),
    cellule_depart_id    UUID REFERENCES transport.cellule_poste_source(id),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    longueur_totale_km   NUMERIC(10,3),
    nombre_postes_mt_bt  INT DEFAULT 0,
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(MULTILINESTRING, 4326),
    observation          TEXT
);

-- Postes Cabines (Cabines Primaires / Secondaires MT/BT)
CREATE TABLE distribution.poste_cabine (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    type_poste_id        INT REFERENCES ref.domaine_type_poste(id),
    depart_mt_id         UUID REFERENCES distribution.depart_mt(id),
    poste_source_id      UUID REFERENCES transport.poste_source(id),
    commune_id           INT REFERENCES ref.commune(id),
    quartier             VARCHAR(150),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    date_mise_en_service DATE,
    geom                 GEOMETRY(POINT, 4326),
    geom_emprise         GEOMETRY(POLYGON, 4326),
    observation          TEXT,
    date_creation        TIMESTAMP DEFAULT NOW(),
    date_modification    TIMESTAMP DEFAULT NOW()
);

-- Cellules MT (Composant de la Cabine)
CREATE TABLE distribution.cellule_cabine (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    nom                  VARCHAR(200),
    poste_cabine_id      UUID REFERENCES distribution.poste_cabine(id),
    type_cellule         VARCHAR(50) CHECK (type_cellule IN ('Arrivée', 'Départ', 'Protection Transformateur', 'Interrupteur-Sectionneur')),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);

-- Transformateurs MT/BT (Composant de la Cabine)
CREATE TABLE distribution.transformateur_mt_bt (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                  VARCHAR(30) UNIQUE NOT NULL,
    poste_cabine_id       UUID REFERENCES distribution.poste_cabine(id),
    cellule_protection_id UUID REFERENCES distribution.cellule_cabine(id),
    puissance_kva         NUMERIC(10,3),
    tension_primaire_kv   NUMERIC(8,2),
    tension_secondaire_v  NUMERIC(8,2),
    couplage              VARCHAR(10),   -- Ex : Dyn11, Yzn11
    marque                VARCHAR(100),
    numero_serie          VARCHAR(100),
    fournisseur_id        INT REFERENCES ref.fournisseur(id),
    date_installation     DATE,
    statut_id             INT REFERENCES ref.domaine_statut(id),
    geom                  GEOMETRY(POINT, 4326),
    observation           TEXT
);

-- Tableau Général Basse Tension (TGBT) (Composant de la Cabine)
CREATE TABLE distribution.tgbt (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    poste_cabine_id      UUID REFERENCES distribution.poste_cabine(id),
    transformateur_id    UUID REFERENCES distribution.transformateur_mt_bt(id),
    nombre_departs_bt    INT,
    courant_nominal_a    NUMERIC(8,2),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);

-- Lignes MT (tronçons du réseau moyenne tension)
CREATE TABLE distribution.ligne_mt (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         VARCHAR(30) UNIQUE NOT NULL,
    depart_id    UUID REFERENCES distribution.depart_mt(id),
    conducteur_id INT REFERENCES ref.domaine_conducteur(id),
    type_pose    VARCHAR(15) CHECK (type_pose IN ('Aérien','Souterrain')),
    longueur_m   NUMERIC(10,2),
    tension_id   INT REFERENCES ref.domaine_tension(id),
    statut_id    INT REFERENCES ref.domaine_statut(id),
    date_pose    DATE,
    geom         GEOMETRY(LINESTRING, 4326),
    observation  TEXT,
    date_creation     TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW()
);

-- Supports de ligne MT (poteaux)
CREATE TABLE distribution.support_mt (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         VARCHAR(30) UNIQUE NOT NULL,
    type_support VARCHAR(20) CHECK (type_support IN ('Béton','Bois','Acier','Tubulaire')),
    hauteur_m    NUMERIC(6,2),
    fonction     VARCHAR(20) CHECK (fonction IN ('Alignement','Angle','Ancrage','Dérivation','Fin de ligne')),
    commune_id   INT REFERENCES ref.commune(id),
    statut_id    INT REFERENCES ref.domaine_statut(id),
    date_pose    DATE,
    geom         GEOMETRY(POINT, 4326),
    observation  TEXT
);

-- Appareillage MT (interrupteurs, fusibles, réenclencheurs)
CREATE TABLE distribution.appareillage_mt (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    type_appareillage_id INT REFERENCES ref.domaine_appareillage(id),
    poste_cabine_id      UUID REFERENCES distribution.poste_cabine(id),
    cellule_id           UUID REFERENCES distribution.cellule_cabine(id),
    depart_id            UUID REFERENCES distribution.depart_mt(id),
    tension_id           INT REFERENCES ref.domaine_tension(id),
    marque               VARCHAR(100),
    numero_serie         VARCHAR(100),
    etat_normal          VARCHAR(10) CHECK (etat_normal IN ('Ouvert','Fermé')),
    etat_actuel          VARCHAR(10) CHECK (etat_actuel IN ('Ouvert','Fermé')),
    statut_id            INT REFERENCES ref.domaine_statut(id),
    date_installation    DATE,
    geom                 GEOMETRY(POINT, 4326),
    observation          TEXT
);

-- Réseaux BT (ensemble des lignes BT alimentées par un transformateur MT/BT)
CREATE TABLE distribution.reseau_bt (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code              VARCHAR(30) UNIQUE NOT NULL,
    transformateur_id UUID REFERENCES distribution.transformateur_mt_bt(id),
    tgbt_id           UUID REFERENCES distribution.tgbt(id),
    longueur_totale_m NUMERIC(10,2),
    nombre_clients    INT DEFAULT 0,
    statut_id         INT REFERENCES ref.domaine_statut(id),
    geom              GEOMETRY(MULTILINESTRING, 4326),
    observation       TEXT
);

-- Lignes BT (tronçons du réseau basse tension)
CREATE TABLE distribution.ligne_bt (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          VARCHAR(30) UNIQUE NOT NULL,
    reseau_bt_id  UUID REFERENCES distribution.reseau_bt(id),
    conducteur_id INT REFERENCES ref.domaine_conducteur(id),
    type_pose     VARCHAR(20) CHECK (type_pose IN ('Aérien','Souterrain','Torsadé aérien')),
    longueur_m    NUMERIC(10,2),
    tension_id    INT REFERENCES ref.domaine_tension(id),
    statut_id     INT REFERENCES ref.domaine_statut(id),
    date_pose     DATE,
    geom          GEOMETRY(LINESTRING, 4326),
    observation   TEXT,
    date_creation     TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW()
);

-- Supports de ligne BT (poteaux basse tension)
CREATE TABLE distribution.support_bt (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         VARCHAR(30) UNIQUE NOT NULL,
    type_support VARCHAR(20) CHECK (type_support IN ('Béton','Bois','Acier','Tubulaire')),
    hauteur_m    NUMERIC(6,2),
    fonction     VARCHAR(20) CHECK (fonction IN ('Alignement','Angle','Ancrage','Dérivation','Fin de ligne')),
    commune_id   INT REFERENCES ref.commune(id),
    statut_id    INT REFERENCES ref.domaine_statut(id),
    date_pose    DATE,
    geom         GEOMETRY(POINT, 4326),
    observation  TEXT
);

-- Coffrets / Tableaux de distribution BT
CREATE TABLE distribution.coffret_bt (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         VARCHAR(30) UNIQUE NOT NULL,
    reseau_bt_id UUID REFERENCES distribution.reseau_bt(id),
    type_coffret VARCHAR(50),     -- Ex : Coffret de branchement, TD BT, ...
    nombre_departs INT,
    statut_id    INT REFERENCES ref.domaine_statut(id),
    geom         GEOMETRY(POINT, 4326),
    observation  TEXT
);


-- =============================================================================
-- SCHÉMA CLIENT — ABONNÉS ET COMPTEURS
-- =============================================================================

-- Catégories tarifaires des abonnés
CREATE TABLE client.categorie_abonne (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(30) UNIQUE NOT NULL,
    libelle      VARCHAR(150) NOT NULL,
    tranche_tarif VARCHAR(80)
);

INSERT INTO client.categorie_abonne (code, libelle, tranche_tarif) VALUES
('DOMESTIQUE_BT',     'Domestique Basse Tension',             'Tarif social / Normal'),
('PROFESSIONNEL_BT',  'Professionnel Basse Tension',          'Tarif professionnel'),
('INDUSTRIEL_MT',     'Industriel Moyenne Tension',           'Tarif industriel MT'),
('ECLAIRAGE_PUBLIC',  'Éclairage Public',                     'Tarif EP'),
('ADMINISTRATIONS',   'Administrations & Services Publics',   'Tarif administration'),
('MINES',             'Industries Minières',                  'Tarif minier'),
('PREPAYE',           'Abonné Prépayé (Yelen)',               'Tarif prépayé'),
('AGRICOLE',          'Usage Agricole (pompage)',              'Tarif agricole');

-- Abonnés / Clients
CREATE TABLE client.abonne (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_contrat   VARCHAR(50) UNIQUE NOT NULL,
    nom              VARCHAR(200) NOT NULL,
    prenom           VARCHAR(200),
    telephone        VARCHAR(20),
    email            VARCHAR(150),
    categorie_id     INT REFERENCES client.categorie_abonne(id),
    commune_id       INT REFERENCES ref.commune(id),
    quartier         VARCHAR(150),
    secteur          VARCHAR(50),
    adresse_complete TEXT,
    date_abonnement  DATE,
    statut           VARCHAR(15) CHECK (statut IN ('Actif','Suspendu','Résilié')),
    geom             GEOMETRY(POINT, 4326),
    date_creation    TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW()
);

-- Compteurs électriques
CREATE TABLE client.compteur (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_serie        VARCHAR(100) UNIQUE NOT NULL,
    abonne_id           UUID REFERENCES client.abonne(id),
    reseau_bt_id        UUID REFERENCES distribution.reseau_bt(id),
    coffret_id          UUID REFERENCES distribution.coffret_bt(id),
    type_compteur       VARCHAR(20) CHECK (type_compteur IN ('Monophasé','Triphasé','Prépayé','Communicant AMI')),
    marque              VARCHAR(100),
    date_pose           DATE,
    statut_id           INT REFERENCES ref.domaine_statut(id),
    puissance_souscrite_kva NUMERIC(8,2),
    index_initial       NUMERIC(12,3) DEFAULT 0,
    geom                GEOMETRY(POINT, 4326),
    observation         TEXT
);

-- Relevés de compteurs (historique des index)
CREATE TABLE client.releve_compteur (
    id           SERIAL PRIMARY KEY,
    compteur_id  UUID REFERENCES client.compteur(id),
    date_releve  DATE NOT NULL,
    index_kwh    NUMERIC(12,3) NOT NULL,
    consommation_kwh NUMERIC(12,3),
    agent        VARCHAR(200),
    methode      VARCHAR(20) CHECK (methode IN ('Terrain','Télé-relevé','Estimé')),
    observation  TEXT,
    date_creation TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- SCHÉMA RESEAU — TOPOLOGIE ET CONNECTIVITÉ (UTILITY NETWORK)
-- =============================================================================

-- Nœuds du réseau (équivalent des Utility Network Junctions)
CREATE TABLE reseau.noeud (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_noeud VARCHAR(30) CHECK (type_noeud IN (
        'Centrale','Poste_Source','Poste_Cabine','Pylone',
        'Support_MT','Support_BT','Appareillage_HT',
        'Appareillage_MT','Coffret_BT','Compteur'
    )),
    objet_id   UUID NOT NULL,   -- UUID de l'objet référencé dans sa table métier
    tier       VARCHAR(25) CHECK (tier IN ('Production','Transport','Distribution_MT','Distribution_BT','Client')),
    geom       GEOMETRY(POINT, 4326)
);

-- Arêtes du réseau (équivalent des Utility Network Edges)
CREATE TABLE reseau.arete (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_arete     VARCHAR(15) CHECK (type_arete IN ('Ligne_HT','Ligne_MT','Ligne_BT')),
    objet_id       UUID NOT NULL,   -- UUID de la ligne dans sa table métier
    noeud_depart_id   UUID REFERENCES reseau.noeud(id),
    noeud_arrivee_id  UUID REFERENCES reseau.noeud(id),
    tier           VARCHAR(25) CHECK (tier IN ('Transport','Distribution_MT','Distribution_BT')),
    geom           GEOMETRY(LINESTRING, 4326)
);

-- Associations entre éléments du réseau (connectivité, contenance, structurelle)
CREATE TABLE reseau.association (
    id              SERIAL PRIMARY KEY,
    type_association VARCHAR(20) CHECK (type_association IN (
        'Connectivite','Contenance','Jonction_Milieu','Structurelle'
    )),
    noeud_source_id UUID REFERENCES reseau.noeud(id),
    noeud_cible_id  UUID REFERENCES reseau.noeud(id),
    arete_source_id UUID REFERENCES reseau.arete(id),
    description     TEXT
);

-- Zones d'alimentation (zones géographiques desservies)
CREATE TABLE reseau.zone_alimentation (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(30) UNIQUE NOT NULL,
    nom                 VARCHAR(200),
    type_zone           VARCHAR(20) CHECK (type_zone IN ('Depart_MT','Reseau_BT','Poste_Source')),
    source_id           UUID NOT NULL,   -- ID du départ MT ou transformateur
    population_estimee  INT,
    nombre_clients      INT DEFAULT 0,
    taux_electrification NUMERIC(5,2),  -- En pourcentage
    geom                GEOMETRY(POLYGON, 4326),
    date_creation       TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- SCHÉMA MAINTENANCE — INTERVENTIONS ET INCIDENTS
-- =============================================================================

-- Types d'intervention de maintenance
CREATE TABLE maintenance.type_intervention (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(30) UNIQUE NOT NULL,
    libelle    VARCHAR(200) NOT NULL,
    categorie  VARCHAR(20) CHECK (categorie IN ('Préventive','Corrective','Urgence','Extension','Contrôle'))
);

INSERT INTO maintenance.type_intervention (code, libelle, categorie) VALUES
('MAINTENANCE_PREV',    'Maintenance Préventive Programmée',              'Préventive'),
('EXTENSION_RESEAU',    'Extension du réseau électrique',                 'Extension'),
('RENOVATION',          'Rénovation ou modernisation',                    'Préventive'),
('URGENCE_ACCIDENT',    'Urgence / Accident',                             'Urgence'),
('CONTROLE_TERRAIN',    'Contrôle et inspection terrain',                 'Contrôle'),
('RACCORDEMENT',        'Raccordement nouvel abonné',                     'Extension');

-- Incidents et pannes sur le réseau
CREATE TABLE maintenance.incident (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                      VARCHAR(30) UNIQUE NOT NULL,
    type_incident             VARCHAR(40) CHECK (type_incident IN (
        'Court-circuit','Surcharge','Rupture conducteur','Défaut isolement',
        'Manœuvre erronée','Acte de vandalisme','Catastrophe naturelle',
        'Défaut matériel','Chute d''arbre','Autre'
    )),
    date_debut                TIMESTAMP NOT NULL,
    date_fin                  TIMESTAMP,
    cause_probable            VARCHAR(200),
    impact_clients            INT DEFAULT 0,
    energie_non_distribuee_kwh NUMERIC(12,3),
    commune_id                INT REFERENCES ref.commune(id),
    tier_affecte              VARCHAR(25),   -- 'Transport', 'Distribution_MT', etc.
    objet_type                VARCHAR(50),   -- Ex : 'ligne_ht', 'transformateur_mt_bt'
    objet_id                  UUID,          -- UUID de l'équipement défaillant
    resolu                    BOOLEAN DEFAULT FALSE,
    geom                      GEOMETRY(POINT, 4326),
    observation               TEXT,
    date_creation             TIMESTAMP DEFAULT NOW()
);

-- Interventions de maintenance planifiées et réalisées
CREATE TABLE maintenance.intervention (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    type_intervention_id INT REFERENCES maintenance.type_intervention(id),
    incident_id          UUID REFERENCES maintenance.incident(id),
    date_planifiee       DATE,
    date_debut           TIMESTAMP,
    date_fin             TIMESTAMP,
    technicien_responsable VARCHAR(200),
    equipe               VARCHAR(200),
    objet_type           VARCHAR(50),  -- Table de l'équipement concerné
    objet_id             UUID,         -- UUID de l'équipement concerné
    cout_materiel_fcfa   NUMERIC(15,2) DEFAULT 0,
    cout_main_oeuvre_fcfa NUMERIC(15,2) DEFAULT 0,
    statut               VARCHAR(15) CHECK (statut IN ('Planifiée','En cours','Terminée','Annulée')),
    rapport_technique    TEXT,
    geom                 GEOMETRY(POINT, 4326),
    date_creation        TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- INDEX SPATIAUX POSTGIS (Performance des requêtes géographiques)
-- =============================================================================
CREATE INDEX idx_region_geom          ON ref.region               USING GIST(geom);
CREATE INDEX idx_province_geom        ON ref.province             USING GIST(geom);
CREATE INDEX idx_commune_geom         ON ref.commune              USING GIST(geom);
CREATE INDEX idx_centrale_geom        ON production.centrale      USING GIST(geom);
CREATE INDEX idx_champ_pv_geom        ON production.champ_photovoltaique USING GIST(geom);
CREATE INDEX idx_pylone_geom          ON transport.pylone         USING GIST(geom);
CREATE INDEX idx_poste_source_geom    ON transport.poste_source   USING GIST(geom);
CREATE INDEX idx_ligne_ht_geom        ON transport.ligne_ht       USING GIST(geom);
CREATE INDEX idx_troncon_ht_geom      ON transport.troncon_ht     USING GIST(geom);
CREATE INDEX idx_appareillage_ht_geom ON transport.appareillage_ht USING GIST(geom);
CREATE INDEX idx_depart_mt_geom       ON distribution.depart_mt   USING GIST(geom);
CREATE INDEX idx_poste_cabine_geom    ON distribution.poste_cabine USING GIST(geom);
CREATE INDEX idx_ligne_mt_geom        ON distribution.ligne_mt    USING GIST(geom);
CREATE INDEX idx_support_mt_geom      ON distribution.support_mt  USING GIST(geom);
CREATE INDEX idx_appareillage_mt_geom ON distribution.appareillage_mt USING GIST(geom);
CREATE INDEX idx_reseau_bt_geom       ON distribution.reseau_bt   USING GIST(geom);
CREATE INDEX idx_ligne_bt_geom        ON distribution.ligne_bt    USING GIST(geom);
CREATE INDEX idx_support_bt_geom      ON distribution.support_bt  USING GIST(geom);
CREATE INDEX idx_coffret_bt_geom      ON distribution.coffret_bt  USING GIST(geom);
CREATE INDEX idx_abonne_geom          ON client.abonne            USING GIST(geom);
CREATE INDEX idx_compteur_geom        ON client.compteur          USING GIST(geom);
CREATE INDEX idx_noeud_geom           ON reseau.noeud             USING GIST(geom);
CREATE INDEX idx_arete_geom           ON reseau.arete             USING GIST(geom);
CREATE INDEX idx_zone_alim_geom       ON reseau.zone_alimentation USING GIST(geom);
CREATE INDEX idx_incident_geom        ON maintenance.incident     USING GIST(geom);
CREATE INDEX idx_intervention_geom    ON maintenance.intervention USING GIST(geom);

-- Index classiques pour performances
CREATE INDEX idx_abonne_commune       ON client.abonne(commune_id);
CREATE INDEX idx_abonne_statut        ON client.abonne(statut);
CREATE INDEX idx_compteur_abonne      ON client.compteur(abonne_id);
CREATE INDEX idx_ligne_mt_depart      ON distribution.ligne_mt(depart_id);
CREATE INDEX idx_ligne_bt_reseau      ON distribution.ligne_bt(reseau_bt_id);
CREATE INDEX idx_incident_resolu      ON maintenance.incident(resolu, date_debut);
CREATE INDEX idx_intervention_statut  ON maintenance.intervention(statut);


-- =============================================================================
-- VUES ANALYTIQUES
-- =============================================================================

-- Vue : Synthèse de la production électrique
CREATE VIEW production.v_synthese_production AS
SELECT
    c.code,
    c.nom,
    se.libelle        AS source_energie,
    se.renouvelable,
    c.puissance_installee_mw,
    c.puissance_disponible_mw,
    ROUND(c.puissance_disponible_mw / NULLIF(c.puissance_installee_mw,0) * 100, 1) AS taux_disponibilite_pct,
    co.nom            AS commune,
    p.nom             AS province,
    r.nom             AS region,
    s.libelle         AS statut,
    c.date_mise_en_service,
    c.geom
FROM production.centrale c
LEFT JOIN ref.domaine_source_energie se ON c.source_energie_id = se.id
LEFT JOIN ref.commune co  ON c.commune_id   = co.id
LEFT JOIN ref.province p  ON co.province_id = p.id
LEFT JOIN ref.region r    ON p.region_id    = r.id
LEFT JOIN ref.domaine_statut s ON c.statut_id = s.id;

-- Vue : Postes Sources avec leur bilan de puissance
CREATE VIEW transport.v_postes_sources AS
SELECT
    ps.code,
    ps.nom,
    tp.libelle        AS type_poste,
    t1.libelle        AS tension_primaire,
    t2.libelle        AS tension_secondaire,
    ps.puissance_installee_mva,
    COUNT(tr.id)      AS nb_transformateurs,
    co.nom            AS commune,
    p.nom             AS province,
    r.nom             AS region,
    s.libelle         AS statut,
    ps.geom
FROM transport.poste_source ps
LEFT JOIN transport.transformateur_ht tr ON tr.poste_source_id = ps.id
LEFT JOIN ref.domaine_type_poste tp  ON ps.type_poste_id          = tp.id
LEFT JOIN ref.domaine_tension t1     ON ps.tension_primaire_id     = t1.id
LEFT JOIN ref.domaine_tension t2     ON ps.tension_secondaire_id   = t2.id
LEFT JOIN ref.commune co   ON ps.commune_id  = co.id
LEFT JOIN ref.province p   ON co.province_id = p.id
LEFT JOIN ref.region r     ON p.region_id    = r.id
LEFT JOIN ref.domaine_statut s ON ps.statut_id = s.id
GROUP BY ps.id, ps.code, ps.nom, tp.libelle, t1.libelle, t2.libelle,
         ps.puissance_installee_mva, co.nom, p.nom, r.nom, s.libelle, ps.geom;

-- Vue : Postes Cabines avec le bilan de puissance installée
CREATE VIEW distribution.v_postes_cabines AS
SELECT
    pc.code,
    pc.nom,
    tp.libelle          AS type_poste,
    COUNT(tr.id)        AS nb_transformateurs,
    SUM(tr.puissance_kva) AS puissance_totale_kva,
    co.nom              AS commune,
    pc.quartier,
    s.libelle           AS statut,
    pc.geom
FROM distribution.poste_cabine pc
LEFT JOIN distribution.transformateur_mt_bt tr ON tr.poste_cabine_id = pc.id
LEFT JOIN ref.domaine_type_poste tp ON pc.type_poste_id = tp.id
LEFT JOIN ref.commune co  ON pc.commune_id  = co.id
LEFT JOIN ref.domaine_statut s ON pc.statut_id = s.id
GROUP BY pc.id, pc.code, pc.nom, tp.libelle, co.nom, pc.quartier, s.libelle, pc.geom;

-- Vue : Clients par commune (taux d'électrification approximatif)
CREATE VIEW client.v_clients_par_commune AS
SELECT
    co.nom       AS commune,
    p.nom        AS province,
    r.nom        AS region,
    co.type_commune,
    COUNT(a.id)  AS nb_abonnes_total,
    COUNT(CASE WHEN a.statut = 'Actif' THEN 1 END)    AS nb_abonnes_actifs,
    COUNT(CASE WHEN a.statut = 'Suspendu' THEN 1 END) AS nb_abonnes_suspendus,
    COUNT(CASE WHEN ca.code = 'PREPAYE' THEN 1 END)   AS nb_prepaye
FROM ref.commune co
LEFT JOIN ref.province p ON co.province_id = p.id
LEFT JOIN ref.region r   ON p.region_id    = r.id
LEFT JOIN client.abonne a  ON a.commune_id   = co.id
LEFT JOIN client.categorie_abonne ca ON a.categorie_id = ca.id
GROUP BY co.id, co.nom, co.type_commune, p.nom, r.nom
ORDER BY nb_abonnes_actifs DESC;

-- Vue : Incidents ouverts (non résolus) en temps réel
CREATE VIEW maintenance.v_incidents_ouverts AS
SELECT
    i.code,
    i.type_incident,
    i.date_debut,
    ROUND(EXTRACT(EPOCH FROM (NOW() - i.date_debut)) / 3600, 1) AS duree_heures,
    i.impact_clients,
    i.energie_non_distribuee_kwh,
    i.tier_affecte,
    i.objet_type,
    co.nom AS commune,
    p.nom  AS province,
    i.cause_probable,
    i.observation,
    i.geom
FROM maintenance.incident i
LEFT JOIN ref.commune co ON i.commune_id  = co.id
LEFT JOIN ref.province p ON co.province_id = p.id
WHERE i.resolu = FALSE
ORDER BY i.date_debut DESC;

-- Vue : Tableau de bord réseau (indicateurs globaux)
CREATE VIEW reseau.v_tableau_de_bord AS
SELECT
    'Centrales en service'      AS indicateur,
    COUNT(*)::TEXT              AS valeur
FROM production.centrale c JOIN ref.domaine_statut s ON c.statut_id = s.id
WHERE s.code = 'EN_SERVICE'
UNION ALL
SELECT 'Puissance installée totale (MW)', ROUND(SUM(puissance_installee_mw),2)::TEXT
FROM production.centrale
UNION ALL
SELECT 'Postes Sources en service', COUNT(*)::TEXT
FROM transport.poste_source ps JOIN ref.domaine_statut s ON ps.statut_id = s.id
WHERE s.code = 'EN_SERVICE'
UNION ALL
SELECT 'Longueur lignes HT (km)', ROUND(SUM(longueur_km),1)::TEXT
FROM transport.ligne_ht
UNION ALL
SELECT 'Postes Cabines en service', COUNT(*)::TEXT
FROM distribution.poste_cabine pc JOIN ref.domaine_statut s ON pc.statut_id = s.id
WHERE s.code = 'EN_SERVICE'
UNION ALL
SELECT 'Abonnés actifs', COUNT(*)::TEXT
FROM client.abonne WHERE statut = 'Actif'
UNION ALL
SELECT 'Incidents ouverts', COUNT(*)::TEXT
FROM maintenance.incident WHERE resolu = FALSE;


-- =============================================================================
-- COMPLÉMENTS UTILITY NETWORK + CODIFICATION STANDARDISÉE
-- =============================================================================

-- -----------------------------
-- 1) RÉFÉRENTIEL DE CODIFICATION
-- -----------------------------
CREATE TABLE IF NOT EXISTS ref.regle_codification (
    id                SERIAL PRIMARY KEY,
    schema_cible      VARCHAR(50) NOT NULL,
    table_cible       VARCHAR(100) NOT NULL,
    prefixe           VARCHAR(20) NOT NULL,
    longueur_sequence INT NOT NULL DEFAULT 6 CHECK (longueur_sequence BETWEEN 3 AND 12),
    separateur        VARCHAR(3) NOT NULL DEFAULT '-',
    actif             BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (schema_cible, table_cible),
    UNIQUE (prefixe)
);

INSERT INTO ref.regle_codification (schema_cible, table_cible, prefixe, longueur_sequence, separateur)
VALUES
('transport', 'troncon_ht',    'TRH', 6, '-'),
('reseau',    'noeud',         'NOD', 6, '-'),
('reseau',    'arete',         'ARE', 6, '-'),
('reseau',    'association',   'ASN', 6, '-'),
('client',    'releve_compteur','RLC', 6, '-')
ON CONFLICT (schema_cible, table_cible) DO NOTHING;

-- Séquences dédiées de codification
CREATE SEQUENCE IF NOT EXISTS transport.seq_troncon_ht_code START 1;
CREATE SEQUENCE IF NOT EXISTS reseau.seq_noeud_code START 1;
CREATE SEQUENCE IF NOT EXISTS reseau.seq_arete_code START 1;
CREATE SEQUENCE IF NOT EXISTS reseau.seq_association_code START 1;
CREATE SEQUENCE IF NOT EXISTS client.seq_releve_compteur_code START 1;

-- -----------------------------
-- 2) CODIFICATION DES TABLES SANS CODE
-- -----------------------------

-- Tronçons HT
ALTER TABLE transport.troncon_ht
    ADD COLUMN IF NOT EXISTS code VARCHAR(30);

UPDATE transport.troncon_ht
SET code = 'TRH-' || LPAD(nextval('transport.seq_troncon_ht_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE transport.troncon_ht
    ALTER COLUMN code SET DEFAULT ('TRH-' || LPAD(nextval('transport.seq_troncon_ht_code')::TEXT, 6, '0'));

ALTER TABLE transport.troncon_ht
    ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_troncon_ht_code'
    ) THEN
        ALTER TABLE transport.troncon_ht
            ADD CONSTRAINT uq_troncon_ht_code UNIQUE (code);
    END IF;
END $$;

-- Noeuds réseau
ALTER TABLE reseau.noeud
    ADD COLUMN IF NOT EXISTS code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS objet_table VARCHAR(80);

UPDATE reseau.noeud
SET code = 'NOD-' || LPAD(nextval('reseau.seq_noeud_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE reseau.noeud
    ALTER COLUMN code SET DEFAULT ('NOD-' || LPAD(nextval('reseau.seq_noeud_code')::TEXT, 6, '0'));

ALTER TABLE reseau.noeud
    ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_noeud_code'
    ) THEN
        ALTER TABLE reseau.noeud
            ADD CONSTRAINT uq_noeud_code UNIQUE (code);
    END IF;
END $$;

ALTER TABLE reseau.noeud
    DROP CONSTRAINT IF EXISTS chk_noeud_objet_table;

ALTER TABLE reseau.noeud
    ADD CONSTRAINT chk_noeud_objet_table CHECK (
        objet_table IS NULL OR objet_table IN (
            'production.centrale',
            'transport.poste_source',
            'distribution.poste_cabine',
            'transport.pylone',
            'distribution.support_mt',
            'distribution.support_bt',
            'transport.appareillage_ht',
            'distribution.appareillage_mt',
            'distribution.coffret_bt',
            'client.compteur'
        )
    );

-- Arêtes réseau
ALTER TABLE reseau.arete
    ADD COLUMN IF NOT EXISTS code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS objet_table VARCHAR(80),
    ADD COLUMN IF NOT EXISTS traversable BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sens_circulation VARCHAR(12) NOT NULL DEFAULT 'Bidirectionnel';

UPDATE reseau.arete
SET code = 'ARE-' || LPAD(nextval('reseau.seq_arete_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE reseau.arete
    ALTER COLUMN code SET DEFAULT ('ARE-' || LPAD(nextval('reseau.seq_arete_code')::TEXT, 6, '0'));

ALTER TABLE reseau.arete
    ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_arete_code'
    ) THEN
        ALTER TABLE reseau.arete
            ADD CONSTRAINT uq_arete_code UNIQUE (code);
    END IF;
END $$;

ALTER TABLE reseau.arete
    DROP CONSTRAINT IF EXISTS chk_arete_objet_table;

ALTER TABLE reseau.arete
    ADD CONSTRAINT chk_arete_objet_table CHECK (
        objet_table IS NULL OR objet_table IN (
            'transport.ligne_ht',
            'distribution.ligne_mt',
            'distribution.ligne_bt'
        )
    );

ALTER TABLE reseau.arete
    DROP CONSTRAINT IF EXISTS chk_arete_sens;

ALTER TABLE reseau.arete
    ADD CONSTRAINT chk_arete_sens CHECK (sens_circulation IN ('Amont-Aval', 'Aval-Amont', 'Bidirectionnel'));

-- Associations réseau
ALTER TABLE reseau.association
    ADD COLUMN IF NOT EXISTS code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS statut_id INT REFERENCES ref.domaine_statut(id),
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP DEFAULT NOW();

UPDATE reseau.association
SET code = 'ASN-' || LPAD(nextval('reseau.seq_association_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE reseau.association
    ALTER COLUMN code SET DEFAULT ('ASN-' || LPAD(nextval('reseau.seq_association_code')::TEXT, 6, '0'));

ALTER TABLE reseau.association
    ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_association_code'
    ) THEN
        ALTER TABLE reseau.association
            ADD CONSTRAINT uq_association_code UNIQUE (code);
    END IF;
END $$;

-- Relevés de compteurs
ALTER TABLE client.releve_compteur
    ADD COLUMN IF NOT EXISTS code VARCHAR(30);

UPDATE client.releve_compteur
SET code = 'RLC-' || LPAD(nextval('client.seq_releve_compteur_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE client.releve_compteur
    ALTER COLUMN code SET DEFAULT ('RLC-' || LPAD(nextval('client.seq_releve_compteur_code')::TEXT, 6, '0'));

ALTER TABLE client.releve_compteur
    ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_releve_compteur_code'
    ) THEN
        ALTER TABLE client.releve_compteur
            ADD CONSTRAINT uq_releve_compteur_code UNIQUE (code);
    END IF;
END $$;

-- -----------------------------
-- 3) TERMINAUX ET RÈGLES DE CONNECTIVITÉ
-- -----------------------------

-- Terminaux des nœuds (borne A/B/C ou entrée/sortie)
CREATE TABLE IF NOT EXISTS reseau.terminal (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(30) UNIQUE NOT NULL,
    noeud_id            UUID NOT NULL REFERENCES reseau.noeud(id) ON DELETE CASCADE,
    nom_terminal        VARCHAR(80) NOT NULL,
    rang_terminal       SMALLINT NOT NULL CHECK (rang_terminal BETWEEN 1 AND 12),
    type_terminal       VARCHAR(20) NOT NULL CHECK (type_terminal IN ('Entree','Sortie','Bidirectionnel','Terre')),
    phase_autorisee     VARCHAR(10) CHECK (phase_autorisee IN ('A','B','C','AB','BC','CA','ABC')),
    tension_id          INT REFERENCES ref.domaine_tension(id),
    est_principal       BOOLEAN NOT NULL DEFAULT FALSE,
    est_energise        BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation       TIMESTAMP DEFAULT NOW(),
    UNIQUE (noeud_id, rang_terminal),
    UNIQUE (noeud_id, nom_terminal)
);

CREATE INDEX IF NOT EXISTS idx_terminal_noeud ON reseau.terminal(noeud_id);

-- Règles de connectivité (équivalent Connectvity Rules UN)
CREATE TABLE IF NOT EXISTS reseau.regle_connectivite (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(30) UNIQUE NOT NULL,
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    type_association      VARCHAR(20) NOT NULL CHECK (type_association IN ('Connectivite','Jonction_Milieu')),
    type_noeud_source     VARCHAR(30) NOT NULL,
    type_noeud_cible      VARCHAR(30) NOT NULL,
    type_arete            VARCHAR(15),
    tension_source_id     INT REFERENCES ref.domaine_tension(id),
    tension_cible_id      INT REFERENCES ref.domaine_tension(id),
    autorise              BOOLEAN NOT NULL DEFAULT TRUE,
    description           TEXT
);

-- Règles de base pour le réseau électrique
INSERT INTO reseau.regle_connectivite (
    code, type_association, type_noeud_source, type_noeud_cible, type_arete, autorise, description
) VALUES
('RC-PS-DEP',   'Connectivite', 'Poste_Source',   'Poste_Cabine',  'Ligne_MT', TRUE,  'Poste source vers cabine via départ MT'),
('RC-CAB-CBT',  'Connectivite', 'Poste_Cabine',   'Coffret_BT',    'Ligne_BT', TRUE,  'Cabine vers coffret BT'),
('RC-PYL-PS',   'Connectivite', 'Pylone',         'Poste_Source',  'Ligne_HT', TRUE,  'Pylône vers poste source en HT'),
('RC-CPT-CBT',  'Connectivite', 'Coffret_BT',     'Compteur',      NULL,       TRUE,  'Branchement compteur depuis coffret BT'),
('RC-CPT-HT',   'Connectivite', 'Compteur',       'Poste_Source',  'Ligne_HT', FALSE, 'Connexion compteur sur HT interdite')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------
-- 4) GESTION DES SOUS-RÉSEAUX (FEEDERS)
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.sous_reseau (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(30) UNIQUE NOT NULL,
    nom                 VARCHAR(200) NOT NULL,
    niveau_reseau       VARCHAR(20) NOT NULL CHECK (niveau_reseau IN ('Transport','Distribution_MT','Distribution_BT')),
    type_sous_reseau    VARCHAR(25) NOT NULL CHECK (type_sous_reseau IN ('Depart_MT','Reseau_BT','Boucle_HT','Interconnexion')),
    source_noeud_id     UUID REFERENCES reseau.noeud(id),
    statut_id           INT REFERENCES ref.domaine_statut(id),
    longueur_totale_km  NUMERIC(12,3),
    charge_estimee_mw   NUMERIC(12,3),
    pertes_estimees_pct NUMERIC(5,2),
    geom                GEOMETRY(MULTILINESTRING, 4326),
    date_creation       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reseau.sous_reseau_element (
    id                BIGSERIAL PRIMARY KEY,
    sous_reseau_id    UUID NOT NULL REFERENCES reseau.sous_reseau(id) ON DELETE CASCADE,
    element_type      VARCHAR(10) NOT NULL CHECK (element_type IN ('Noeud','Arete')),
    noeud_id          UUID REFERENCES reseau.noeud(id),
    arete_id          UUID REFERENCES reseau.arete(id),
    ordre_topologique INT,
    distance_source_km NUMERIC(12,3),
    date_creation     TIMESTAMP DEFAULT NOW(),
    CHECK (
        (element_type = 'Noeud' AND noeud_id IS NOT NULL AND arete_id IS NULL) OR
        (element_type = 'Arete' AND arete_id IS NOT NULL AND noeud_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_sous_reseau_element_sr ON reseau.sous_reseau_element(sous_reseau_id);
CREATE INDEX IF NOT EXISTS idx_sous_reseau_element_noeud ON reseau.sous_reseau_element(noeud_id);
CREATE INDEX IF NOT EXISTS idx_sous_reseau_element_arete ON reseau.sous_reseau_element(arete_id);

-- -----------------------------
-- 5) TRAÇAGE RÉSEAU (JOURNAL DES TRACES)
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.trace_reseau (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                 VARCHAR(30) UNIQUE NOT NULL,
    type_trace           VARCHAR(20) NOT NULL CHECK (type_trace IN ('Amont','Aval','Isolement','Impact_Client')),
    noeud_depart_id      UUID REFERENCES reseau.noeud(id),
    arete_depart_id      UUID REFERENCES reseau.arete(id),
    niveau_reseau        VARCHAR(20) CHECK (niveau_reseau IN ('Transport','Distribution_MT','Distribution_BT','Client')),
    date_execution       TIMESTAMP DEFAULT NOW(),
    utilisateur          VARCHAR(150),
    nb_noeuds_trouves    INT DEFAULT 0,
    nb_aretes_trouvees   INT DEFAULT 0,
    nb_clients_impactes  INT DEFAULT 0,
    energie_estimee_kwh  NUMERIC(14,3),
    observation          TEXT
);

CREATE TABLE IF NOT EXISTS reseau.trace_resultat (
    id               BIGSERIAL PRIMARY KEY,
    trace_id         UUID NOT NULL REFERENCES reseau.trace_reseau(id) ON DELETE CASCADE,
    element_type     VARCHAR(10) NOT NULL CHECK (element_type IN ('Noeud','Arete')),
    noeud_id         UUID REFERENCES reseau.noeud(id),
    arete_id         UUID REFERENCES reseau.arete(id),
    ordre_resultat   INT,
    distance_km      NUMERIC(12,3),
    CHECK (
        (element_type = 'Noeud' AND noeud_id IS NOT NULL AND arete_id IS NULL) OR
        (element_type = 'Arete' AND arete_id IS NOT NULL AND noeud_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_trace_resultat_trace ON reseau.trace_resultat(trace_id);

-- -----------------------------
-- 6) INDEX COMPLÉMENTAIRES
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_noeud_code ON reseau.noeud(code);
CREATE INDEX IF NOT EXISTS idx_arete_code ON reseau.arete(code);
CREATE INDEX IF NOT EXISTS idx_association_code ON reseau.association(code);
CREATE INDEX IF NOT EXISTS idx_troncon_ht_code ON transport.troncon_ht(code);
CREATE INDEX IF NOT EXISTS idx_releve_compteur_code ON client.releve_compteur(code);

CREATE INDEX IF NOT EXISTS idx_regle_connectivite_actif
ON reseau.regle_connectivite(actif, type_noeud_source, type_noeud_cible, type_arete);

-- =============================================================================
-- PHASE 2 — AUTOMATISATION (TRIGGERS) ET TRACE RÉSEAU
-- =============================================================================

-- -----------------------------
-- 7) CODIFICATION DES NOUVELLES TABLES UTILITY NETWORK
-- -----------------------------
INSERT INTO ref.regle_codification (schema_cible, table_cible, prefixe, longueur_sequence, separateur)
VALUES
('reseau', 'terminal',     'TRM', 6, '-'),
('reseau', 'sous_reseau',  'SRE', 6, '-'),
('reseau', 'trace_reseau', 'TRC', 6, '-')
ON CONFLICT (schema_cible, table_cible) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS reseau.seq_terminal_code START 1;
CREATE SEQUENCE IF NOT EXISTS reseau.seq_sous_reseau_code START 1;
CREATE SEQUENCE IF NOT EXISTS reseau.seq_trace_reseau_code START 1;

UPDATE reseau.terminal
SET code = 'TRM-' || LPAD(nextval('reseau.seq_terminal_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE reseau.terminal
    ALTER COLUMN code SET DEFAULT ('TRM-' || LPAD(nextval('reseau.seq_terminal_code')::TEXT, 6, '0'));

UPDATE reseau.sous_reseau
SET code = 'SRE-' || LPAD(nextval('reseau.seq_sous_reseau_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE reseau.sous_reseau
    ALTER COLUMN code SET DEFAULT ('SRE-' || LPAD(nextval('reseau.seq_sous_reseau_code')::TEXT, 6, '0'));

UPDATE reseau.trace_reseau
SET code = 'TRC-' || LPAD(nextval('reseau.seq_trace_reseau_code')::TEXT, 6, '0')
WHERE code IS NULL;

ALTER TABLE reseau.trace_reseau
    ALTER COLUMN code SET DEFAULT ('TRC-' || LPAD(nextval('reseau.seq_trace_reseau_code')::TEXT, 6, '0'));

-- -----------------------------
-- 8) CONTRAINTES DE COHÉRENCE NOEUDS/ARÊTES
-- -----------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_noeud_objet_table_objet_id
ON reseau.noeud(objet_table, objet_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_arete_objet_table_objet_id
ON reseau.arete(objet_table, objet_id);

-- -----------------------------
-- 9) FONCTIONS GÉNÉRIQUES DE SYNCHRONISATION
-- -----------------------------

CREATE OR REPLACE FUNCTION reseau.f_upsert_noeud(
    p_objet_table VARCHAR,
    p_objet_id UUID,
    p_type_noeud VARCHAR,
    p_tier VARCHAR,
    p_geom GEOMETRY
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO reseau.noeud (objet_table, objet_id, type_noeud, tier, geom)
    VALUES (p_objet_table, p_objet_id, p_type_noeud, p_tier, p_geom)
    ON CONFLICT (objet_table, objet_id)
    DO UPDATE SET
        type_noeud = EXCLUDED.type_noeud,
        tier       = EXCLUDED.tier,
        geom       = EXCLUDED.geom
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION reseau.f_delete_noeud(
    p_objet_table VARCHAR,
    p_objet_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM reseau.noeud
    WHERE objet_table = p_objet_table
      AND objet_id    = p_objet_id;
END;
$$;

CREATE OR REPLACE FUNCTION reseau.f_upsert_arete(
    p_objet_table VARCHAR,
    p_objet_id UUID,
    p_type_arete VARCHAR,
    p_tier VARCHAR,
    p_geom GEOMETRY,
    p_noeud_depart UUID,
    p_noeud_arrivee UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO reseau.arete (objet_table, objet_id, type_arete, tier, geom, noeud_depart_id, noeud_arrivee_id)
    VALUES (p_objet_table, p_objet_id, p_type_arete, p_tier, p_geom, p_noeud_depart, p_noeud_arrivee)
    ON CONFLICT (objet_table, objet_id)
    DO UPDATE SET
        type_arete      = EXCLUDED.type_arete,
        tier            = EXCLUDED.tier,
        geom            = EXCLUDED.geom,
        noeud_depart_id = EXCLUDED.noeud_depart_id,
        noeud_arrivee_id= EXCLUDED.noeud_arrivee_id
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION reseau.f_delete_arete(
    p_objet_table VARCHAR,
    p_objet_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM reseau.arete
    WHERE objet_table = p_objet_table
      AND objet_id    = p_objet_id;
END;
$$;

-- -----------------------------
-- 10) TRIGGERS AUTO-ALIMENTATION NOEUDS
-- -----------------------------

CREATE OR REPLACE FUNCTION reseau.trg_sync_noeud_centrale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_noeud('production.centrale', OLD.id);
        RETURN OLD;
    END IF;

    PERFORM reseau.f_upsert_noeud('production.centrale', NEW.id, 'Centrale', 'Production', NEW.geom);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_noeud_centrale ON production.centrale;
CREATE TRIGGER trg_sync_noeud_centrale
AFTER INSERT OR UPDATE OR DELETE ON production.centrale
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_noeud_centrale();

CREATE OR REPLACE FUNCTION reseau.trg_sync_noeud_poste_source()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_noeud('transport.poste_source', OLD.id);
        RETURN OLD;
    END IF;

    PERFORM reseau.f_upsert_noeud('transport.poste_source', NEW.id, 'Poste_Source', 'Transport', NEW.geom);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_noeud_poste_source ON transport.poste_source;
CREATE TRIGGER trg_sync_noeud_poste_source
AFTER INSERT OR UPDATE OR DELETE ON transport.poste_source
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_noeud_poste_source();

CREATE OR REPLACE FUNCTION reseau.trg_sync_noeud_poste_cabine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_noeud('distribution.poste_cabine', OLD.id);
        RETURN OLD;
    END IF;

    PERFORM reseau.f_upsert_noeud('distribution.poste_cabine', NEW.id, 'Poste_Cabine', 'Distribution_MT', NEW.geom);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_noeud_poste_cabine ON distribution.poste_cabine;
CREATE TRIGGER trg_sync_noeud_poste_cabine
AFTER INSERT OR UPDATE OR DELETE ON distribution.poste_cabine
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_noeud_poste_cabine();

CREATE OR REPLACE FUNCTION reseau.trg_sync_noeud_coffret_bt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_noeud('distribution.coffret_bt', OLD.id);
        RETURN OLD;
    END IF;

    PERFORM reseau.f_upsert_noeud('distribution.coffret_bt', NEW.id, 'Coffret_BT', 'Distribution_BT', NEW.geom);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_noeud_coffret_bt ON distribution.coffret_bt;
CREATE TRIGGER trg_sync_noeud_coffret_bt
AFTER INSERT OR UPDATE OR DELETE ON distribution.coffret_bt
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_noeud_coffret_bt();

CREATE OR REPLACE FUNCTION reseau.trg_sync_noeud_compteur()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_noeud_compteur UUID;
    v_noeud_coffret UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT n.id INTO v_noeud_compteur
        FROM reseau.noeud n
        WHERE n.objet_table = 'client.compteur'
          AND n.objet_id = OLD.id;

        DELETE FROM reseau.association
        WHERE type_association = 'Connectivite'
          AND description = 'AUTO: Coffret_BT -> Compteur'
          AND (noeud_cible_id = v_noeud_compteur OR noeud_source_id = v_noeud_compteur);

        PERFORM reseau.f_delete_noeud('client.compteur', OLD.id);
        RETURN OLD;
    END IF;

    v_noeud_compteur := reseau.f_upsert_noeud('client.compteur', NEW.id, 'Compteur', 'Client', NEW.geom);

    IF NEW.coffret_id IS NOT NULL THEN
        SELECT n.id
        INTO v_noeud_coffret
        FROM reseau.noeud n
        WHERE n.objet_table = 'distribution.coffret_bt'
          AND n.objet_id = NEW.coffret_id;

        IF v_noeud_coffret IS NOT NULL THEN
            INSERT INTO reseau.association (type_association, noeud_source_id, noeud_cible_id, description)
            VALUES ('Connectivite', v_noeud_coffret, v_noeud_compteur, 'AUTO: Coffret_BT -> Compteur')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_noeud_compteur ON client.compteur;
CREATE TRIGGER trg_sync_noeud_compteur
AFTER INSERT OR UPDATE OR DELETE ON client.compteur
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_noeud_compteur();

-- -----------------------------
-- 11) TRIGGERS AUTO-ALIMENTATION ARÊTES
-- -----------------------------

CREATE OR REPLACE FUNCTION reseau.trg_sync_arete_ligne_ht()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_noeud_depart UUID;
    v_noeud_arrivee UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_arete('transport.ligne_ht', OLD.id);
        RETURN OLD;
    END IF;

    SELECT n.id INTO v_noeud_depart
    FROM reseau.noeud n
    WHERE n.objet_table = 'transport.poste_source'
      AND n.objet_id = NEW.poste_depart_id;

    SELECT n.id INTO v_noeud_arrivee
    FROM reseau.noeud n
    WHERE n.objet_table = 'transport.poste_source'
      AND n.objet_id = NEW.poste_arrivee_id;

    PERFORM reseau.f_upsert_arete(
        'transport.ligne_ht',
        NEW.id,
        'Ligne_HT',
        'Transport',
        ST_LineMerge(NEW.geom),
        v_noeud_depart,
        v_noeud_arrivee
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_arete_ligne_ht ON transport.ligne_ht;
CREATE TRIGGER trg_sync_arete_ligne_ht
AFTER INSERT OR UPDATE OR DELETE ON transport.ligne_ht
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_arete_ligne_ht();

CREATE OR REPLACE FUNCTION reseau.trg_sync_arete_ligne_mt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_arete('distribution.ligne_mt', OLD.id);
        RETURN OLD;
    END IF;

    PERFORM reseau.f_upsert_arete(
        'distribution.ligne_mt',
        NEW.id,
        'Ligne_MT',
        'Distribution_MT',
        NEW.geom,
        NULL,
        NULL
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_arete_ligne_mt ON distribution.ligne_mt;
CREATE TRIGGER trg_sync_arete_ligne_mt
AFTER INSERT OR UPDATE OR DELETE ON distribution.ligne_mt
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_arete_ligne_mt();

CREATE OR REPLACE FUNCTION reseau.trg_sync_arete_ligne_bt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_arete('distribution.ligne_bt', OLD.id);
        RETURN OLD;
    END IF;

    PERFORM reseau.f_upsert_arete(
        'distribution.ligne_bt',
        NEW.id,
        'Ligne_BT',
        'Distribution_BT',
        NEW.geom,
        NULL,
        NULL
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_arete_ligne_bt ON distribution.ligne_bt;
CREATE TRIGGER trg_sync_arete_ligne_bt
AFTER INSERT OR UPDATE OR DELETE ON distribution.ligne_bt
FOR EACH ROW EXECUTE FUNCTION reseau.trg_sync_arete_ligne_bt();

-- -----------------------------
-- 12) TRIGGER D'ENFORCEMENT DES RÈGLES DE CONNECTIVITÉ
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.trg_check_regle_connectivite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_source VARCHAR(30);
    v_type_cible  VARCHAR(30);
    v_type_arete  VARCHAR(15);
    v_autorise    BOOLEAN;
BEGIN
    IF NEW.type_association NOT IN ('Connectivite', 'Jonction_Milieu') THEN
        RETURN NEW;
    END IF;

    SELECT n.type_noeud INTO v_type_source FROM reseau.noeud n WHERE n.id = NEW.noeud_source_id;
    SELECT n.type_noeud INTO v_type_cible  FROM reseau.noeud n WHERE n.id = NEW.noeud_cible_id;

    IF NEW.arete_source_id IS NOT NULL THEN
        SELECT a.type_arete INTO v_type_arete FROM reseau.arete a WHERE a.id = NEW.arete_source_id;
    END IF;

    SELECT rc.autorise
    INTO v_autorise
    FROM reseau.regle_connectivite rc
    WHERE rc.actif = TRUE
      AND rc.type_association = NEW.type_association
      AND rc.type_noeud_source = v_type_source
      AND rc.type_noeud_cible  = v_type_cible
      AND (rc.type_arete IS NULL OR rc.type_arete = v_type_arete)
    ORDER BY rc.id
    LIMIT 1;

    IF COALESCE(v_autorise, FALSE) = FALSE THEN
        RAISE EXCEPTION
            'Association non autorisée (% -> %) avec arête %',
            COALESCE(v_type_source, 'NULL'),
            COALESCE(v_type_cible, 'NULL'),
            COALESCE(v_type_arete, 'NULL');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_regle_connectivite ON reseau.association;
CREATE TRIGGER trg_check_regle_connectivite
BEFORE INSERT OR UPDATE ON reseau.association
FOR EACH ROW EXECUTE FUNCTION reseau.trg_check_regle_connectivite();

-- -----------------------------
-- 13) FONCTION DE TRACE (AMONT/AVAL)
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.lancer_trace(
    p_noeud_depart UUID,
    p_type_trace VARCHAR,
    p_niveau_reseau VARCHAR DEFAULT NULL,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trace_id UUID;
BEGIN
    INSERT INTO reseau.trace_reseau (type_trace, noeud_depart_id, niveau_reseau, utilisateur)
    VALUES (p_type_trace, p_noeud_depart, p_niveau_reseau, p_utilisateur)
    RETURNING id INTO v_trace_id;

    DELETE FROM reseau.trace_resultat WHERE trace_id = v_trace_id;

    IF p_type_trace = 'Aval' THEN
        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau
            UNION ALL
            SELECT
                a.noeud_arrivee_id,
                a.id,
                p.niveau + 1
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
        SELECT v_trace_id, 'Noeud', q.noeud_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
        FROM parcours q
        WHERE q.noeud_id IS NOT NULL
        GROUP BY q.noeud_id;

        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau
            UNION ALL
            SELECT
                a.noeud_arrivee_id,
                a.id,
                p.niveau + 1
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, arete_id, ordre_resultat)
        SELECT v_trace_id, 'Arete', q.arete_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id)
        FROM parcours q
        WHERE q.arete_id IS NOT NULL
        GROUP BY q.arete_id;

    ELSIF p_type_trace = 'Amont' THEN
        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau
            UNION ALL
            SELECT
                a.noeud_depart_id,
                a.id,
                p.niveau + 1
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_arrivee_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
        SELECT v_trace_id, 'Noeud', q.noeud_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
        FROM parcours q
        WHERE q.noeud_id IS NOT NULL
        GROUP BY q.noeud_id;

        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau
            UNION ALL
            SELECT
                a.noeud_depart_id,
                a.id,
                p.niveau + 1
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_arrivee_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, arete_id, ordre_resultat)
        SELECT v_trace_id, 'Arete', q.arete_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id)
        FROM parcours q
        WHERE q.arete_id IS NOT NULL
        GROUP BY q.arete_id;
    END IF;

    UPDATE reseau.trace_reseau t
    SET nb_noeuds_trouves  = (SELECT COUNT(*) FROM reseau.trace_resultat r WHERE r.trace_id = v_trace_id AND r.element_type = 'Noeud'),
        nb_aretes_trouvees = (SELECT COUNT(*) FROM reseau.trace_resultat r WHERE r.trace_id = v_trace_id AND r.element_type = 'Arete')
    WHERE t.id = v_trace_id;

    RETURN v_trace_id;
END;
$$;

-- -----------------------------
-- 14) INITIALISATION (BACKFILL) DES NOEUDS/ARÊTES EXISTANTS
-- -----------------------------
INSERT INTO reseau.noeud (objet_table, objet_id, type_noeud, tier, geom)
SELECT 'production.centrale', c.id, 'Centrale', 'Production', c.geom
FROM production.centrale c
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_noeud = EXCLUDED.type_noeud,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

INSERT INTO reseau.noeud (objet_table, objet_id, type_noeud, tier, geom)
SELECT 'transport.poste_source', ps.id, 'Poste_Source', 'Transport', ps.geom
FROM transport.poste_source ps
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_noeud = EXCLUDED.type_noeud,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

INSERT INTO reseau.noeud (objet_table, objet_id, type_noeud, tier, geom)
SELECT 'distribution.poste_cabine', pc.id, 'Poste_Cabine', 'Distribution_MT', pc.geom
FROM distribution.poste_cabine pc
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_noeud = EXCLUDED.type_noeud,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

INSERT INTO reseau.noeud (objet_table, objet_id, type_noeud, tier, geom)
SELECT 'distribution.coffret_bt', cbt.id, 'Coffret_BT', 'Distribution_BT', cbt.geom
FROM distribution.coffret_bt cbt
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_noeud = EXCLUDED.type_noeud,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

INSERT INTO reseau.noeud (objet_table, objet_id, type_noeud, tier, geom)
SELECT 'client.compteur', cp.id, 'Compteur', 'Client', cp.geom
FROM client.compteur cp
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_noeud = EXCLUDED.type_noeud,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

INSERT INTO reseau.arete (objet_table, objet_id, type_arete, tier, geom, noeud_depart_id, noeud_arrivee_id)
SELECT
    'transport.ligne_ht',
    lht.id,
    'Ligne_HT',
    'Transport',
    ST_LineMerge(lht.geom),
    nd.id,
    na.id
FROM transport.ligne_ht lht
LEFT JOIN reseau.noeud nd ON nd.objet_table = 'transport.poste_source' AND nd.objet_id = lht.poste_depart_id
LEFT JOIN reseau.noeud na ON na.objet_table = 'transport.poste_source' AND na.objet_id = lht.poste_arrivee_id
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_arete = EXCLUDED.type_arete,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom,
    noeud_depart_id = EXCLUDED.noeud_depart_id,
    noeud_arrivee_id = EXCLUDED.noeud_arrivee_id;

INSERT INTO reseau.arete (objet_table, objet_id, type_arete, tier, geom)
SELECT 'distribution.ligne_mt', lmt.id, 'Ligne_MT', 'Distribution_MT', lmt.geom
FROM distribution.ligne_mt lmt
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_arete = EXCLUDED.type_arete,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

INSERT INTO reseau.arete (objet_table, objet_id, type_arete, tier, geom)
SELECT 'distribution.ligne_bt', lbt.id, 'Ligne_BT', 'Distribution_BT', lbt.geom
FROM distribution.ligne_bt lbt
ON CONFLICT (objet_table, objet_id) DO UPDATE
SET type_arete = EXCLUDED.type_arete,
    tier = EXCLUDED.tier,
    geom = EXCLUDED.geom;

-- =============================================================================
-- PHASE 3 — PROPAGATION SOUS-RÉSEAU + IMPACT CLIENT
-- =============================================================================

-- -----------------------------
-- 15) RECONSTRUCTION AUTOMATIQUE D'UN SOUS-RÉSEAU
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.reconstruire_sous_reseau(
    p_sous_reseau_id UUID,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_noeud UUID;
    v_niveau_reseau VARCHAR(20);
    v_nb_elements INT;
BEGIN
    SELECT sr.source_noeud_id, sr.niveau_reseau
    INTO v_source_noeud, v_niveau_reseau
    FROM reseau.sous_reseau sr
    WHERE sr.id = p_sous_reseau_id;

    IF v_source_noeud IS NULL THEN
        RAISE EXCEPTION 'Sous-réseau % sans source_noeud_id', p_sous_reseau_id;
    END IF;

    DELETE FROM reseau.sous_reseau_element
    WHERE sous_reseau_id = p_sous_reseau_id;

    WITH RECURSIVE parcours AS (
        SELECT
            v_source_noeud::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau,
            0.0::NUMERIC(12,3) AS distance_km
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau,
            p.distance_km + COALESCE(ST_Length(a.geom::geography)/1000.0, 0.0)::NUMERIC(12,3) AS distance_km
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND (v_niveau_reseau IS NULL OR a.tier = v_niveau_reseau)
          AND p.niveau < 200
    )
    INSERT INTO reseau.sous_reseau_element (sous_reseau_id, element_type, noeud_id, ordre_topologique, distance_source_km)
    SELECT
        p_sous_reseau_id,
        'Noeud',
        q.noeud_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id),
        MIN(q.distance_km)
    FROM parcours q
    WHERE q.noeud_id IS NOT NULL
    GROUP BY q.noeud_id;

    WITH RECURSIVE parcours AS (
        SELECT
            v_source_noeud::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau,
            0.0::NUMERIC(12,3) AS distance_km
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau,
            p.distance_km + COALESCE(ST_Length(a.geom::geography)/1000.0, 0.0)::NUMERIC(12,3) AS distance_km
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND (v_niveau_reseau IS NULL OR a.tier = v_niveau_reseau)
          AND p.niveau < 200
    )
    INSERT INTO reseau.sous_reseau_element (sous_reseau_id, element_type, arete_id, ordre_topologique, distance_source_km)
    SELECT
        p_sous_reseau_id,
        'Arete',
        q.arete_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id),
        MIN(q.distance_km)
    FROM parcours q
    WHERE q.arete_id IS NOT NULL
    GROUP BY q.arete_id;

    SELECT COUNT(*)
    INTO v_nb_elements
    FROM reseau.sous_reseau_element e
    WHERE e.sous_reseau_id = p_sous_reseau_id;

    UPDATE reseau.sous_reseau sr
    SET longueur_totale_km = (
            SELECT ROUND(COALESCE(SUM(ST_Length(a.geom::geography))/1000.0, 0.0)::NUMERIC, 3)
            FROM reseau.sous_reseau_element se
            JOIN reseau.arete a ON a.id = se.arete_id
            WHERE se.sous_reseau_id = p_sous_reseau_id
              AND se.element_type = 'Arete'
        )
    WHERE sr.id = p_sous_reseau_id;

    RETURN v_nb_elements;
END;
$$;

-- =============================================================================
-- UN_PARITY_V2 — PARITE FONCTIONNELLE AVANCEE (POSTGRESQL/POSTGIS)
-- =============================================================================

-- -----------------------------
-- A) METAMODELE D'ACTIFS (ASSET GROUP / ASSET TYPE / NETWORK SOURCE)
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.network_source (
    id               SERIAL PRIMARY KEY,
    code             VARCHAR(30) UNIQUE NOT NULL,
    libelle          VARCHAR(120) NOT NULL,
    source_type      VARCHAR(15) NOT NULL CHECK (source_type IN ('Junction','Edge','Container','Structure')),
    schema_table     VARCHAR(80) UNIQUE NOT NULL,
    tier_reseau      VARCHAR(25) CHECK (tier_reseau IN ('Production','Transport','Distribution_MT','Distribution_BT','Client')),
    actif            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS reseau.asset_group (
    id               SERIAL PRIMARY KEY,
    code             VARCHAR(30) UNIQUE NOT NULL,
    libelle          VARCHAR(150) NOT NULL,
    source_id        INT NOT NULL REFERENCES reseau.network_source(id) ON DELETE CASCADE,
    actif            BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (source_id, code)
);

CREATE TABLE IF NOT EXISTS reseau.asset_type (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(40) UNIQUE NOT NULL,
    libelle               VARCHAR(180) NOT NULL,
    asset_group_id        INT NOT NULL REFERENCES reseau.asset_group(id) ON DELETE CASCADE,
    tension_min_kv        NUMERIC(8,2),
    tension_max_kv        NUMERIC(8,2),
    terminal_count        SMALLINT NOT NULL DEFAULT 2 CHECK (terminal_count BETWEEN 1 AND 12),
    traversable_defaut    BOOLEAN NOT NULL DEFAULT TRUE,
    interrupteur          BOOLEAN NOT NULL DEFAULT FALSE,
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (asset_group_id, code)
);

CREATE TABLE IF NOT EXISTS reseau.terminal_configuration (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(40) UNIQUE NOT NULL,
    asset_type_id         INT NOT NULL REFERENCES reseau.asset_type(id) ON DELETE CASCADE,
    rang_terminal         SMALLINT NOT NULL CHECK (rang_terminal BETWEEN 1 AND 12),
    nom_terminal          VARCHAR(80) NOT NULL,
    direction_flux        VARCHAR(20) NOT NULL CHECK (direction_flux IN ('Entree','Sortie','Bidirectionnel','Terre')),
    phase_autorisee       VARCHAR(10) CHECK (phase_autorisee IN ('A','B','C','AB','BC','CA','ABC')),
    est_principal         BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (asset_type_id, rang_terminal),
    UNIQUE (asset_type_id, nom_terminal)
);

CREATE TABLE IF NOT EXISTS reseau.asset_object (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(40) UNIQUE NOT NULL,
    network_source_id     INT NOT NULL REFERENCES reseau.network_source(id),
    objet_table           VARCHAR(80) NOT NULL,
    objet_id              UUID NOT NULL,
    asset_group_id        INT NOT NULL REFERENCES reseau.asset_group(id),
    asset_type_id         INT NOT NULL REFERENCES reseau.asset_type(id),
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation         TIMESTAMP DEFAULT NOW(),
    date_modification     TIMESTAMP DEFAULT NOW(),
    UNIQUE (objet_table, objet_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_object_source ON reseau.asset_object(network_source_id);
CREATE INDEX IF NOT EXISTS idx_asset_object_group_type ON reseau.asset_object(asset_group_id, asset_type_id);

-- Codification meta-actifs
INSERT INTO ref.regle_codification (schema_cible, table_cible, prefixe, longueur_sequence, separateur)
VALUES
('reseau', 'network_source',         'NSR', 4, '-'),
('reseau', 'asset_group',            'AGP', 4, '-'),
('reseau', 'asset_type',             'ATP', 5, '-'),
('reseau', 'terminal_configuration', 'TCF', 6, '-'),
('reseau', 'asset_object',           'AOB', 7, '-')
ON CONFLICT (schema_cible, table_cible) DO NOTHING;

-- Sources reseau
INSERT INTO reseau.network_source (code, libelle, source_type, schema_table, tier_reseau)
VALUES
('NSR-HT_LINE',   'Ligne Haute Tension',        'Edge',      'transport.ligne_ht',          'Transport'),
('NSR-MT_LINE',   'Ligne Moyenne Tension',      'Edge',      'distribution.ligne_mt',       'Distribution_MT'),
('NSR-BT_LINE',   'Ligne Basse Tension',        'Edge',      'distribution.ligne_bt',       'Distribution_BT'),
('NSR-POSTE_SRC', 'Poste Source',               'Junction',  'transport.poste_source',      'Transport'),
('NSR-CABINE',    'Poste Cabine',               'Junction',  'distribution.poste_cabine',   'Distribution_MT'),
('NSR-COFFRET',   'Coffret BT',                 'Junction',  'distribution.coffret_bt',     'Distribution_BT'),
('NSR-COMPTEUR',  'Compteur',                   'Junction',  'client.compteur',             'Client'),
('NSR-APP-HT',    'Appareillage HT',            'Junction',  'transport.appareillage_ht',   'Transport'),
('NSR-APP-MT',    'Appareillage MT',            'Junction',  'distribution.appareillage_mt','Distribution_MT')
ON CONFLICT (code) DO NOTHING;

-- Groupes d'actifs
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-LINE-HT', 'Lignes HT', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-HT_LINE'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-LINE-MT', 'Lignes MT', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-MT_LINE'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-LINE-BT', 'Lignes BT', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-BT_LINE'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-POSTE-SRC', 'Postes Sources', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-POSTE_SRC'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-CABINE', 'Postes Cabines', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-CABINE'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-COFFRET', 'Coffrets BT', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-COFFRET'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-COMPTEUR', 'Compteurs', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-COMPTEUR'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-SWITCH-HT', 'Appareillage HT', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-APP-HT'
ON CONFLICT (code) DO NOTHING;
INSERT INTO reseau.asset_group (code, libelle, source_id)
SELECT 'AGP-SWITCH-MT', 'Appareillage MT', ns.id FROM reseau.network_source ns WHERE ns.code = 'NSR-APP-MT'
ON CONFLICT (code) DO NOTHING;

-- Types d'actifs (echantillon ope)
INSERT INTO reseau.asset_type (code, libelle, asset_group_id, tension_min_kv, tension_max_kv, terminal_count, traversable_defaut, interrupteur)
SELECT 'ATP-LINE-HT-STD', 'Ligne HT standard', ag.id, 33.0, 225.0, 2, TRUE, FALSE
FROM reseau.asset_group ag WHERE ag.code = 'AGP-LINE-HT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.asset_type (code, libelle, asset_group_id, tension_min_kv, tension_max_kv, terminal_count, traversable_defaut, interrupteur)
SELECT 'ATP-LINE-MT-STD', 'Ligne MT standard', ag.id, 15.0, 33.0, 2, TRUE, FALSE
FROM reseau.asset_group ag WHERE ag.code = 'AGP-LINE-MT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.asset_type (code, libelle, asset_group_id, tension_min_kv, tension_max_kv, terminal_count, traversable_defaut, interrupteur)
SELECT 'ATP-LINE-BT-STD', 'Ligne BT standard', ag.id, 0.22, 0.40, 2, TRUE, FALSE
FROM reseau.asset_group ag WHERE ag.code = 'AGP-LINE-BT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.asset_type (code, libelle, asset_group_id, tension_min_kv, tension_max_kv, terminal_count, traversable_defaut, interrupteur)
SELECT 'ATP-SWITCH-HT-BREAKER', 'Disjoncteur HT', ag.id, 33.0, 225.0, 2, FALSE, TRUE
FROM reseau.asset_group ag WHERE ag.code = 'AGP-SWITCH-HT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.asset_type (code, libelle, asset_group_id, tension_min_kv, tension_max_kv, terminal_count, traversable_defaut, interrupteur)
SELECT 'ATP-SWITCH-MT-RECLOSER', 'Recloser MT', ag.id, 15.0, 33.0, 2, FALSE, TRUE
FROM reseau.asset_group ag WHERE ag.code = 'AGP-SWITCH-MT'
ON CONFLICT (code) DO NOTHING;

-- Terminaux par defaut
INSERT INTO reseau.terminal_configuration (code, asset_type_id, rang_terminal, nom_terminal, direction_flux, est_principal)
SELECT 'TCF-LINE-IN', at.id, 1, 'IN', 'Bidirectionnel', TRUE
FROM reseau.asset_type at
WHERE at.code IN ('ATP-LINE-HT-STD','ATP-LINE-MT-STD','ATP-LINE-BT-STD')
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.terminal_configuration (code, asset_type_id, rang_terminal, nom_terminal, direction_flux, est_principal)
SELECT 'TCF-LINE-OUT', at.id, 2, 'OUT', 'Bidirectionnel', FALSE
FROM reseau.asset_type at
WHERE at.code IN ('ATP-LINE-HT-STD','ATP-LINE-MT-STD','ATP-LINE-BT-STD')
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.terminal_configuration (code, asset_type_id, rang_terminal, nom_terminal, direction_flux, est_principal)
SELECT 'TCF-SW-IN', at.id, 1, 'SOURCE', 'Entree', TRUE
FROM reseau.asset_type at
WHERE at.code IN ('ATP-SWITCH-HT-BREAKER','ATP-SWITCH-MT-RECLOSER')
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.terminal_configuration (code, asset_type_id, rang_terminal, nom_terminal, direction_flux, est_principal)
SELECT 'TCF-SW-OUT', at.id, 2, 'LOAD', 'Sortie', FALSE
FROM reseau.asset_type at
WHERE at.code IN ('ATP-SWITCH-HT-BREAKER','ATP-SWITCH-MT-RECLOSER')
ON CONFLICT (code) DO NOTHING;

-- Rattachement des objets metier au catalogue d'actifs
INSERT INTO reseau.asset_object (code, network_source_id, objet_table, objet_id, asset_group_id, asset_type_id)
SELECT
    'AOB-' || LPAD((ROW_NUMBER() OVER (ORDER BY l.id))::TEXT, 7, '0'),
    ns.id, 'transport.ligne_ht', l.id, ag.id, at.id
FROM transport.ligne_ht l
JOIN reseau.network_source ns ON ns.code = 'NSR-HT_LINE'
JOIN reseau.asset_group ag ON ag.code = 'AGP-LINE-HT'
JOIN reseau.asset_type at ON at.code = 'ATP-LINE-HT-STD'
ON CONFLICT (objet_table, objet_id) DO NOTHING;

INSERT INTO reseau.asset_object (code, network_source_id, objet_table, objet_id, asset_group_id, asset_type_id)
SELECT
    'AOB-' || LPAD((ROW_NUMBER() OVER (ORDER BY l.id) + 1000000)::TEXT, 7, '0'),
    ns.id, 'distribution.ligne_mt', l.id, ag.id, at.id
FROM distribution.ligne_mt l
JOIN reseau.network_source ns ON ns.code = 'NSR-MT_LINE'
JOIN reseau.asset_group ag ON ag.code = 'AGP-LINE-MT'
JOIN reseau.asset_type at ON at.code = 'ATP-LINE-MT-STD'
ON CONFLICT (objet_table, objet_id) DO NOTHING;

INSERT INTO reseau.asset_object (code, network_source_id, objet_table, objet_id, asset_group_id, asset_type_id)
SELECT
    'AOB-' || LPAD((ROW_NUMBER() OVER (ORDER BY l.id) + 2000000)::TEXT, 7, '0'),
    ns.id, 'distribution.ligne_bt', l.id, ag.id, at.id
FROM distribution.ligne_bt l
JOIN reseau.network_source ns ON ns.code = 'NSR-BT_LINE'
JOIN reseau.asset_group ag ON ag.code = 'AGP-LINE-BT'
JOIN reseau.asset_type at ON at.code = 'ATP-LINE-BT-STD'
ON CONFLICT (objet_table, objet_id) DO NOTHING;

-- -----------------------------
-- B) REGLES AVANCEES CONNECTIVITE / CONTENANCE / STRUCTURE / ATTACHEMENT
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.regle_contenance (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(30) UNIQUE NOT NULL,
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    container_type_noeud  VARCHAR(30) NOT NULL,
    content_type_noeud    VARCHAR(30) NOT NULL,
    cardinalite_max       INT,
    description           TEXT
);

CREATE TABLE IF NOT EXISTS reseau.regle_structure (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(30) UNIQUE NOT NULL,
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    support_type_noeud    VARCHAR(30) NOT NULL,
    attached_type_noeud   VARCHAR(30) NOT NULL,
    description           TEXT
);

CREATE TABLE IF NOT EXISTS reseau.regle_attachment (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(30) UNIQUE NOT NULL,
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    parent_type_noeud     VARCHAR(30) NOT NULL,
    enfant_type_noeud     VARCHAR(30) NOT NULL,
    description           TEXT
);

INSERT INTO reseau.regle_contenance (code, container_type_noeud, content_type_noeud, cardinalite_max, description)
VALUES
('RCONT-PS-CELL', 'Poste_Source', 'Appareillage_HT', 500, 'Poste source contient appareillage HT'),
('RCONT-CAB-SW',  'Poste_Cabine', 'Appareillage_MT', 200, 'Cabine contient appareillage MT')
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.regle_structure (code, support_type_noeud, attached_type_noeud, description)
VALUES
('RSTR-PYL-LHT', 'Pylone', 'Appareillage_HT', 'Support pylone pour appareillage HT'),
('RSTR-SMT-AMT', 'Support_MT', 'Appareillage_MT', 'Support MT pour appareillage MT')
ON CONFLICT (code) DO NOTHING;

INSERT INTO reseau.regle_attachment (code, parent_type_noeud, enfant_type_noeud, description)
VALUES
('RATT-CBT-CPT', 'Coffret_BT', 'Compteur', 'Compteur attache a coffret BT')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION reseau.trg_check_regles_association_un()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_source VARCHAR(30);
    v_type_cible  VARCHAR(30);
    v_count       INT;
BEGIN
    SELECT type_noeud INTO v_type_source FROM reseau.noeud WHERE id = NEW.noeud_source_id;
    SELECT type_noeud INTO v_type_cible  FROM reseau.noeud WHERE id = NEW.noeud_cible_id;

    IF NEW.type_association = 'Contenance' THEN
        IF NOT EXISTS (
            SELECT 1 FROM reseau.regle_contenance rc
            WHERE rc.actif = TRUE
              AND rc.container_type_noeud = v_type_source
              AND rc.content_type_noeud = v_type_cible
        ) THEN
            RAISE EXCEPTION 'Regle de contenance non autorisee: % -> %', v_type_source, v_type_cible;
        END IF;

        SELECT COUNT(*)
        INTO v_count
        FROM reseau.association a
        WHERE a.type_association = 'Contenance'
          AND a.noeud_source_id = NEW.noeud_source_id;

        IF EXISTS (
            SELECT 1 FROM reseau.regle_contenance rc
            WHERE rc.actif = TRUE
              AND rc.container_type_noeud = v_type_source
              AND rc.content_type_noeud = v_type_cible
              AND rc.cardinalite_max IS NOT NULL
              AND v_count >= rc.cardinalite_max
        ) THEN
            RAISE EXCEPTION 'Cardinalite contenance depassee pour %', v_type_source;
        END IF;
    ELSIF NEW.type_association = 'Structurelle' THEN
        IF NOT EXISTS (
            SELECT 1 FROM reseau.regle_structure rs
            WHERE rs.actif = TRUE
              AND rs.support_type_noeud = v_type_source
              AND rs.attached_type_noeud = v_type_cible
        ) THEN
            RAISE EXCEPTION 'Regle structurelle non autorisee: % -> %', v_type_source, v_type_cible;
        END IF;
    ELSIF NEW.type_association = 'Attachment' THEN
        IF NOT EXISTS (
            SELECT 1 FROM reseau.regle_attachment ra
            WHERE ra.actif = TRUE
              AND ra.parent_type_noeud = v_type_source
              AND ra.enfant_type_noeud = v_type_cible
        ) THEN
            RAISE EXCEPTION 'Regle attachment non autorisee: % -> %', v_type_source, v_type_cible;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_regles_association_un ON reseau.association;
CREATE TRIGGER trg_check_regles_association_un
BEFORE INSERT OR UPDATE ON reseau.association
FOR EACH ROW EXECUTE FUNCTION reseau.trg_check_regles_association_un();

-- -----------------------------
-- C) DIRTY AREAS + VALIDATION TOPOLOGIQUE
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.dirty_area (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(40) UNIQUE NOT NULL,
    objet_table       VARCHAR(80) NOT NULL,
    objet_id          UUID NOT NULL,
    operation_type    VARCHAR(10) NOT NULL CHECK (operation_type IN ('INSERT','UPDATE','DELETE')),
    geom              GEOMETRY(GEOMETRY, 4326),
    statut            VARCHAR(12) NOT NULL DEFAULT 'Open' CHECK (statut IN ('Open','Validated','Error')),
    date_creation     TIMESTAMP DEFAULT NOW(),
    date_validation   TIMESTAMP,
    details           TEXT
);

CREATE TABLE IF NOT EXISTS reseau.validation_anomalie (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(40) UNIQUE NOT NULL,
    anomalie_type     VARCHAR(40) NOT NULL,
    severite          VARCHAR(10) NOT NULL CHECK (severite IN ('Info','Warning','Error')),
    objet_table       VARCHAR(80),
    objet_id          UUID,
    details           TEXT,
    geom              GEOMETRY(GEOMETRY, 4326),
    date_creation     TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS reseau.seq_dirty_area_code START 1;
CREATE SEQUENCE IF NOT EXISTS reseau.seq_validation_anomalie_code START 1;

CREATE OR REPLACE FUNCTION reseau.f_add_dirty_area(
    p_objet_table VARCHAR,
    p_objet_id UUID,
    p_operation_type VARCHAR,
    p_geom GEOMETRY,
    p_details TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO reseau.dirty_area (code, objet_table, objet_id, operation_type, geom, details)
    VALUES (
        'DTA-' || LPAD(nextval('reseau.seq_dirty_area_code')::TEXT, 8, '0'),
        p_objet_table,
        p_objet_id,
        p_operation_type,
        p_geom,
        p_details
    );
END;
$$;

CREATE OR REPLACE FUNCTION reseau.trg_mark_dirty_ligne_ht()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_add_dirty_area('transport.ligne_ht', OLD.id, 'DELETE', OLD.geom, 'Mutation ligne HT');
        RETURN OLD;
    END IF;
    PERFORM reseau.f_add_dirty_area('transport.ligne_ht', NEW.id, TG_OP, NEW.geom, 'Mutation ligne HT');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_dirty_ligne_ht ON transport.ligne_ht;
CREATE TRIGGER trg_mark_dirty_ligne_ht
AFTER INSERT OR UPDATE OR DELETE ON transport.ligne_ht
FOR EACH ROW EXECUTE FUNCTION reseau.trg_mark_dirty_ligne_ht();

CREATE OR REPLACE FUNCTION reseau.trg_mark_dirty_ligne_mt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_add_dirty_area('distribution.ligne_mt', OLD.id, 'DELETE', OLD.geom, 'Mutation ligne MT');
        RETURN OLD;
    END IF;
    PERFORM reseau.f_add_dirty_area('distribution.ligne_mt', NEW.id, TG_OP, NEW.geom, 'Mutation ligne MT');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_dirty_ligne_mt ON distribution.ligne_mt;
CREATE TRIGGER trg_mark_dirty_ligne_mt
AFTER INSERT OR UPDATE OR DELETE ON distribution.ligne_mt
FOR EACH ROW EXECUTE FUNCTION reseau.trg_mark_dirty_ligne_mt();

CREATE OR REPLACE FUNCTION reseau.trg_mark_dirty_ligne_bt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_add_dirty_area('distribution.ligne_bt', OLD.id, 'DELETE', OLD.geom, 'Mutation ligne BT');
        RETURN OLD;
    END IF;
    PERFORM reseau.f_add_dirty_area('distribution.ligne_bt', NEW.id, TG_OP, NEW.geom, 'Mutation ligne BT');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_dirty_ligne_bt ON distribution.ligne_bt;
CREATE TRIGGER trg_mark_dirty_ligne_bt
AFTER INSERT OR UPDATE OR DELETE ON distribution.ligne_bt
FOR EACH ROW EXECUTE FUNCTION reseau.trg_mark_dirty_ligne_bt();

CREATE OR REPLACE FUNCTION reseau.valider_topologie_reseau(
    p_max_records INT DEFAULT 10000
)
RETURNS TABLE(
    nb_dirty_traites INT,
    nb_anomalies INT,
    nb_dirty_valides INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_nb_dirty INT := 0;
    v_nb_anomalies INT := 0;
    v_nb_valides INT := 0;
BEGIN
    -- Regle 1: aretes traversables doivent avoir 2 endpoints
    INSERT INTO reseau.validation_anomalie (code, anomalie_type, severite, objet_table, objet_id, details, geom)
    SELECT
        'VAL-' || LPAD(nextval('reseau.seq_validation_anomalie_code')::TEXT, 8, '0'),
        'EdgeEndpointMissing',
        'Error',
        a.objet_table,
        a.objet_id,
        'Arete traversable sans endpoints complets',
        a.geom
    FROM reseau.arete a
    WHERE a.traversable = TRUE
      AND (a.noeud_depart_id IS NULL OR a.noeud_arrivee_id IS NULL);

    GET DIAGNOSTICS v_nb_anomalies = ROW_COUNT;

    -- Regle 2: associations connectivite doivent avoir source/cible
    INSERT INTO reseau.validation_anomalie (code, anomalie_type, severite, objet_table, objet_id, details)
    SELECT
        'VAL-' || LPAD(nextval('reseau.seq_validation_anomalie_code')::TEXT, 8, '0'),
        'AssociationEndpointMissing',
        'Error',
        'reseau.association',
        NULL,
        'Association connectivite sans noeud source/cible'
    FROM reseau.association s
    WHERE s.type_association = 'Connectivite'
      AND (s.noeud_source_id IS NULL OR s.noeud_cible_id IS NULL);

    GET DIAGNOSTICS v_nb_dirty = ROW_COUNT;
    v_nb_anomalies := v_nb_anomalies + v_nb_dirty;

    -- Traitement des dirty areas ouvertes
    UPDATE reseau.dirty_area d
    SET statut = CASE WHEN EXISTS (
            SELECT 1
            FROM reseau.validation_anomalie va
            WHERE va.objet_table = d.objet_table
              AND va.objet_id = d.objet_id
              AND va.date_creation >= NOW() - INTERVAL '1 day'
        ) THEN 'Error' ELSE 'Validated' END,
        date_validation = NOW()
    WHERE d.statut = 'Open'
      AND d.id IN (
            SELECT id FROM reseau.dirty_area
            WHERE statut = 'Open'
            ORDER BY id
            LIMIT p_max_records
      );

    GET DIAGNOSTICS v_nb_valides = ROW_COUNT;

    nb_dirty_traites := v_nb_valides;
    nb_anomalies := v_nb_anomalies;
    nb_dirty_valides := (SELECT COUNT(*) FROM reseau.dirty_area WHERE statut = 'Validated' AND date_validation >= NOW() - INTERVAL '5 minutes');
    RETURN NEXT;
END;
$$;

-- -----------------------------
-- D) SUBNETWORK CONTROLLER + RECALCUL INCREMENTAL
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.subnetwork_controller (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                  VARCHAR(40) UNIQUE NOT NULL,
    sous_reseau_id        UUID NOT NULL REFERENCES reseau.sous_reseau(id) ON DELETE CASCADE,
    noeud_id              UUID NOT NULL REFERENCES reseau.noeud(id),
    terminal_rang         SMALLINT NOT NULL DEFAULT 1,
    statut_id             INT REFERENCES ref.domaine_statut(id),
    est_principal         BOOLEAN NOT NULL DEFAULT FALSE,
    actif                 BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation         TIMESTAMP DEFAULT NOW(),
    UNIQUE (sous_reseau_id, noeud_id, terminal_rang)
);

CREATE SEQUENCE IF NOT EXISTS reseau.seq_subnetwork_controller_code START 1;

CREATE OR REPLACE FUNCTION reseau.f_recalcul_subnetwork_incremental(
    p_objet_table VARCHAR,
    p_objet_id UUID
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    WITH impacted AS (
        SELECT DISTINCT sr.id AS sous_reseau_id
        FROM reseau.sous_reseau sr
        LEFT JOIN reseau.subnetwork_controller sc ON sc.sous_reseau_id = sr.id
        LEFT JOIN reseau.noeud n ON n.id = sc.noeud_id
        WHERE n.objet_table = p_objet_table
          AND n.objet_id = p_objet_id
        UNION
        SELECT DISTINCT sr.id
        FROM reseau.sous_reseau sr
        JOIN reseau.sous_reseau_element se ON se.sous_reseau_id = sr.id
        JOIN reseau.arete a ON a.id = se.arete_id
        WHERE a.objet_table = p_objet_table
          AND a.objet_id = p_objet_id
    )
    SELECT COUNT(*) INTO v_count FROM impacted;

    PERFORM reseau.reconstruire_sous_reseau(i.sous_reseau_id, CURRENT_USER)
    FROM (
        SELECT DISTINCT sr.id AS sous_reseau_id
        FROM reseau.sous_reseau sr
        LEFT JOIN reseau.subnetwork_controller sc ON sc.sous_reseau_id = sr.id
        LEFT JOIN reseau.noeud n ON n.id = sc.noeud_id
        WHERE n.objet_table = p_objet_table
          AND n.objet_id = p_objet_id
        UNION
        SELECT DISTINCT sr.id
        FROM reseau.sous_reseau sr
        JOIN reseau.sous_reseau_element se ON se.sous_reseau_id = sr.id
        JOIN reseau.arete a ON a.id = se.arete_id
        WHERE a.objet_table = p_objet_table
          AND a.objet_id = p_objet_id
    ) i;

    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION reseau.trg_recalc_subnetwork_ligne_ht()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_recalcul_subnetwork_incremental('transport.ligne_ht', OLD.id);
        RETURN OLD;
    END IF;
    PERFORM reseau.f_recalcul_subnetwork_incremental('transport.ligne_ht', NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_subnetwork_ligne_ht ON transport.ligne_ht;
CREATE TRIGGER trg_recalc_subnetwork_ligne_ht
AFTER INSERT OR UPDATE OR DELETE ON transport.ligne_ht
FOR EACH ROW EXECUTE FUNCTION reseau.trg_recalc_subnetwork_ligne_ht();

-- -----------------------------
-- E) TRACE AVANCEE (BARRIERES + ETAT APPAREILLAGE + PHASE)
-- -----------------------------
CREATE TABLE IF NOT EXISTS reseau.trace_barriere (
    id                    BIGSERIAL PRIMARY KEY,
    trace_id              UUID NOT NULL REFERENCES reseau.trace_reseau(id) ON DELETE CASCADE,
    barriere_type         VARCHAR(20) NOT NULL CHECK (barriere_type IN ('Noeud','Arete','Condition')),
    noeud_id              UUID REFERENCES reseau.noeud(id),
    arete_id              UUID REFERENCES reseau.arete(id),
    condition_sql         TEXT,
    description           TEXT
);

CREATE TABLE IF NOT EXISTS reseau.trace_configuration (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                  VARCHAR(40) UNIQUE NOT NULL,
    max_depth             INT NOT NULL DEFAULT 200 CHECK (max_depth BETWEEN 1 AND 5000),
    ignorer_ouvert        BOOLEAN NOT NULL DEFAULT FALSE,
    phase_cible           VARCHAR(10) CHECK (phase_cible IN ('A','B','C','AB','BC','CA','ABC')),
    include_containment   BOOLEAN NOT NULL DEFAULT FALSE,
    include_structure     BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation         TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION reseau.f_arete_est_bloquee_par_appareillage(
    p_arete_id UUID,
    p_ignorer_ouvert BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_bloque BOOLEAN := FALSE;
BEGIN
    IF p_ignorer_ouvert THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM reseau.association s
        JOIN reseau.noeud n ON n.id = s.noeud_cible_id
        LEFT JOIN transport.appareillage_ht aht ON n.objet_table = 'transport.appareillage_ht' AND n.objet_id = aht.id
        LEFT JOIN distribution.appareillage_mt amt ON n.objet_table = 'distribution.appareillage_mt' AND n.objet_id = amt.id
        WHERE s.type_association = 'Connectivite'
          AND s.arete_source_id = p_arete_id
          AND (
                (aht.id IS NOT NULL AND COALESCE(aht.etat_actuel, 'Fermé') = 'Ouvert')
             OR (amt.id IS NOT NULL AND COALESCE(amt.etat_actuel, 'Fermé') = 'Ouvert')
          )
    ) THEN
        v_bloque := TRUE;
    END IF;

    RETURN v_bloque;
END;
$$;

CREATE OR REPLACE FUNCTION reseau.lancer_trace_avancee(
    p_noeud_depart UUID,
    p_type_trace VARCHAR,
    p_trace_config_id UUID DEFAULT NULL,
    p_niveau_reseau VARCHAR DEFAULT NULL,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trace_id UUID;
    v_max_depth INT := 200;
    v_ignorer_ouvert BOOLEAN := FALSE;
BEGIN
    IF p_trace_config_id IS NOT NULL THEN
        SELECT tc.max_depth, tc.ignorer_ouvert
        INTO v_max_depth, v_ignorer_ouvert
        FROM reseau.trace_configuration tc
        WHERE tc.id = p_trace_config_id;
    END IF;

    INSERT INTO reseau.trace_reseau (type_trace, noeud_depart_id, niveau_reseau, utilisateur, observation)
    VALUES (p_type_trace, p_noeud_depart, p_niveau_reseau, p_utilisateur, 'Trace avancee')
    RETURNING id INTO v_trace_id;

    IF p_type_trace IN ('Aval','Impact_Client') THEN
        WITH RECURSIVE parcours AS (
            SELECT p_noeud_depart::UUID AS noeud_id, NULL::UUID AS arete_id, 0 AS niveau, ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
            UNION ALL
            SELECT a.noeud_arrivee_id, a.id, p.niveau + 1, p.chemin_noeuds || a.noeud_arrivee_id
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND a.noeud_arrivee_id IS NOT NULL
              AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
              AND NOT EXISTS (SELECT 1 FROM reseau.trace_barriere b WHERE b.trace_id = v_trace_id AND b.arete_id = a.id)
              AND NOT reseau.f_arete_est_bloquee_par_appareillage(a.id, v_ignorer_ouvert)
              AND p.niveau < v_max_depth
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
        SELECT v_trace_id, 'Noeud', q.noeud_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
        FROM parcours q
        GROUP BY q.noeud_id;
    ELSE
        WITH RECURSIVE parcours AS (
            SELECT p_noeud_depart::UUID AS noeud_id, NULL::UUID AS arete_id, 0 AS niveau, ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
            UNION ALL
            SELECT a.noeud_depart_id, a.id, p.niveau + 1, p.chemin_noeuds || a.noeud_depart_id
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_arrivee_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND a.sens_circulation IN ('Aval-Amont', 'Bidirectionnel')
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND a.noeud_depart_id IS NOT NULL
              AND NOT (a.noeud_depart_id = ANY(p.chemin_noeuds))
              AND NOT EXISTS (SELECT 1 FROM reseau.trace_barriere b WHERE b.trace_id = v_trace_id AND b.arete_id = a.id)
              AND NOT reseau.f_arete_est_bloquee_par_appareillage(a.id, v_ignorer_ouvert)
              AND p.niveau < v_max_depth
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
        SELECT v_trace_id, 'Noeud', q.noeud_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
        FROM parcours q
        GROUP BY q.noeud_id;
    END IF;

    UPDATE reseau.trace_reseau t
    SET nb_noeuds_trouves = (SELECT COUNT(*) FROM reseau.trace_resultat r WHERE r.trace_id = v_trace_id AND r.element_type = 'Noeud'),
        nb_clients_impactes = (
            SELECT COUNT(DISTINCT c.id)
            FROM reseau.trace_resultat r
            JOIN reseau.noeud n ON n.id = r.noeud_id
            JOIN client.compteur c ON c.id = n.objet_id
            WHERE r.trace_id = v_trace_id
              AND n.objet_table = 'client.compteur'
        )
    WHERE t.id = v_trace_id;

    RETURN v_trace_id;
END;
$$;

-- -----------------------------
-- F) QA / DIAGNOSTICS / TESTS D'ACCEPTATION
-- -----------------------------
CREATE OR REPLACE VIEW reseau.v_qa_connectivite AS
SELECT
    COUNT(*) FILTER (WHERE a.traversable = TRUE AND (a.noeud_depart_id IS NULL OR a.noeud_arrivee_id IS NULL)) AS nb_aretes_endpoint_incomplet,
    COUNT(*) FILTER (WHERE a.traversable = TRUE) AS nb_aretes_traversables,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.traversable = TRUE AND a.noeud_depart_id IS NOT NULL AND a.noeud_arrivee_id IS NOT NULL)
        / NULLIF(COUNT(*) FILTER (WHERE a.traversable = TRUE),0), 2
    ) AS taux_aretes_completes_pct
FROM reseau.arete a;

CREATE OR REPLACE VIEW reseau.v_qa_codification AS
SELECT
    'reseau.noeud' AS table_name,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE code IS NULL OR code = '') AS sans_code
FROM reseau.noeud
UNION ALL
SELECT 'reseau.arete', COUNT(*), COUNT(*) FILTER (WHERE code IS NULL OR code = '')
FROM reseau.arete
UNION ALL
SELECT 'reseau.association', COUNT(*), COUNT(*) FILTER (WHERE code IS NULL OR code = '')
FROM reseau.association
UNION ALL
SELECT 'reseau.trace_reseau', COUNT(*), COUNT(*) FILTER (WHERE code IS NULL OR code = '')
FROM reseau.trace_reseau;

CREATE OR REPLACE VIEW reseau.v_qa_anomalies_recentes AS
SELECT
    anomalie_type,
    severite,
    COUNT(*) AS nb,
    MIN(date_creation) AS premiere_occurrence,
    MAX(date_creation) AS derniere_occurrence
FROM reseau.validation_anomalie
WHERE date_creation >= NOW() - INTERVAL '7 day'
GROUP BY anomalie_type, severite
ORDER BY nb DESC;

CREATE TABLE IF NOT EXISTS reseau.test_acceptance_result (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(40) UNIQUE NOT NULL,
    test_name         VARCHAR(120) NOT NULL,
    statut            VARCHAR(10) NOT NULL CHECK (statut IN ('PASS','FAIL')),
    details           TEXT,
    date_execution    TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS reseau.seq_test_acceptance_code START 1;

CREATE OR REPLACE FUNCTION reseau.run_acceptance_tests()
RETURNS TABLE(test_name VARCHAR, statut VARCHAR, details TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    -- Test 1: endpoint complets
    SELECT COUNT(*) INTO v_count
    FROM reseau.arete a
    WHERE a.traversable = TRUE
      AND (a.noeud_depart_id IS NULL OR a.noeud_arrivee_id IS NULL);

    INSERT INTO reseau.test_acceptance_result (code, test_name, statut, details)
    VALUES (
        'TST-' || LPAD(nextval('reseau.seq_test_acceptance_code')::TEXT, 8, '0'),
        'AretteTraversableEndpointsComplets',
        CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Nombre aretes en erreur: ' || v_count
    );

    test_name := 'AretteTraversableEndpointsComplets';
    statut := CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END;
    details := 'Nombre aretes en erreur: ' || v_count;
    RETURN NEXT;

    -- Test 2: codification noeuds
    SELECT COUNT(*) INTO v_count
    FROM reseau.noeud
    WHERE code IS NULL OR code = '';

    INSERT INTO reseau.test_acceptance_result (code, test_name, statut, details)
    VALUES (
        'TST-' || LPAD(nextval('reseau.seq_test_acceptance_code')::TEXT, 8, '0'),
        'NoeudCodeNonNull',
        CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Nombre noeuds sans code: ' || v_count
    );

    test_name := 'NoeudCodeNonNull';
    statut := CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END;
    details := 'Nombre noeuds sans code: ' || v_count;
    RETURN NEXT;

    -- Test 3: regles connectivite actives
    SELECT COUNT(*) INTO v_count
    FROM reseau.regle_connectivite
    WHERE actif = TRUE;

    INSERT INTO reseau.test_acceptance_result (code, test_name, statut, details)
    VALUES (
        'TST-' || LPAD(nextval('reseau.seq_test_acceptance_code')::TEXT, 8, '0'),
        'ReglesConnectiviteActives',
        CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END,
        'Nombre regles actives: ' || v_count
    );

    test_name := 'ReglesConnectiviteActives';
    statut := CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END;
    details := 'Nombre regles actives: ' || v_count;
    RETURN NEXT;

    -- Test 4: ratio dirty areas ouvertes
    SELECT COUNT(*) INTO v_count
    FROM reseau.dirty_area
    WHERE statut = 'Open';

    INSERT INTO reseau.test_acceptance_result (code, test_name, statut, details)
    VALUES (
        'TST-' || LPAD(nextval('reseau.seq_test_acceptance_code')::TEXT, 8, '0'),
        'DirtyAreasOpenThreshold',
        CASE WHEN v_count < 5000 THEN 'PASS' ELSE 'FAIL' END,
        'Dirty areas ouvertes: ' || v_count || ' (seuil < 5000)'
    );

    test_name := 'DirtyAreasOpenThreshold';
    statut := CASE WHEN v_count < 5000 THEN 'PASS' ELSE 'FAIL' END;
    details := 'Dirty areas ouvertes: ' || v_count || ' (seuil < 5000)';
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE VIEW reseau.v_benchmark_trace AS
SELECT
    tr.type_trace,
    COUNT(*) AS nb_traces,
    AVG(EXTRACT(EPOCH FROM (NOW() - tr.date_execution))) AS age_moyen_sec,
    AVG(tr.nb_noeuds_trouves) AS avg_noeuds,
    AVG(tr.nb_clients_impactes) AS avg_clients
FROM reseau.trace_reseau tr
GROUP BY tr.type_trace;

-- -----------------------------
-- 16) TRACE IMPACT CLIENT (COMPTEURS IMPACTÉS)
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.lancer_trace_impact_client(
    p_noeud_depart UUID,
    p_niveau_reseau VARCHAR DEFAULT NULL,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trace_id UUID;
BEGIN
    INSERT INTO reseau.trace_reseau (type_trace, noeud_depart_id, niveau_reseau, utilisateur)
    VALUES ('Impact_Client', p_noeud_depart, p_niveau_reseau, p_utilisateur)
    RETURNING id INTO v_trace_id;

    DELETE FROM reseau.trace_resultat WHERE trace_id = v_trace_id;

    WITH RECURSIVE parcours AS (
        SELECT
            p_noeud_depart::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
          AND p.niveau < 200
    )
    INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
    SELECT
        v_trace_id,
        'Noeud',
        q.noeud_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
    FROM parcours q
    WHERE q.noeud_id IS NOT NULL
    GROUP BY q.noeud_id;

    WITH RECURSIVE parcours AS (
        SELECT
            p_noeud_depart::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
          AND p.niveau < 200
    )
    INSERT INTO reseau.trace_resultat (trace_id, element_type, arete_id, ordre_resultat)
    SELECT
        v_trace_id,
        'Arete',
        q.arete_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id)
    FROM parcours q
    WHERE q.arete_id IS NOT NULL
    GROUP BY q.arete_id;

    UPDATE reseau.trace_reseau tr
    SET nb_noeuds_trouves = (
            SELECT COUNT(*) FROM reseau.trace_resultat r
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Noeud'
        ),
        nb_aretes_trouvees = (
            SELECT COUNT(*) FROM reseau.trace_resultat r
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Arete'
        ),
        nb_clients_impactes = (
            SELECT COUNT(DISTINCT c.id)
            FROM reseau.trace_resultat r
            JOIN reseau.noeud n ON n.id = r.noeud_id
            JOIN client.compteur c ON c.id = n.objet_id
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Noeud'
              AND n.objet_table = 'client.compteur'
        ),
        energie_estimee_kwh = (
            SELECT ROUND(COALESCE(SUM(c.puissance_souscrite_kva), 0.0)::NUMERIC * 1.2, 3)
            FROM reseau.trace_resultat r
            JOIN reseau.noeud n ON n.id = r.noeud_id
            JOIN client.compteur c ON c.id = n.objet_id
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Noeud'
              AND n.objet_table = 'client.compteur'
        )
    WHERE tr.id = v_trace_id;

    RETURN v_trace_id;
END;
$$;

-- -----------------------------
-- 17) VUES D'EXPLOITATION
-- -----------------------------
CREATE OR REPLACE VIEW reseau.v_sous_reseaux_resume AS
SELECT
    sr.id,
    sr.code,
    sr.nom,
    sr.niveau_reseau,
    sr.type_sous_reseau,
    s.libelle AS statut,
    sr.longueur_totale_km,
    COUNT(CASE WHEN se.element_type = 'Noeud' THEN 1 END) AS nb_noeuds,
    COUNT(CASE WHEN se.element_type = 'Arete' THEN 1 END) AS nb_aretes,
    sr.charge_estimee_mw,
    sr.pertes_estimees_pct,
    sr.date_creation
FROM reseau.sous_reseau sr
LEFT JOIN ref.domaine_statut s ON s.id = sr.statut_id
LEFT JOIN reseau.sous_reseau_element se ON se.sous_reseau_id = sr.id
GROUP BY
    sr.id, sr.code, sr.nom, sr.niveau_reseau, sr.type_sous_reseau, s.libelle,
    sr.longueur_totale_km, sr.charge_estimee_mw, sr.pertes_estimees_pct, sr.date_creation;

CREATE OR REPLACE VIEW reseau.v_traces_reseau AS
SELECT
    tr.id,
    tr.code,
    tr.type_trace,
    tr.date_execution,
    tr.utilisateur,
    tr.niveau_reseau,
    n.code AS noeud_depart_code,
    n.type_noeud AS noeud_depart_type,
    tr.nb_noeuds_trouves,
    tr.nb_aretes_trouvees,
    tr.nb_clients_impactes,
    tr.energie_estimee_kwh,
    tr.observation
FROM reseau.trace_reseau tr
LEFT JOIN reseau.noeud n ON n.id = tr.noeud_depart_id;

-- =============================================================================
-- PHASE 4 — CORRECTIONS CRITIQUES DE COHÉRENCE TOPOLOGIQUE
-- =============================================================================

-- -----------------------------
-- 18) ANTI-DOUBLONS ASSOCIATIONS AUTO
-- -----------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_association_auto_coffret_compteur
ON reseau.association(type_association, noeud_source_id, noeud_cible_id, description)
WHERE description = 'AUTO: Coffret_BT -> Compteur';

-- -----------------------------
-- 19) RECHERCHE DE NOEUD LE PLUS PROCHE POUR ENDPOINTS MT/BT
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.f_get_noeud_proche(
    p_geom GEOMETRY,
    p_tier VARCHAR DEFAULT NULL,
    p_distance_max_m NUMERIC DEFAULT 80
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_noeud UUID;
BEGIN
    IF p_geom IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT n.id
    INTO v_noeud
    FROM reseau.noeud n
    WHERE (p_tier IS NULL OR n.tier = p_tier)
      AND ST_DWithin(n.geom::geography, p_geom::geography, p_distance_max_m)
    ORDER BY ST_Distance(n.geom::geography, p_geom::geography)
    LIMIT 1;

    RETURN v_noeud;
END;
$$;

-- -----------------------------
-- 20) TRIGGERS MT/BT AVEC RACCORDEMENT ENDPOINTS
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.trg_sync_arete_ligne_mt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_noeud_depart UUID;
    v_noeud_arrivee UUID;
    v_p_start GEOMETRY(POINT, 4326);
    v_p_end   GEOMETRY(POINT, 4326);
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_arete('distribution.ligne_mt', OLD.id);
        RETURN OLD;
    END IF;

    v_p_start := ST_StartPoint(NEW.geom);
    v_p_end   := ST_EndPoint(NEW.geom);

    v_noeud_depart := reseau.f_get_noeud_proche(v_p_start, 'Distribution_MT', 100);
    v_noeud_arrivee := reseau.f_get_noeud_proche(v_p_end, 'Distribution_MT', 100);

    IF v_noeud_depart IS NULL THEN
        v_noeud_depart := reseau.f_get_noeud_proche(v_p_start, 'Transport', 120);
    END IF;
    IF v_noeud_arrivee IS NULL THEN
        v_noeud_arrivee := reseau.f_get_noeud_proche(v_p_end, 'Distribution_BT', 120);
    END IF;

    PERFORM reseau.f_upsert_arete(
        'distribution.ligne_mt',
        NEW.id,
        'Ligne_MT',
        'Distribution_MT',
        NEW.geom,
        v_noeud_depart,
        v_noeud_arrivee
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION reseau.trg_sync_arete_ligne_bt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_noeud_depart UUID;
    v_noeud_arrivee UUID;
    v_p_start GEOMETRY(POINT, 4326);
    v_p_end   GEOMETRY(POINT, 4326);
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM reseau.f_delete_arete('distribution.ligne_bt', OLD.id);
        RETURN OLD;
    END IF;

    v_p_start := ST_StartPoint(NEW.geom);
    v_p_end   := ST_EndPoint(NEW.geom);

    v_noeud_depart := reseau.f_get_noeud_proche(v_p_start, 'Distribution_BT', 80);
    v_noeud_arrivee := reseau.f_get_noeud_proche(v_p_end, 'Distribution_BT', 80);

    IF v_noeud_depart IS NULL THEN
        v_noeud_depart := reseau.f_get_noeud_proche(v_p_start, 'Distribution_MT', 100);
    END IF;
    IF v_noeud_arrivee IS NULL THEN
        v_noeud_arrivee := reseau.f_get_noeud_proche(v_p_end, 'Client', 120);
    END IF;

    PERFORM reseau.f_upsert_arete(
        'distribution.ligne_bt',
        NEW.id,
        'Ligne_BT',
        'Distribution_BT',
        NEW.geom,
        v_noeud_depart,
        v_noeud_arrivee
    );

    RETURN NEW;
END;
$$;

-- -----------------------------
-- 21) TRACE AMONT/AVAL AVEC ANTI-BOUCLE + SENS
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.lancer_trace(
    p_noeud_depart UUID,
    p_type_trace VARCHAR,
    p_niveau_reseau VARCHAR DEFAULT NULL,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trace_id UUID;
BEGIN
    INSERT INTO reseau.trace_reseau (type_trace, noeud_depart_id, niveau_reseau, utilisateur)
    VALUES (p_type_trace, p_noeud_depart, p_niveau_reseau, p_utilisateur)
    RETURNING id INTO v_trace_id;

    DELETE FROM reseau.trace_resultat WHERE trace_id = v_trace_id;

    IF p_type_trace = 'Aval' THEN
        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau,
                ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
            UNION ALL
            SELECT
                a.noeud_arrivee_id,
                a.id,
                p.niveau + 1,
                p.chemin_noeuds || a.noeud_arrivee_id
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND a.noeud_arrivee_id IS NOT NULL
              AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
        SELECT v_trace_id, 'Noeud', q.noeud_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
        FROM parcours q
        WHERE q.noeud_id IS NOT NULL
        GROUP BY q.noeud_id;

        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau,
                ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
            UNION ALL
            SELECT
                a.noeud_arrivee_id,
                a.id,
                p.niveau + 1,
                p.chemin_noeuds || a.noeud_arrivee_id
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND a.noeud_arrivee_id IS NOT NULL
              AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, arete_id, ordre_resultat)
        SELECT v_trace_id, 'Arete', q.arete_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id)
        FROM parcours q
        WHERE q.arete_id IS NOT NULL
        GROUP BY q.arete_id;

    ELSIF p_type_trace = 'Amont' THEN
        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau,
                ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
            UNION ALL
            SELECT
                a.noeud_depart_id,
                a.id,
                p.niveau + 1,
                p.chemin_noeuds || a.noeud_depart_id
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_arrivee_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND a.sens_circulation IN ('Aval-Amont', 'Bidirectionnel')
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND a.noeud_depart_id IS NOT NULL
              AND NOT (a.noeud_depart_id = ANY(p.chemin_noeuds))
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
        SELECT v_trace_id, 'Noeud', q.noeud_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
        FROM parcours q
        WHERE q.noeud_id IS NOT NULL
        GROUP BY q.noeud_id;

        WITH RECURSIVE parcours AS (
            SELECT
                p_noeud_depart::UUID AS noeud_id,
                NULL::UUID AS arete_id,
                0 AS niveau,
                ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
            UNION ALL
            SELECT
                a.noeud_depart_id,
                a.id,
                p.niveau + 1,
                p.chemin_noeuds || a.noeud_depart_id
            FROM parcours p
            JOIN reseau.arete a ON a.noeud_arrivee_id = p.noeud_id
            WHERE a.traversable = TRUE
              AND a.sens_circulation IN ('Aval-Amont', 'Bidirectionnel')
              AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
              AND a.noeud_depart_id IS NOT NULL
              AND NOT (a.noeud_depart_id = ANY(p.chemin_noeuds))
              AND p.niveau < 100
        )
        INSERT INTO reseau.trace_resultat (trace_id, element_type, arete_id, ordre_resultat)
        SELECT v_trace_id, 'Arete', q.arete_id, ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id)
        FROM parcours q
        WHERE q.arete_id IS NOT NULL
        GROUP BY q.arete_id;
    END IF;

    UPDATE reseau.trace_reseau t
    SET nb_noeuds_trouves  = (SELECT COUNT(*) FROM reseau.trace_resultat r WHERE r.trace_id = v_trace_id AND r.element_type = 'Noeud'),
        nb_aretes_trouvees = (SELECT COUNT(*) FROM reseau.trace_resultat r WHERE r.trace_id = v_trace_id AND r.element_type = 'Arete')
    WHERE t.id = v_trace_id;

    RETURN v_trace_id;
END;
$$;

-- -----------------------------
-- 22) TRACE IMPACT CLIENT AVEC ANTI-BOUCLE + SENS
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.lancer_trace_impact_client(
    p_noeud_depart UUID,
    p_niveau_reseau VARCHAR DEFAULT NULL,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trace_id UUID;
BEGIN
    INSERT INTO reseau.trace_reseau (type_trace, noeud_depart_id, niveau_reseau, utilisateur)
    VALUES ('Impact_Client', p_noeud_depart, p_niveau_reseau, p_utilisateur)
    RETURNING id INTO v_trace_id;

    DELETE FROM reseau.trace_resultat WHERE trace_id = v_trace_id;

    WITH RECURSIVE parcours AS (
        SELECT
            p_noeud_depart::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau,
            ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau,
            p.chemin_noeuds || a.noeud_arrivee_id
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
          AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
          AND a.noeud_arrivee_id IS NOT NULL
          AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
          AND p.niveau < 200
    )
    INSERT INTO reseau.trace_resultat (trace_id, element_type, noeud_id, ordre_resultat)
    SELECT
        v_trace_id,
        'Noeud',
        q.noeud_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id)
    FROM parcours q
    WHERE q.noeud_id IS NOT NULL
    GROUP BY q.noeud_id;

    WITH RECURSIVE parcours AS (
        SELECT
            p_noeud_depart::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau,
            ARRAY[p_noeud_depart::UUID] AS chemin_noeuds
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau,
            p.chemin_noeuds || a.noeud_arrivee_id
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
          AND (p_niveau_reseau IS NULL OR a.tier = p_niveau_reseau)
          AND a.noeud_arrivee_id IS NOT NULL
          AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
          AND p.niveau < 200
    )
    INSERT INTO reseau.trace_resultat (trace_id, element_type, arete_id, ordre_resultat)
    SELECT
        v_trace_id,
        'Arete',
        q.arete_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id)
    FROM parcours q
    WHERE q.arete_id IS NOT NULL
    GROUP BY q.arete_id;

    UPDATE reseau.trace_reseau tr
    SET nb_noeuds_trouves = (
            SELECT COUNT(*) FROM reseau.trace_resultat r
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Noeud'
        ),
        nb_aretes_trouvees = (
            SELECT COUNT(*) FROM reseau.trace_resultat r
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Arete'
        ),
        nb_clients_impactes = (
            SELECT COUNT(DISTINCT c.id)
            FROM reseau.trace_resultat r
            JOIN reseau.noeud n ON n.id = r.noeud_id
            JOIN client.compteur c ON c.id = n.objet_id
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Noeud'
              AND n.objet_table = 'client.compteur'
        ),
        energie_estimee_kwh = (
            SELECT ROUND(COALESCE(SUM(c.puissance_souscrite_kva), 0.0)::NUMERIC * 1.2, 3)
            FROM reseau.trace_resultat r
            JOIN reseau.noeud n ON n.id = r.noeud_id
            JOIN client.compteur c ON c.id = n.objet_id
            WHERE r.trace_id = v_trace_id
              AND r.element_type = 'Noeud'
              AND n.objet_table = 'client.compteur'
        )
    WHERE tr.id = v_trace_id;

    RETURN v_trace_id;
END;
$$;

-- -----------------------------
-- 23) RECONSTRUCTION SOUS-RÉSEAU AVEC ANTI-BOUCLE + SENS
-- -----------------------------
CREATE OR REPLACE FUNCTION reseau.reconstruire_sous_reseau(
    p_sous_reseau_id UUID,
    p_utilisateur VARCHAR DEFAULT CURRENT_USER
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_noeud UUID;
    v_niveau_reseau VARCHAR(20);
    v_nb_elements INT;
BEGIN
    SELECT sr.source_noeud_id, sr.niveau_reseau
    INTO v_source_noeud, v_niveau_reseau
    FROM reseau.sous_reseau sr
    WHERE sr.id = p_sous_reseau_id;

    IF v_source_noeud IS NULL THEN
        RAISE EXCEPTION 'Sous-réseau % sans source_noeud_id', p_sous_reseau_id;
    END IF;

    DELETE FROM reseau.sous_reseau_element
    WHERE sous_reseau_id = p_sous_reseau_id;

    WITH RECURSIVE parcours AS (
        SELECT
            v_source_noeud::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau,
            0.0::NUMERIC(12,3) AS distance_km,
            ARRAY[v_source_noeud::UUID] AS chemin_noeuds
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau,
            p.distance_km + COALESCE(ST_Length(a.geom::geography)/1000.0, 0.0)::NUMERIC(12,3) AS distance_km,
            p.chemin_noeuds || a.noeud_arrivee_id
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
          AND (v_niveau_reseau IS NULL OR a.tier = v_niveau_reseau)
          AND a.noeud_arrivee_id IS NOT NULL
          AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
          AND p.niveau < 200
    )
    INSERT INTO reseau.sous_reseau_element (sous_reseau_id, element_type, noeud_id, ordre_topologique, distance_source_km)
    SELECT
        p_sous_reseau_id,
        'Noeud',
        q.noeud_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.noeud_id),
        MIN(q.distance_km)
    FROM parcours q
    WHERE q.noeud_id IS NOT NULL
    GROUP BY q.noeud_id;

    WITH RECURSIVE parcours AS (
        SELECT
            v_source_noeud::UUID AS noeud_id,
            NULL::UUID AS arete_id,
            0 AS niveau,
            0.0::NUMERIC(12,3) AS distance_km,
            ARRAY[v_source_noeud::UUID] AS chemin_noeuds
        UNION ALL
        SELECT
            a.noeud_arrivee_id AS noeud_id,
            a.id               AS arete_id,
            p.niveau + 1       AS niveau,
            p.distance_km + COALESCE(ST_Length(a.geom::geography)/1000.0, 0.0)::NUMERIC(12,3) AS distance_km,
            p.chemin_noeuds || a.noeud_arrivee_id
        FROM parcours p
        JOIN reseau.arete a ON a.noeud_depart_id = p.noeud_id
        WHERE a.traversable = TRUE
          AND a.sens_circulation IN ('Amont-Aval', 'Bidirectionnel')
          AND (v_niveau_reseau IS NULL OR a.tier = v_niveau_reseau)
          AND a.noeud_arrivee_id IS NOT NULL
          AND NOT (a.noeud_arrivee_id = ANY(p.chemin_noeuds))
          AND p.niveau < 200
    )
    INSERT INTO reseau.sous_reseau_element (sous_reseau_id, element_type, arete_id, ordre_topologique, distance_source_km)
    SELECT
        p_sous_reseau_id,
        'Arete',
        q.arete_id,
        ROW_NUMBER() OVER (ORDER BY MIN(q.niveau), q.arete_id),
        MIN(q.distance_km)
    FROM parcours q
    WHERE q.arete_id IS NOT NULL
    GROUP BY q.arete_id;

    SELECT COUNT(*)
    INTO v_nb_elements
    FROM reseau.sous_reseau_element e
    WHERE e.sous_reseau_id = p_sous_reseau_id;

    UPDATE reseau.sous_reseau sr
    SET longueur_totale_km = (
            SELECT ROUND(COALESCE(SUM(ST_Length(a.geom::geography))/1000.0, 0.0)::NUMERIC, 3)
            FROM reseau.sous_reseau_element se
            JOIN reseau.arete a ON a.id = se.arete_id
            WHERE se.sous_reseau_id = p_sous_reseau_id
              AND se.element_type = 'Arete'
        )
    WHERE sr.id = p_sous_reseau_id;

    RETURN v_nb_elements;
END;
$$;
