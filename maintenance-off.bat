@echo off
echo Bringing portal back ONLINE...
python -c "import json; f=open('config.json','r+'); d=json.load(f); d['maintenance']=False; f.seek(0); json.dump(d,f,indent=2); f.truncate(); f.close(); print('Done.')"
git add config.json
git commit -m "Disable maintenance mode"
git push origin master
echo.
echo Portal is now ONLINE.
pause
