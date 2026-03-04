#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour extraire toutes les tables et leurs champs de la base de données (défaut : pre_prod_test1)
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import Error
from psycopg2.extensions import quote_ident
import json
import os
from datetime import datetime

# Configuration de la connexion (même logique que api/config.py pour cohérence API / structure)
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'pre_prod_test1'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '2023'),
}
# Dossier de sortie : script_bd (à côté de ce script)
_SCRIPT_BD_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STRUCTURE_JSON = os.path.join(_SCRIPT_BD_DIR, 'database_structure.json')
DEFAULT_STRUCTURE_TXT = os.path.join(_SCRIPT_BD_DIR, 'database_structure.txt')


def get_connection():
    """Établit une connexion à la base de données"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        print(f"✅ Connexion réussie à la base de données '{DB_CONFIG['database']}'")
        return connection
    except Error as e:
        print(f"❌ Erreur de connexion à la base de données: {e}")
        return None


def get_all_tables(connection):
    """Récupère la liste de toutes les tables de la base de données"""
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables
    except Error as e:
        print(f"❌ Erreur lors de la récupération des tables: {e}")
        return []


def get_table_structure(connection, table_name):
    """Récupère la structure complète d'une table (colonnes, types, contraintes)"""
    # Utiliser un nouveau curseur pour chaque table pour éviter les problèmes de transaction
    try:
        # S'assurer que chaque requête est dans sa propre transaction
        connection.rollback()  # Annuler toute transaction précédente en cas d'erreur
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Récupérer d'abord le nom réel de la table depuis pg_class pour préserver la casse
        cursor.execute("""
            SELECT relname 
            FROM pg_class 
            WHERE relkind = 'r' 
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            AND LOWER(relname) = LOWER(%s)
        """, (table_name,))
        real_table_result = cursor.fetchone()
        
        if not real_table_result:
            raise Error(f"Table '{table_name}' not found in pg_class")
        
        real_table_name = real_table_result['relname']
        
        # Récupérer les informations des colonnes (information_schema est insensible à la casse)
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                is_nullable,
                column_default,
                ordinal_position
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND LOWER(table_name) = LOWER(%s)
            ORDER BY ordinal_position
        """, (table_name,))
        columns = cursor.fetchall()
        
        # Formater les colonnes pour compatibilité avec le formatage
        formatted_columns = []
        for col in columns:
            data_type = col['data_type']
            if col['character_maximum_length']:
                data_type += f"({col['character_maximum_length']})"
            elif col['numeric_precision']:
                if col['numeric_scale']:
                    data_type += f"({col['numeric_precision']},{col['numeric_scale']})"
                else:
                    data_type += f"({col['numeric_precision']})"
            
            formatted_columns.append({
                'Field': col['column_name'],
                'Type': data_type,
                'Null': 'YES' if col['is_nullable'] == 'YES' else 'NO',
                'Default': col['column_default'],
                'Extra': ''
            })
        
        # Récupérer les clés primaires
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.key_column_usage 
            WHERE table_schema = 'public' 
            AND LOWER(table_name) = LOWER(%s) 
            AND constraint_name IN (
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_schema = 'public' 
                AND LOWER(table_name) = LOWER(%s) 
                AND constraint_type = 'PRIMARY KEY'
            )
            ORDER BY ordinal_position
        """, (table_name, table_name))
        primary_keys = [row['column_name'] for row in cursor.fetchall()]
        
        # Récupérer les clés étrangères
        cursor.execute("""
            SELECT 
                kcu.column_name,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name,
                kcu.constraint_name
            FROM information_schema.key_column_usage kcu
            JOIN information_schema.referential_constraints rc 
                ON kcu.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON rc.unique_constraint_name = ccu.constraint_name
            WHERE kcu.table_schema = 'public'
            AND LOWER(kcu.table_name) = LOWER(%s)
        """, (table_name,))
        foreign_keys = cursor.fetchall()
        
        # Récupérer les index (utiliser le nom réel de la table)
        cursor.execute("""
            SELECT 
                i.relname AS index_name,
                a.attname AS column_name,
                ix.indisunique AS is_unique,
                ix.indisprimary AS is_primary
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE t.relkind = 'r'
            AND t.relname = %s
            ORDER BY i.relname, array_position(ix.indkey, a.attnum)
        """, (real_table_name,))
        indexes = cursor.fetchall()
        
        # Récupérer les informations de la table (utiliser le nom réel avec casse préservée)
        # Utiliser quote_ident pour préserver la casse de manière sécurisée
        quoted_table = quote_ident(real_table_name, connection)
        quoted_schema_table = f'public.{quoted_table}'
        
        # Construire la requête avec le nom de table quoté (sécurisé car quote_ident échappe correctement)
        query = f"""
            SELECT 
                pg_size_pretty(pg_total_relation_size('{quoted_schema_table}'::regclass)) AS total_size,
                pg_size_pretty(pg_relation_size('{quoted_schema_table}'::regclass)) AS data_size,
                pg_size_pretty(pg_indexes_size('{quoted_schema_table}'::regclass)) AS indexes_size,
                (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = %s) AS table_rows
        """
        cursor.execute(query, (real_table_name,))
        table_info = cursor.fetchone()
        
        cursor.close()
        
        return {
            'columns': formatted_columns,
            'primary_keys': primary_keys,
            'foreign_keys': foreign_keys,
            'indexes': indexes,
            'table_info': table_info
        }
    except Error as e:
        # Annuler la transaction en cas d'erreur pour permettre les requêtes suivantes
        connection.rollback()
        print(f"❌ Erreur lors de la récupération de la structure de la table '{table_name}': {e}")
        return None
    except Exception as e:
        # Gérer les autres erreurs
        connection.rollback()
        print(f"❌ Erreur inattendue lors de la récupération de la structure de la table '{table_name}': {e}")
        return None


def format_output(data):
    """Formate les données pour l'affichage"""
    output = []
    output.append("=" * 80)
    output.append(f"EXTRACTION DE LA BASE DE DONNÉES: {DB_CONFIG['database']}")
    output.append(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    output.append("=" * 80)
    output.append("")
    
    for table_name, table_data in data.items():
        output.append(f"\n{'=' * 80}")
        output.append(f"TABLE: {table_name}")
        output.append(f"{'=' * 80}")
        
        if table_data['table_info']:
            info = table_data['table_info']
            output.append(f"\n📊 Informations de la table:")
            output.append(f"   - Nombre de lignes: {info.get('table_rows', 'N/A'):,}" if info.get('table_rows') else "   - Nombre de lignes: N/A")
            output.append(f"   - Taille totale: {info.get('total_size', 'N/A')}")
            output.append(f"   - Taille des données: {info.get('data_size', 'N/A')}")
            output.append(f"   - Taille des index: {info.get('indexes_size', 'N/A')}")
        
        output.append(f"\n📋 Colonnes ({len(table_data['columns'])}):")
        output.append("-" * 80)
        for col in table_data['columns']:
            pk_marker = " [PK]" if col['Field'] in table_data['primary_keys'] else ""
            null_marker = " NULL" if col['Null'] == 'YES' else " NOT NULL"
            default = f" DEFAULT {col['Default']}" if col['Default'] is not None else ""
            extra = f" {col['Extra']}" if col['Extra'] else ""
            output.append(f"   • {col['Field']:<30} {col['Type']:<20}{pk_marker}{null_marker}{default}{extra}")
        
        if table_data['primary_keys']:
            output.append(f"\n🔑 Clé primaire: {', '.join(table_data['primary_keys'])}")
        
        if table_data['foreign_keys']:
            output.append(f"\n🔗 Clés étrangères:")
            for fk in table_data['foreign_keys']:
                output.append(f"   • {fk['column_name']} -> {fk['referenced_table_name']}.{fk['referenced_column_name']}")
        
        if table_data['indexes']:
            output.append(f"\n📇 Index:")
            index_dict = {}
            for idx in table_data['indexes']:
                idx_name = idx['index_name']
                if idx_name not in index_dict:
                    index_dict[idx_name] = {'columns': [], 'is_unique': idx.get('is_unique', False), 'is_primary': idx.get('is_primary', False)}
                if idx['column_name'] not in index_dict[idx_name]['columns']:
                    index_dict[idx_name]['columns'].append(idx['column_name'])
            
            for idx_name, idx_info in index_dict.items():
                unique = "UNIQUE" if idx_info['is_unique'] else ""
                primary = "PRIMARY" if idx_info['is_primary'] else ""
                output.append(f"   • {idx_name} ({', '.join(idx_info['columns'])}) {unique} {primary}".strip())
        
        output.append("")
    
    return "\n".join(output)


def save_to_json(data, filename=None):
    """Sauvegarde les données au format JSON (par défaut script_bd/database_structure.json)."""
    if filename is None:
        filename = DEFAULT_STRUCTURE_JSON
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        print(f"✅ Structure sauvegardée dans '{filename}'")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde JSON: {e}")


def save_to_text(data, filename=None):
    """Sauvegarde les données au format texte (par défaut script_bd/database_structure.txt)."""
    if filename is None:
        filename = DEFAULT_STRUCTURE_TXT
    try:
        output = format_output(data)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"✅ Structure sauvegardée dans '{filename}'")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde texte: {e}")


def main():
    """Fonction principale"""
    print("🚀 Début de l'extraction de la structure de la base de données...")
    print(f"📦 Base de données: {DB_CONFIG['database']}")
    print(f"🖥️  Serveur: {DB_CONFIG['host']}:{DB_CONFIG['port']}\n")
    
    connection = get_connection()
    if not connection:
        return
    
    try:
        # Récupérer toutes les tables
        tables = get_all_tables(connection)
        print(f"📋 {len(tables)} table(s) trouvée(s)\n")
        
        if not tables:
            print("⚠️  Aucune table trouvée dans la base de données.")
            return
        
        # Extraire la structure de chaque table
        database_structure = {}
        
        for i, table in enumerate(tables, 1):
            print(f"[{i}/{len(tables)}] Extraction de la table '{table}'...", end=" ")
            structure = get_table_structure(connection, table)
            if structure:
                database_structure[table] = structure
                print("✅")
            else:
                print("❌")
        
        # Afficher un résumé
        print("\n" + "=" * 80)
        print("📊 RÉSUMÉ")
        print("=" * 80)
        print(f"Nombre de tables: {len(database_structure)}")
        total_columns = sum(len(data['columns']) for data in database_structure.values())
        print(f"Nombre total de colonnes: {total_columns}")
        print("=" * 80)
        
        # Sauvegarder les résultats
        print("\n💾 Sauvegarde des résultats...")
        save_to_json(database_structure)
        save_to_text(database_structure)
        
        # Afficher un aperçu
        print("\n" + "=" * 80)
        print("APERÇU DE LA STRUCTURE")
        print("=" * 80)
        preview = format_output(database_structure)
        # Afficher seulement les 50 premières lignes pour l'aperçu
        preview_lines = preview.split('\n')[:50]
        print('\n'.join(preview_lines))
        if len(preview.split('\n')) > 50:
            print(f"\n... ({len(preview.split('\n')) - 50} lignes supplémentaires dans le fichier)")
        
    except Error as e:
        print(f"❌ Erreur lors de l'extraction: {e}")
    finally:
        if connection:
            connection.close()
            print("\n✅ Connexion fermée")


if __name__ == "__main__":
    main()
