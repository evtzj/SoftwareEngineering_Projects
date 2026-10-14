@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
node "%~dp0server.mjs" --open
set "launch_exit=%errorlevel%"
if "%launch_exit%"=="0" goto finished
echo.
echo 网站启动失败，请保留或截图上面的错误信息。
:finished
pause
exit /b %launch_exit%
:missing_node
echo 请先安装 Node.js，然后重新打开此文件。
pause
exit /b 1
