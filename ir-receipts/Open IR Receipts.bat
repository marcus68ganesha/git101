@echo off
rem Opens IR Receipts in its own Microsoft Edge window (works offline).
start "" msedge --app="file:///%~dp0index.html"
if errorlevel 1 start "" "%~dp0index.html"
