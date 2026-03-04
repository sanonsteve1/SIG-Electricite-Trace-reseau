import psycopg2

POSTGRES_HOST = "51.195.42.17"
POSTGRES_PORT = "5432"
TARGET_DB = "ab-un"
TARGET_ROLE = "ab-un"
TARGET_PASSWORD = "ab-un"

def init_db():
    try:
        # Connexion à la base cible
        conn = psycopg2.connect(
            dbname=TARGET_DB,
            user=TARGET_ROLE,
            password=TARGET_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()

        # Drop et recréer le schéma public
        print("Suppression du schema public...")
        cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")

        print(f"Création du schema public avec l'utilisateur {TARGET_ROLE}...")
        cur.execute(f"CREATE SCHEMA public AUTHORIZATION {TARGET_ROLE};")

        print("✅ Tout est prêt !")

        cur.close()
        conn.close()

    except Exception as e:
        print("❌ Erreur :", e)

if __name__ == "__main__":
    init_db()
