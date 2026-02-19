@echo off

pip install -r requirements.txt
REM Définir la variable RESET_REMOTE_BD (1 = True, 0 = False)
set RESET_REMOTE_BD=0
if not "%1"=="" set RESET_REMOTE_BD=%1

REM Lancer les scripts Python en passant RESET_REMOTE_BD
python build.py
python deploy.py --RESET_REMOTE_BD=%RESET_REMOTE_BD%

pause
