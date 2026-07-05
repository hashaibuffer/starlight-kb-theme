/**
 * starlight-kb-theme
 *
 * 一个 Astro Starlight 插件，为知识库站点提供：
 * - Mermaid 图表渲染 + 交互式缩放/拖拽
 * - KaTeX 数学公式（remark-math + rehype-katex + katex CSS）
 * - 中文排版优化、表格样式
 *
 * 使用方式见 packages/starlight-kb-theme/README.md
 */
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { AstroIntegration } from 'astro';
import type { StarlightPlugin } from '@astrojs/starlight/types';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkMermaid } from './remark-mermaid';
import { buildMermaidHeadScript } from './mermaid-script';

export interface StarlightKbThemeOptions {
  /**
   * Mermaid ESM 的 CDN 地址。
   * 默认使用 jsdelivr 上的 mermaid@11。
   */
  mermaidCdnUrl?: string;
  /**
   * 是否启用 KaTeX 数学公式支持（默认 true）。
   * 启用后会注入 remark-math + rehype-katex + katex.css。
   */
  katex?: boolean;
}

const DEFAULT_MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

/** 主题 CSS 的绝对路径（随包发布） */
const themeCssPath = fileURLToPath(new URL('./styles/index.css', import.meta.url));

const require = createRequire(import.meta.url);

/**
 * Astro 集成：注入 remark-mermaid + syntaxHighlight 排除 mermaid + KaTeX（可选）。
 *
 * Starlight 插件的 updateConfig 不暴露 markdown 字段，故需 Astro 集成层。
 */
function kbThemeAstroIntegration(katex: boolean): AstroIntegration {
  return {
    name: 'starlight-kb-theme-astro',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        const remarkPlugins = [
          ...(config.markdown?.remarkPlugins ?? []),
          remarkMermaid,
        ];

        const rehypePlugins = [...(config.markdown?.rehypePlugins ?? [])];

        if (katex) {
          remarkPlugins.push(remarkMath);
          rehypePlugins.push(rehypeKatex);
        }

        const syntaxHighlight = config.markdown?.syntaxHighlight;
        const excludeLangs = [
          ...(syntaxHighlight?.type === 'shiki' ? (syntaxHighlight.excludeLangs ?? []) : []),
          'mermaid',
        ];

        const newConfig: Record<string, unknown> = {
          markdown: {
            remarkPlugins,
            rehypePlugins,
            syntaxHighlight: {
              type: 'shiki',
              excludeLangs,
            },
          },
        };

        if (katex) {
          newConfig.vite = {
            ssr: {
              noExternal: ['katex'],
            },
          };
        }

        updateConfig(newConfig);
      },
    },
  };
}

export function starlightKbTheme(options: StarlightKbThemeOptions = {}): StarlightPlugin {
  const {
    mermaidCdnUrl = DEFAULT_MERMAID_CDN,
    katex = true,
  } = options;

  const mermaidScript = buildMermaidHeadScript(mermaidCdnUrl);

  return {
    name: 'starlight-kb-theme',
    hooks: {
      'config:setup'({ config, updateConfig, addIntegration }) {
        const existingHead = Array.isArray(config.head) ? config.head : [];
        const existingCss = Array.isArray(config.customCss) ? config.customCss : [];

        const newCss = [...existingCss, themeCssPath];

        if (katex) {
          const katexCssPath = require.resolve('katex/dist/katex.min.css');
          newCss.push(katexCssPath);
        }

        updateConfig({
          head: [
            ...(existingHead as any[]),
            {
              tag: 'script',
              attrs: { type: 'module' },
              content: mermaidScript,
            },
          ],
          customCss: newCss,
        });

        addIntegration(kbThemeAstroIntegration(katex));
      },
    },
  };
}

export { remarkMermaid } from './remark-mermaid';
export { buildMermaidHeadScript } from './mermaid-script';
