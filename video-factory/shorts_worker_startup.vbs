' DecodedSix shorts worker: saves approved Shorts to C:\Users\Kelvin\Videos\DecodedSix\approvals
' (and opens the folder), remakes rejected Shorts, and renders drafts back into the review queue.
' Runs hidden at login. Delete this file to stop it starting automatically.
CreateObject("WScript.Shell").Run "wsl.exe -d Ubuntu-22.04 --cd /mnt/c/Users/Kelvin/projects/decoded-six -e video-factory/.venv/bin/python video-factory/shorts_worker.py --watch", 0, False
