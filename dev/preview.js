// Builds the preview page from the real side panel files, so there is no copy to keep in sync.
(async () => {
  const markup = await fetch('../sidepanel.html').then((r) => r.text());
  const panel = new DOMParser().parseFromString(markup, 'text/html');

  document.title = 'BetterTabs preview';
  document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '../sidepanel.css' }));
  for (const node of panel.querySelectorAll('script')) node.remove();
  document.body.replaceChildren(...panel.body.childNodes);

  // The mock must exist before the panel script runs.
  for (const src of ['mock-chrome.js', '../sidepanel.js']) {
    await new Promise((resolve, reject) => {
      document.body.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: reject }));
    });
  }
})();
