import paramiko
import os, subprocess
import asyncio, asyncssh
import argparse

# -----------------------
# Configuration de base
# -----------------------
HOST = '51.195.42.17'       # Adresse IP ou hostname du serveur distant
PORT = 22                    # Port SSH
USERNAME = 'ubuntu'    # Nom d'utilisateur SSH
PASSWORD = 'k2Fn8i4j2uK9QE'    # Mot de passe SSH
REMOTE_DIR = '/app'  # Répertoire distant où stocker les fichiers

# Paramètres activables/désactivables via arguments de ligne de commande
parser = argparse.ArgumentParser()
parser.add_argument("--EXECUTE_COMMANDS_BEFORE_UPLOAD", type=int, default=1)
parser.add_argument("--UPLOAD_FILES", type=int, default=1)
parser.add_argument("--RESET_REMOTE_BD", type=int, default=1)
parser.add_argument("--EXECUTE_COMMANDS_AFTER_UPLOAD", type=int, default=1)

args = parser.parse_args()

# Conversion des paramètres en booléens
EXECUTE_COMMANDS_BEFORE_UPLOAD = bool(args.EXECUTE_COMMANDS_BEFORE_UPLOAD)
UPLOAD_FILES = bool(args.UPLOAD_FILES)
RESET_REMOTE_BD = bool(args.RESET_REMOTE_BD)
EXECUTE_COMMANDS_AFTER_UPLOAD = bool(args.EXECUTE_COMMANDS_AFTER_UPLOAD)

# Configuration base de données cible
TARGET_DB = "abstock"
TARGET_ROLE = "abstock"

# -----------------------
# Fichiers locaux à envoyer
# -----------------------
LOCAL_FILES = [
    'deploy/abstock.zip',
    'deploy/abstock.war'
]

# -----------------------
# Commandes à exécuter avant l’upload
# (sauvegarde des anciens fichiers)
# -----------------------
COMMANDS_TO_RUN_BEFORE_UPLOAD = [
    f'mv -f abstock.war abstock-old.war > /dev/null 2>&1',
    f'mv -f abstock abstock-old > /dev/null 2>&1',
]

# -----------------------
# Commandes à exécuter après l’upload
# (déploiement des nouveaux fichiers)
# -----------------------
COMMANDS_TO_RUN_AFTER_UPLOAD = [
    "sudo rm -rf abstock",
    "sudo unzip -o abstock.zip -d .",
    "sudo cp -f abstock.war /opt/tomcat/webapps",
    "sudo rm -rf /app/abstock/*",
    "sudo cp -rf abstock/* /app/abstock/"
]

# -----------------------
# Commandes pour initialiser la base de données
# (création rôle + db + extensions nécessaires)
# -----------------------
COMMANDS_INIT_DB = [
    f"sudo -u postgres psql -c \"DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{TARGET_ROLE}') THEN CREATE ROLE {TARGET_ROLE} LOGIN; END IF; END \\$\\$;\"",
    f"sudo -u postgres psql -c \"DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '{TARGET_DB}') THEN CREATE DATABASE {TARGET_DB} OWNER {TARGET_ROLE}; END IF; END \\$\\$;\"",
    f"sudo -u postgres psql -d {TARGET_DB} -c \"DROP SCHEMA IF EXISTS public CASCADE;\"",
    f"sudo -u postgres psql -d {TARGET_DB} -c \"CREATE SCHEMA public AUTHORIZATION {TARGET_ROLE};\""
]

# Si True → sudo ne demande pas de mot de passe
SUDO_NO_PROMPT = False


# -----------------------
# Fonction : Upload des fichiers via SFTP
# -----------------------
async def upload_files_sftp():
    try:
        print("Connexion SFTP...")
        async with asyncssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, known_hosts=None ) as conn:
            async with conn.start_sftp_client() as sftp:
                for file in LOCAL_FILES:
                    # Chemin de destination sur le serveur
                    remote_path = os.path.join(REMOTE_DIR, os.path.basename(file)).replace("\\", "/")
                    print(f"Transfert de {file} vers {remote_path}...")
                    await sftp.put(file, remote_path)
                print("Transfert terminé avec succès.")
            return True
    except Exception as e:
        print(f"Erreur durant le transfert SFTP: {e}")
        return False


# -----------------------
# Fonction : Exécution de commandes SSH
# -----------------------
def execute_remote_commands(commands):
    try:
        print("Connexion SSH...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)
        error_found = False

        for cmd in commands:
            # Permet de gérer une commande sous forme de dict ou de string
            if isinstance(cmd, str):
                cmd = {"text": cmd, "prompts": [], "mandatory": True}

            cmd_text = cmd["text"]
            cmd_sudo = cmd_text.strip().startswith("sudo")

            print(f"Exécution: {cmd_text}")

            # Gestion sudo avec mot de passe si nécessaire
            if cmd_sudo and not SUDO_NO_PROMPT:
                full_command = f"echo '{PASSWORD}' | sudo -S -n {cmd_text[5:].strip()}"
            else:
                full_command = cmd_text

            # Exécution de la commande distante
            stdin, stdout, stderr = ssh.exec_command(full_command, get_pty=True)

            # Récupération des sorties
            output = stdout.read().decode()
            errors = stderr.read().decode()

            print("Sortie:")
            print(output)
            if errors:
                print("Erreurs:")
                print(errors)
                # Si la commande est obligatoire et échoue → on arrête
                if cmd["mandatory"] == True:
                    error_found = True
                    break

        ssh.close()
        print("Commandes exécutées avec succès.")
        return not error_found
    except Exception as e:
        print(f"Erreur SSH: {e}")
        return False


# -----------------------
# Point d’entrée du script
# -----------------------
if __name__ == '__main__':
    # Étape 1 : Exécuter les commandes avant l’upload (sauvegardes)
    if EXECUTE_COMMANDS_BEFORE_UPLOAD and not execute_remote_commands(COMMANDS_TO_RUN_BEFORE_UPLOAD):
        exit

    # Étape 2 : Upload des fichiers si activé
    if UPLOAD_FILES:
        success = asyncio.run(upload_files_sftp())
        if not success:
            print("Erreur de transfert")
            exit

        # Étape 3 : Réinitialisation de la base de données
        if RESET_REMOTE_BD and not execute_remote_commands(COMMANDS_INIT_DB):
            exit

        # Étape 4 : Exécution des commandes après l’upload (déploiement)
        if EXECUTE_COMMANDS_AFTER_UPLOAD:
            execute_remote_commands(COMMANDS_TO_RUN_AFTER_UPLOAD)
