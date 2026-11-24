@echo off
chcp 65001 >nul
title Dong goi bo cai TeachStash Setup
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-installer.ps1"
pause

