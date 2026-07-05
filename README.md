# starlight-kb-theme

Astro Starlight 知识库主题集成包。封装了 Mermaid 图表交互渲染、KaTeX 数学公式、中文排版优化等功能，让知识库站点只需专注于撰写 Markdown 内容。

## 功能

- **Mermaid 图表**：remark 插件转换代码块 + 客户端 CDN 渲染，支持点击放大、拖拽移动、滚轮缩放
- **KaTeX 公式**：封装 starlight-katex，一行配置启用
- **中文排版**：优化字体、行高、标题字号、表格样式
- **暗色模式**：图表和公式自动适配明暗主题
- **View Transitions**：页面切换时图表自动重渲染

## 安装

```bash
npm install starlight-kb-theme
```

## 使用

在 `astro.config.mjs` 中：

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { starlightKbTheme } from 'starlight-kb-theme';

export default defineConfig({
  integrations: [
    starlight({
      title: '我的知识库',
      defaultLocale: 'zh',
      plugins: [starlightKbTheme()],
      sidebar: [
        { label: '笔记', autogenerate: { directory: 'notes' } },
      ],
    }),
  ],
});
```

仅需这一行插件配置，Mermaid、KaTeX、样式全部自动注入。

## 配置选项

```typescript
starlightKbTheme({
  // Mermaid ESM CDN 地址（默认 jsdelivr mermaid@11）
  mermaidCdnUrl: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs',

  // 是否启用 KaTeX（默认 true）
  katex: true,

  // 是否启用侧边栏折叠按钮（默认 false）
  sidebarToggle: true,
})
```

## 工作原理

```
Markdown 源文件
    │
    ▼
remark-mermaid 插件          ← 将 ```mermaid 代码块转为
    │                          <pre class="mermaid" data-diagram="...">
    ▼
Astro 构建 (Shiki 跳过 mermaid)
    │
    ▼
HTML 页面
    │  ◄── head 注入的 <script>
    │      从 CDN 加载 mermaid@11
    │      查询所有 pre.mermaid 元素
    │      调用 mermaid.render() 生成 SVG
    │      包装交互层 + 放大按钮
    ▼
浏览器渲染结果
```

### 为什么不用 astro-mermaid？

`astro-mermaid` 在 dev 和 prod 环境下行为不一致（`injectScript` 时机问题）。本方案改用 remark 插件预处理 + head 脚本统一渲染，确保一致性。

### 为什么从 CDN 加载 Mermaid？

浏览器内联 `<script type="module">` 中的 `import 'mermaid'` 会因 bare module specifier 解析失败。改用 CDN URL 的完整 ESM 路径可避免此问题。

## 模块结构

```
src/
├── index.ts            # 插件入口（StarlightPlugin）
├── remark-mermaid.ts   # remark 插件
├── mermaid-script.ts   # 客户端渲染脚本（字符串生成）
└── styles/
    ├── index.css       # 样式入口
    ├── typography.css  # 中文字体/排版
    ├── tables-code.css # 表格/代码块
    ├── mermaid.css     # Mermaid 交互样式
    └── katex.css       # KaTeX 兼容样式
```

## 导出

| 导入路径 | 说明 |
|---------|------|
| `starlight-kb-theme` | 主入口，导出 `starlightKbTheme()` 插件函数 |
| `starlight-kb-theme/remark-mermaid` | 单独导出 `remarkMermaid` 插件 |
| `starlight-kb-theme/styles/*` | 单独 CSS 模块文件 |
