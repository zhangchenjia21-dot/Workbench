@echo off
setlocal
chcp 65001 >nul
set "WorkbenchExe=%~dp0out\win-unpacked\Workbench.exe"
if not exist "%WorkbenchExe%" (
  echo 未找到 Workbench 的 Windows 打包应用。
  echo.
  echo 预期位置：%WorkbenchExe%
  echo 请让维护者准备完整的打包目录后，再双击本文件。
  echo 不要只复制 Workbench.exe；需要完整的 out\win-unpacked 目录。
  echo.
  pause
  exit /b 1
)
start "" /d "%~dp0out\win-unpacked" "%WorkbenchExe%"
if errorlevel 1 (
  echo Workbench 启动失败，请将此提示反馈给维护者。
  pause
  exit /b 1
)
exit /b 0
