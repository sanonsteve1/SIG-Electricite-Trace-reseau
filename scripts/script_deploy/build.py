import subprocess
import os
import time
from shutil import copytree, rmtree, make_archive

COMPILE_BACKEND = True
COMPILE_FRONTEND = True

if COMPILE_BACKEND:
    print("Compilation de Backend")
    os.chdir(os.path.join('..', '..', 'backend'))
    subprocess.run(['gradlew', 'bootWar', '--stacktrace'], shell=True, check=True)
    subprocess.run(['copy', os.path.join('build', 'libs', 'abstock.war'), os.path.join('..', 'scripts', 'script_deploy', 'deploy')], shell=True, check=True)
    os.chdir(os.path.join('..', 'scripts', 'script_deploy'))

if COMPILE_FRONTEND:
    print("Compilation de Frontend")
    os.chdir(os.path.join('..', '..', 'frontend'))
    subprocess.run(['npm', 'run', 'build'], shell=True)
    os.chdir(os.path.join('..'))

time.sleep(5)

deploy_path = "scripts\\script_deploy\\deploy"

# Nettoyer l'ancien frontend si existant
if os.path.exists(os.path.join(deploy_path, "frontend")):
    rmtree(os.path.join(deploy_path, "frontend"))

# Copier le build Angular vers le dossier deploy
copytree(os.path.join('..', 'frontend', 'dist', 'abstock', 'browser'), os.path.join(deploy_path, "abstock"))

# Créer une archive ZIP du frontend
make_archive(os.path.join(deploy_path, "abstock"), 'zip', os.path.join(deploy_path, "abstock"))

# Supprimer le dossier après zip (si tu veux garder uniquement le zip)
rmtree(os.path.join(deploy_path, "abstock"))

# Se replacer dans le dossier de script
os.chdir(os.path.join('scripts', 'script_deploy'))
