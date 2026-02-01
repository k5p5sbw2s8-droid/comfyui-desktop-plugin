param(
  [string]$ComfyRoot = "",
  [string]$Host = "127.0.0.1",
  [int]$Port = 8188
)

Write-Host "[SelfCheck] ComfyUI Root: $ComfyRoot"
Write-Host "[SelfCheck] Host: $Host"
Write-Host "[SelfCheck] Port: $Port"

# 1) 检查 ComfyUI 路径
if ($ComfyRoot -eq "" -or !(Test-Path $ComfyRoot)) {
  Write-Warning "ComfyUI 根目录未设置或不存在。"
} else {
  Write-Host "ComfyUI 根目录存在。"
}

# 2) 检查端口连通性
$uri = "http://$Host`:$Port/queue"
try {
  $response = Invoke-WebRequest -Uri $uri -Method Get -TimeoutSec 3
  Write-Host "ComfyUI API 可访问：$($response.StatusCode)"
} catch {
  Write-Warning "无法访问 ComfyUI API：$uri"
}

# 3) 模板占位符校验（占位骨架）
Write-Host "模板校验：请在项目实现中补充占位符解析与 schema 校验逻辑。"
