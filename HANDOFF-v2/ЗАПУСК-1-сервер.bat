@echo off
title Project Drive - SERVER (backend)
cd /d "%~dp0backend"
echo ============================================================
echo   Project Drive - SERVER
echo   Не закрывай это окно, пока тестируешь сайт.
echo   Адрес сервера: http://localhost:3000
echo ============================================================
echo.
"%~dp0tools\node-v22.23.2-win-x64\node.exe" --experimental-sqlite --env-file=.env server.mjs
echo.
echo Сервер остановлен. Можно закрыть окно.
pause >nul
