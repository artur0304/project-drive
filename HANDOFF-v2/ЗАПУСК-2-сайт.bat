@echo off
title Project Drive - SITE (frontend)
cd /d "%~dp0web"
echo ============================================================
echo   Project Drive - САЙТ
echo   Первый запуск может думать 1-2 минуты - это нормально.
echo   Когда увидишь "Ready", открой в браузере:
echo       http://localhost:3001
echo   Не закрывай это окно, пока тестируешь.
echo ============================================================
echo.
call "%~dp0tools\node-v22.23.2-win-x64\npm.cmd" run dev
echo.
pause >nul
