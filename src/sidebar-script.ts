/**
 * 侧边栏折叠按钮客户端脚本。
 *
 * @returns 注入到 <head> 中的 script 内容
 */
export function buildSidebarToggleScript(): string {
  return `
    function initSidebarToggle() {
      if (document.querySelector('.sidebar-toggle-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'sidebar-toggle-btn';
      btn.setAttribute('aria-label', '切换侧边栏');
      btn.textContent = '\\u00AB';
      btn.title = '收起侧边栏';
      document.body.appendChild(btn);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('sidebar-collapsed');
        btn.innerHTML = document.body.classList.contains('sidebar-collapsed') ? '\\u00BB' : '\\u00AB';
        btn.title = document.body.classList.contains('sidebar-collapsed') ? '展开侧边栏' : '收起侧边栏';
        window.dispatchEvent(new Event('resize'));
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSidebarToggle);
    } else {
      initSidebarToggle();
    }
    document.addEventListener('astro:after-swap', () => {
      setTimeout(initSidebarToggle, 50);
    });
  `;
}
