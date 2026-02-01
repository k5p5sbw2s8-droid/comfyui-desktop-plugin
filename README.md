# ComfyUI Desktop Plugin (Windows)

本仓库提供一个面向普通用户的 **Windows 11 桌面应用** 方案，用于将“UI 参数配置 → ComfyUI 工作流 JSON 生成 → 队列执行 → 结果回传 UI”打通。该仓库当前提供：

- 🧭 方案架构与模块拆分说明
- 🧩 工作流模板系统（JSON 模板）
- 🧠 能力/节点依赖清单（可扩展配置）
- 🧰 自检脚本骨架（API 连通性 + 模板校验入口）

> 目标：为可安装的 Windows 应用打下可维护的工作流与能力配置基础，并作为后续 UI/后端实现的蓝图。

---

## 目录结构

```
configs/
  abilities.json                  # 节点能力与依赖映射
  parameters.schema.json          # UI 参数 schema（按任务类型）

workflows/
  templates/
    txt2img.json                  # 文生图模板
    img2video.json                # 图生视频模板
    video-to-video.json           # 视频生视频模板
    reference-image.json          # 参考图一致性模板
    frame-interpolation.json      # 补帧模板
    image-upscale.json            # 超分/修复模板

docs/
  ARCHITECTURE.md                 # 体系架构说明
  TEMPLATE_SPEC.md                # 模板占位符规则与校验建议

scripts/
  selfcheck.ps1                   # 自检脚本骨架（可扩展）
```

---

## 技术路线建议（已在架构文档中详细展开）

- **桌面端**：Electron + TypeScript + React（UI）
- **后端**：Node.js + Python 子进程（管理 ComfyUI）
- **通信**：HTTP API + WebSocket（ComfyUI 官方）
- **工作流模板**：JSON 模板 + 占位符替换（按任务类型）
- **能力管理**：基于 `configs/abilities.json` 的节点扫描 + 缺失提示 + 一键安装建议

> 对应需求：自动检测 ComfyUI 路径、可启动/停止、端口检测、队列提交、进度回传、错误诊断与报告导出。

---

## 使用方式（可运行桌面应用）

### 1) 安装依赖

```bash
npm install
```

### 2) 启动桌面应用

```bash
npm start
```

### 3) 运行流程

1. 在应用右上角填写 ComfyUI Host/Port 并点击「连接」。
2. 连接成功后会自动拉取 Checkpoint 列表与能力清单。
3. 左侧选择任务类型并填写参数。
4. 点击「生成并提交」，应用会用模板生成 workflow JSON 并提交到队列。
5. 中间面板展示队列与日志，右侧展示结果 JSON（可据此定位输出）。
6. 确保本地 ComfyUI 已启动并允许 HTTP/WS 访问。

### 4) 打包 Windows 安装包（NSIS）

```bash
npm run dist
```

> 产物位于 `dist/` 目录。你可以在 Windows 11 机器上直接运行安装包。

### 5) Windows 一键脚本

```powershell
./scripts/start-ui.ps1
```

```powershell
./scripts/build-win.ps1
```

> 详细说明见 `docs/WINDOWS_QUICKSTART.md`。

---

## 模板与能力配置说明

- 工作流模板采用 **占位符字段**（如 `${prompt}`、`${width}`），由 UI 表单参数替换。
- `abilities.json` 维护“能力 → 依赖节点/模型/安装方式”的映射，用于节点缺失提示与安装指引。
- `parameters.schema.json` 描述每个任务类型所需参数、类型与默认值。

详细规则请见：`docs/TEMPLATE_SPEC.md`。

---

## 下一步建议

- UI：实现左侧参数、中央任务队列、右侧结果预览三栏布局。
- 后端：实现 ComfyUI 启停、端口检测、任务队列、WS 进度监听、错误报告导出。
- 安装包：Windows 安装器（NSIS/InnoSetup） + 内置 FFmpeg 检测/引导。

---

## 自检脚本（占位骨架）

运行 PowerShell 脚本：

```powershell
./scripts/selfcheck.ps1 -ComfyRoot "D:\ComfyUI" -Host "127.0.0.1" -Port 8188
```

当前脚本仅提供检查流程骨架，请根据项目实现补充逻辑。
