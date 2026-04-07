@echo off
echo Putting portal into MAINTENANCE MODE...
python -c "import json; f=open('config.json','r+'); d=json.load(f); d['maintenance']=True; f.seek(0); json.dump(d,f,indent=2); f.truncate(); f.close(); print('Done.')"
git add config.json
git commit -m "Enable maintenance mode"
git push origin master
echo.
echo Portal is now OFFLINE (maintenance page shown to visitors).
pause
