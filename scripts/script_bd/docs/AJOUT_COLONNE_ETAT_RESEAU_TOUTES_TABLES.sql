-- Ajoute et normalise la colonne `etat_reseau` sur toutes les tables utilisateur du schéma public.
-- Valeurs autorisées: 'ouvert' ou 'fermé'
-- Usage (PostgreSQL):
--   psql -h <host> -p <port> -U <user> -d <db_name> -f scripts/script_bd/docs/AJOUT_COLONNE_ETAT_RESEAU_TOUTES_TABLES.sql

DO $$
DECLARE
    rec RECORD;
    check_name TEXT;
    update_sql TEXT;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
    LOOP
        -- 1) Ajouter la colonne si absente
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS etat_reseau text',
            rec.table_schema, rec.table_name
        );

        -- 2) Normaliser les valeurs existantes puis remplir les NULL/vides
        update_sql := format(
            $f$
            UPDATE %I.%I
            SET etat_reseau = CASE
                WHEN etat_reseau IS NULL OR btrim(etat_reseau) = '' THEN 'ouvert'
                WHEN lower(translate(btrim(etat_reseau), 'éèêëÉÈÊË', 'eeeeEEEE')) IN ('ferme', 'fermee', 'closed') THEN 'fermé'
                WHEN lower(translate(btrim(etat_reseau), 'éèêëÉÈÊË', 'eeeeEEEE')) IN ('ouvert', 'ouverte', 'open') THEN 'ouvert'
                ELSE etat_reseau
            END
            $f$,
            rec.table_schema, rec.table_name
        );

        BEGIN
            EXECUTE update_sql;
        EXCEPTION
            WHEN SQLSTATE '55000' THEN
                -- Table publiée en réplication logique sans replica identity pour UPDATE.
                EXECUTE format(
                    'ALTER TABLE %I.%I REPLICA IDENTITY FULL',
                    rec.table_schema, rec.table_name
                );
                EXECUTE update_sql;
        END;

        -- 3) Valeur par défaut + non null
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN etat_reseau SET DEFAULT %L',
            rec.table_schema, rec.table_name, 'ouvert'
        );
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN etat_reseau SET NOT NULL',
            rec.table_schema, rec.table_name
        );

        -- 4) Contrainte de domaine (nom court pour rester < 63 caractères)
        check_name := 'ck_' || substr(rec.table_name, 1, 45) || '_etat_reseau';

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class r ON r.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = r.relnamespace
            WHERE n.nspname = rec.table_schema
              AND r.relname = rec.table_name
              AND c.conname = check_name
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (etat_reseau IN (%L, %L))',
                rec.table_schema, rec.table_name, check_name, 'ouvert', 'fermé'
            );
        END IF;
    END LOOP;
END
$$;

