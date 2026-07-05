/**
 * Mermaid 客户端渲染脚本（字符串形式，注入到 <head> 中执行）。
 *
 * 设计说明：
 * - 从 CDN 动态 import mermaid@11，避免 bare module specifier 在浏览器中无法解析。
 * - remark 插件已将 ```mermaid 代码块转为 <pre class="mermaid" data-diagram="...">。
 * - 本脚本负责：加载 mermaid → 渲染 SVG → 添加放大按钮 → 弹层缩放/拖拽交互。
 * - 兼容 Astro View Transitions（astro:after-swap）与主题切换（MutationObserver）。
 *
 * @param cdnUrl mermaid ESM CDN 地址
 */
export function buildMermaidHeadScript(cdnUrl: string): string {
  return `
    let zoomState = { scale: 1, x: 0, y: 0 };
    let overlayEl = null;
    let mermaidReady = null;

    function closeZoom() {
      if (overlayEl) { overlayEl.remove(); overlayEl = null; }
      document.body.style.overflow = '';
    }

    function applyTransform(container) {
      container.style.transform =
        'translate(' + zoomState.x + 'px,' + zoomState.y + 'px) scale(' + zoomState.scale + ')';
      const pct = overlayEl && overlayEl.querySelector('.mermaid-zoom-pct');
      if (pct) pct.textContent = Math.round(zoomState.scale * 100) + '%';
    }

    function openZoom(svgString) {
      if (overlayEl) closeZoom();

      overlayEl = document.createElement('div');
      overlayEl.className = 'mermaid-overlay';
      overlayEl.innerHTML =
        '<button class="mermaid-close" aria-label="关闭">✕</button>' +
        '<div class="mermaid-zoom-stage"><div class="mermaid-zoom-container">' +
        svgString + '</div></div>' +
        '<div class="mermaid-toolbar">' +
          '<button class="mermaid-tool" data-act="out" aria-label="缩小">−</button>' +
          '<span class="mermaid-zoom-pct">100%</span>' +
          '<button class="mermaid-tool" data-act="in" aria-label="放大">+</button>' +
          '<button class="mermaid-tool" data-act="reset" aria-label="重置">⟳</button>' +
        '</div>';

      document.body.appendChild(overlayEl);
      document.body.style.overflow = 'hidden';

      const container = overlayEl.querySelector('.mermaid-zoom-container');
      const svg = container.querySelector('svg');
      if (svg) { svg.style.width = '90vw'; svg.style.maxWidth = '90vw'; svg.style.maxHeight = '80vh'; svg.style.height = 'auto'; }

      zoomState = { scale: 1, x: 0, y: 0 };
      applyTransform(container);

      const stage = overlayEl.querySelector('.mermaid-zoom-stage');

      stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const newScale = Math.min(Math.max(zoomState.scale * factor, 0.25), 6);
        zoomState.x = zoomState.x - cx * (newScale / zoomState.scale - 1);
        zoomState.y = zoomState.y - cy * (newScale / zoomState.scale - 1);
        zoomState.scale = newScale;
        applyTransform(container);
      }, { passive: false });

      let dragging = false, sx, sy;
      stage.addEventListener('mousedown', (e) => {
        dragging = true; sx = e.clientX - zoomState.x; sy = e.clientY - zoomState.y;
        stage.style.cursor = 'grabbing';
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        zoomState.x = e.clientX - sx; zoomState.y = e.clientY - sy;
        applyTransform(container);
      });
      window.addEventListener('mouseup', () => { dragging = false; stage.style.cursor = 'grab'; });

      let tDragging = false, tx, ty;
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        tDragging = true; tx = e.touches[0].clientX - zoomState.x; ty = e.touches[0].clientY - zoomState.y;
      }, { passive: true });
      stage.addEventListener('touchmove', (e) => {
        if (!tDragging || e.touches.length !== 1) return;
        zoomState.x = e.touches[0].clientX - tx; zoomState.y = e.touches[0].clientY - ty;
        applyTransform(container);
      }, { passive: true });
      stage.addEventListener('touchend', () => { tDragging = false; });

      stage.addEventListener('dblclick', () => {
        zoomState.scale = zoomState.scale > 1.5 ? 1 : 2;
        zoomState.x = 0; zoomState.y = 0;
        applyTransform(container);
      });

      overlayEl.querySelector('.mermaid-toolbar').addEventListener('click', (e) => {
        const act = e.target.closest('button')?.dataset.act;
        if (!act) return;
        if (act === 'in') zoomState.scale = Math.min(zoomState.scale * 1.25, 6);
        if (act === 'out') zoomState.scale = Math.max(zoomState.scale / 1.25, 0.25);
        if (act === 'reset') { zoomState.scale = 1; zoomState.x = 0; zoomState.y = 0; }
        applyTransform(container);
      });

      overlayEl.querySelector('.mermaid-close').addEventListener('click', closeZoom);
      overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) closeZoom(); });
      const escHandler = (e) => { if (e.key === 'Escape') { closeZoom(); window.removeEventListener('keydown', escHandler); } };
      window.addEventListener('keydown', escHandler);
    }

    function getTheme() {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
    }

    function loadMermaid() {
      if (mermaidReady) return mermaidReady;
      mermaidReady = import('${cdnUrl}')
        .then((mod) => {
          const m = mod.default;
          m.initialize({ startOnLoad: false, theme: getTheme(), flowchart: { curve: 'basis' }, timeline: { padding: 16 } });
          return m;
        });
      return mermaidReady;
    }

    async function renderAndEnhance(el) {
      if (el.dataset.enhanced) return;
      const src = el.getAttribute('data-diagram') || '';
      if (!src) return;

      try {
        const m = await loadMermaid();
        const id = 'm-' + Math.random().toString(36).slice(2, 9);
        const { svg } = await m.render(id, src);

        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-wrapper';
        wrapper.innerHTML = svg;

        const btn = document.createElement('button');
        btn.className = 'mermaid-expand-btn';
        btn.setAttribute('aria-label', '放大查看');
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
        wrapper.appendChild(btn);

        el.innerHTML = '';
        el.appendChild(wrapper);
        el.dataset.enhanced = 'true';

        const svgStr = wrapper.querySelector('svg').outerHTML;
        btn.addEventListener('click', (e) => { e.stopPropagation(); openZoom(svgStr); });
        wrapper.addEventListener('click', () => openZoom(svgStr));
      } catch (err) {
        el.dataset.enhanced = 'true';
        el.innerHTML = '<div style="color:red;padding:1rem"><strong>Mermaid 渲染失败:</strong> ' + (err.message || err) + '</div>';
      }
    }

    function initAll() {
      document.querySelectorAll('pre.mermaid:not([data-enhanced])').forEach(renderAndEnhance);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }

    document.addEventListener('astro:after-swap', initAll);

    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          mermaidReady = null;
          document.querySelectorAll('pre.mermaid[data-enhanced]').forEach((el) => {
            delete el.dataset.enhanced;
          });
          setTimeout(initAll, 100);
        }
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  `;
}
