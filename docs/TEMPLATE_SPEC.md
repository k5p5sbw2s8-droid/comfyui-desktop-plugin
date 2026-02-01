# 工作流模板规范

## 1. 目的

工作流模板用于把 UI 参数映射为 ComfyUI 可执行的 workflow JSON。模板在提交前需要被替换成完整的 JSON。

---

## 2. 占位符规则

- 使用 `${name}` 占位符表示变量
- 变量来源于 `parameters.schema.json` 中定义的字段
- 未填值时使用 schema 中的默认值

示例：

```json
{
  "class_type": "CLIPTextEncode",
  "inputs": {
    "text": "${prompt}",
    "clip": ["2", 1]
  }
}
```

---

## 3. 校验建议

模板解析时建议验证：

1. 所有占位符都能在 schema 中找到
2. 参数类型匹配（数值/字符串/布尔）
3. 节点依赖是否存在于能力清单

---

## 4. 模板命名

- text-to-image.json
- image-to-video.json
- video-to-video.json
- reference-image.json
- frame-interpolation.json
- image-upscale.json

---

## 5. 版本与扩展

建议在模板根级加入元数据字段，例如：

```json
{
  "_meta": {
    "name": "Text-to-Image",
    "version": "1.0",
    "requires": ["base-checkpoint", "vae"]
  },
  "nodes": { ... }
}
```

以便后续维护与升级。
