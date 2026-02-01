$ErrorActionPreference = "Stop"

Write-Host "[ComfyUI Desktop] Installing dependencies..."
npm install

Write-Host "[ComfyUI Desktop] Building Windows installer..."
npm run dist
