# Windows 快速启动

## 方案 A：开发模式直接启动 UI

1. 安装 Node.js (LTS 版本)。
2. 打开 PowerShell，进入项目目录。
3. 运行：

```powershell
./scripts/start-ui.ps1
```

该脚本会执行依赖安装并启动 Electron UI。

## 方案 B：打包 Windows 安装包

```powershell
./scripts/build-win.ps1
```

构建完成后，安装包位于 `dist/` 目录，双击即可安装并运行。

> 注意：打包需要联网下载 Electron 构建依赖。
