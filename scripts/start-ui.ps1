$ErrorActionPreference = "Stop"

Write-Host "[ComfyUI Desktop] Installing dependencies..."
npm install

Write-Host "[ComfyUI Desktop] Launching UI..."
npm start
