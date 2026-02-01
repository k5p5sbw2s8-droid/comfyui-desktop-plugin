# 架构设计（Windows 桌面应用 + ComfyUI）

## 总览

目标：让普通用户在桌面 UI 中配置参数，并由应用自动生成 ComfyUI workflow JSON，提交队列执行，实时回传进度与结果。

**推荐技术栈**

- 桌面：Electron + TypeScript + React
- 后端：Node.js（本地服务）+ Python 子进程（ComfyUI 管理）
- 通信：HTTP API + WebSocket（ComfyUI 官方）

---

## 模块拆分

### 1) App UI（Electron Renderer）
- 左侧：任务类型选择 + 参数表单
- 中间：任务队列与进度（排队/运行/失败/完成）
- 右侧：结果预览（图片/视频）+ 输出目录操作

### 2) App Core（Electron Main / Node）
- ComfyUI 进程管理：启动/停止、日志捕获、端口检测
- 模板生成器：读取模板 + 表单参数 → workflow JSON
- 任务调度器：队列、重试、取消、并发限制
- 报告导出：workflow JSON + 参数 + 日志 + 版本信息

### 3) ComfyUI 连接层
- HTTP API：提交 prompt、获取历史、图片预览、队列操作
- WebSocket：进度推送、节点级状态

---

## 关键数据结构

### 1) 参数 Schema
- 存放于 `configs/parameters.schema.json`
- 描述每种任务的参数、类型、默认值、范围

### 2) 工作流模板
- 存放于 `workflows/templates/*.json`
- 以占位符字段表示动态参数
- 由模板引擎替换为实际值

### 3) 能力/依赖映射
- 存放于 `configs/abilities.json`
- 记录节点依赖、模型依赖、安装建议

---

## 运行流程

1. 启动应用 → 检测/选择 ComfyUI 路径
2. 扫描 custom_nodes + models → 生成能力清单
3. 选择任务类型 → 动态渲染参数表单
4. 生成 workflow JSON → 提交到 ComfyUI queue
5. WebSocket 监听进度 → UI 实时更新
6. 完成后展示输出文件 → 支持再次使用/保存预设

---

## 错误处理与可维护性

- 常见错误分类与提示：端口占用、模型缺失、节点缺失、OOM、FFmpeg 缺失
- 输出可复现报告（workflow JSON + 参数 + logs + 版本信息）
- 模板/能力/参数 schema 可配置化，方便扩展
