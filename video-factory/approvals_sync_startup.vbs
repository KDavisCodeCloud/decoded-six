' DecodedSix: watches Mission Control for approved Shorts and drops them in
' C:\Users\Kelvin\Videos\DecodedSix\approvals (opens the folder when new ones arrive).
' Runs hidden at login. Delete this file to stop it starting automatically.
CreateObject("WScript.Shell").Run "wsl.exe -d Ubuntu-22.04 --cd /mnt/c/Users/Kelvin/projects/decoded-six -e video-factory/.venv/bin/python video-factory/approvals_sync.py --watch", 0, False
