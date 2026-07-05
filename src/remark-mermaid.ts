/**
 * remark 插件：将 ```mermaid 代码块转换为 <pre class="mermaid"> 容器。
 *
 * 不依赖 astro-mermaid 集成（其 injectScript 在 dev/prod 行为不一致），
 * 客户端渲染由 head 注入的脚本统一负责。
 */
import type { Plugin } from 'unified';
import type { Root, Code, Html } from 'mdast';

interface RemarkMermaidOptions {
  /** 传递给 data-diagram 的属性名，默认 'data-diagram' */
  dataAttr?: string;
}

export const remarkMermaid: Plugin<[RemarkMermaidOptions?], Root> = (options = {}) => {
  const dataAttr = options.dataAttr ?? 'data-diagram';

  return (tree) => {
    walk(tree, (node, index, parent) => {
      if (node.type === 'code' && node.lang === 'mermaid') {
        const escaped = escapeHtml(node.value);
        const htmlNode: Html = {
          type: 'html',
          value: `<pre class="mermaid" ${dataAttr}="${escaped}"></pre>`,
        };
        if (parent && typeof index === 'number') {
          parent.children[index] = htmlNode;
        }
      }
    });
  };
};

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Visitor = (
  node: any,
  index: number | null,
  parent: any
) => void;

function walk(tree: any, visitor: Visitor) {
  if (!tree || !tree.children) return;
  const children = tree.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    visitor(child, i, tree);
    if (child.children) walk(child, visitor);
  }
}
