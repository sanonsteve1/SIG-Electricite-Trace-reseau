-- Suppression des données insérées par generate_donnees_dori_volumineux.py
-- (collecte_par = 'jeu_dori_volumineux')
-- Exécution : psql -U postgres -d pre_prod_test1 -f scripts/script_bd/docs/SUPPRIMER_DONNEES_DORI_VOLUMINEUX.sql

BEGIN;

DELETE FROM branchement         WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM abonne              WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM point_raccordement   WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM ligne_brcht         WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM ligne_bt            WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM poteau_bt           WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM depart_bt           WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM poste_cabine         WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM ligne_hta            WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM poteau_hta           WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM depart               WHERE collecte_par = 'jeu_dori_volumineux';
DELETE FROM poste_source        WHERE collecte_par = 'jeu_dori_volumineux';

COMMIT;

-- Vérification (optionnel) : compter les lignes restantes par table
-- SELECT 'poste_source' AS table_name, COUNT(*) FROM poste_source
-- UNION ALL SELECT 'depart', COUNT(*) FROM depart
-- UNION ALL SELECT 'ligne_hta', COUNT(*) FROM ligne_hta
-- UNION ALL SELECT 'poteau_hta', COUNT(*) FROM poteau_hta
-- UNION ALL SELECT 'poste_cabine', COUNT(*) FROM poste_cabine
-- UNION ALL SELECT 'depart_bt', COUNT(*) FROM depart_bt
-- UNION ALL SELECT 'poteau_bt', COUNT(*) FROM poteau_bt
-- UNION ALL SELECT 'ligne_bt', COUNT(*) FROM ligne_bt
-- UNION ALL SELECT 'ligne_brcht', COUNT(*) FROM ligne_brcht
-- UNION ALL SELECT 'point_raccordement', COUNT(*) FROM point_raccordement
-- UNION ALL SELECT 'abonne', COUNT(*) FROM abonne
-- UNION ALL SELECT 'branchement', COUNT(*) FROM branchement;
