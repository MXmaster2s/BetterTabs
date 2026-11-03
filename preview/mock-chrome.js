// A stand-in for the chrome.* APIs the side panel uses, so the panel can be
// opened and tested in an ordinary browser tab with made-up tabs.
// Used only by preview/index.html. It is not part of the extension.
(() => {
  const now = Date.now();
  const min = 60e3;

  // [windowId, title, url, minutes since last used, groupId, extra fields]
  const sample = [
    [1, 'Inbox (12) - sam@example.com - Gmail', 'https://mail.google.com/mail/u/0/#inbox', 2, -1],
    [1, 'acme/app: Pull requests', 'https://github.com/acme/app/pulls', 5, 10],
    [1, 'Fix login redirect by dev · Pull Request #131', 'https://github.com/acme/app/pull/131', 40, 10],
    [1, 'Chrome side panel API reference', 'https://developer.chrome.com/docs/extensions/reference/api/sidePanel', 0, -1],
    [1, 'chrome.tabs API reference', 'https://developer.chrome.com/docs/extensions/reference/api/tabs', 90, -1],
    [1, 'Inbox (12) - sam@example.com - Gmail', 'https://mail.google.com/mail/u/0/#label/receipts', 300, -1],
    [1, 'Settings', 'chrome://settings/', 600, -1],
    [1, 'Acme: Know what you pay for', 'https://acme.example/', 25, 11],
    [1, 'Pricing | Acme', 'https://acme.example/pricing', 26, 11],
    [1, 'Search Console - Performance', 'https://search.google.com/search-console/performance', 3000, 11],
    [1, 'Billing & plans - Settings', 'https://github.com/settings/billing/summary', 14, 10],
    [1, 'YouTube', 'https://www.youtube.com/', 8, -1],
    [1, 'Lo-fi beats to code to', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 3, -1, { audible: true }],
    [2, 'Gift ideas - Google Search', 'https://www.google.com/search?q=gift+ideas', 7000, -1],
    [2, 'Cloudflare dashboard', 'https://dash.cloudflare.com/', 200, -1, { pinned: true }],
    [2, 'acme.example | Netlify', 'https://app.netlify.com/sites/acme', 260, -1],
    [2, 'Fix login redirect by dev · Pull Request #131', 'https://github.com/acme/app/pull/131', 900, -1],
    [2, 'New Tab', 'chrome://newtab/', 1, -1],
    [2, 'A very long title that keeps going, to check how the ellipsis behaves in a narrow panel', 'https://news.ycombinator.com/item?id=41234567', 12000, -1],
  ];

  let tabs = sample.map(([windowId, title, url, ago, groupId, extra], i) => ({
    id: 100 + i,
    windowId,
    title,
    url,
    groupId,
    index: 0,
    active: false,
    pinned: false,
    audible: false,
    lastAccessed: now - ago * min,
    ...extra,
  }));

  const reindex = () => {
    for (const w of [1, 2]) tabs.filter((t) => t.windowId === w).forEach((t, i) => (t.index = i));
  };
  reindex();
  tabs.find((t) => t.title.startsWith('Chrome side panel')).active = true;
  tabs.find((t) => t.title === 'New Tab').active = true;

  const groups = [
    { id: 10, title: 'Code review', color: 'purple', windowId: 1 },
    { id: 11, title: 'Launch', color: 'green', windowId: 1 },
  ];

  const listeners = [];
  const event = () => ({ addListener: (fn) => listeners.push(fn) });
  const fire = () => listeners.forEach((fn) => fn());
  // Like Chrome: what is saved to disk (local) survives a reload, and memory (session) does not.
  // Tab storage stands in for the disk, so the preview shows what a restart brings back.
  const store = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('mock-local') ?? '{}');
    } catch {
      return {};
    }
  })();
  const sessionStore = {};
  // A few made-up backups so the Backups screen has something to show on the first visit.
  if (sessionStorage.getItem('mock-local') == null) {
    const tab = (title, url, pinned) => ({ title, url, ...(pinned && { pinned }) });
    store.backups = [
      { at: now - 6 * min, windows: [[tab('Inbox - Gmail', 'https://mail.google.com/mail/u/0/#inbox'), tab('Pull requests', 'https://github.com/acme/app/pulls'), tab('Cloudflare dashboard', 'https://dash.cloudflare.com/', true)], [tab('Gift ideas - Google Search', 'https://www.google.com/search?q=gift+ideas')]] },
      { at: now - 26 * 60 * min, windows: [[tab('Docs', 'https://docs.example/start'), tab('Pricing | Acme', 'https://acme.example/pricing')]] },
    ];
  }

  window.chrome = {
    tabs: {
      query: async ({ windowId } = {}) => tabs.filter((t) => windowId == null || t.windowId === windowId).map((t) => ({ ...t })),
      update: async (id, props = {}) => {
        const tab = tabs.find((t) => t.id === id);
        if ('pinned' in props) {
          tab.pinned = props.pinned;
          fire();
          return { ...tab };
        }
        for (const t of tabs) if (t.windowId === tab.windowId) t.active = false;
        tab.active = true;
        tab.lastAccessed = Date.now();
        fire();
      },
      create: async ({ url }) => {
        const tab = { id: 2000 + tabs.length, windowId: 1, title: url, url, groupId: -1, index: 0, active: false, pinned: false, audible: false, lastAccessed: Date.now() };
        for (const t of tabs) if (t.windowId === 1) t.active = false;
        tab.active = true;
        tabs.push(tab);
        reindex();
        fire();
        return { ...tab };
      },
      remove: async (ids) => {
        ids = [].concat(ids);
        tabs = tabs.filter((t) => !ids.includes(t.id));
        reindex();
        fire();
      },
      onCreated: event(),
      onRemoved: event(),
      onUpdated: { addListener: (fn) => listeners.push(() => fn(0, { title: '' })) },
      onActivated: event(),
      onMoved: event(),
      onAttached: event(),
      onDetached: event(),
      onReplaced: { addListener: () => {} },
      discard: async (id) => {
        const tab = tabs.find((t) => t.id === id);
        if (!tab || tab.active) return undefined;
        tab.discarded = true;
        fire();
        return { ...tab };
      },
    },
    tabGroups: {
      query: async () => groups,
      onCreated: event(),
      onRemoved: event(),
      onUpdated: event(),
      onMoved: event(),
    },
    windows: {
      getCurrent: async () => ({ id: 1 }),
      create: async ({ url }) => {
        const windowId = Math.max(...tabs.map((t) => t.windowId)) + 1;
        [].concat(url).forEach((u, i) => {
          tabs.push({ id: 1000 + tabs.length, windowId, title: u, url: u, groupId: -1, index: i, active: i === 0, pinned: false, audible: false, lastAccessed: Date.now() });
        });
        fire();
        return { id: windowId };
      },
      update: async () => {},
      onFocusChanged: event(),
    },
    storage: {
      local: {
        get: async () => ({ ...store }),
        remove: async (key) => {
          delete store[key];
          try {
            sessionStorage.setItem('mock-local', JSON.stringify(store));
          } catch {
            // Storage is blocked: see set().
          }
        },
        set: async (values) => {
          Object.assign(store, values);
          try {
            sessionStorage.setItem('mock-local', JSON.stringify(store));
          } catch {
            // Storage is blocked: the preview still works, it just forgets on reload.
          }
        },
      },
      session: {
        get: async () => ({ ...sessionStore }),
        set: async (values) => Object.assign(sessionStore, values),
        remove: async (key) => delete sessionStore[key],
      },
      onChanged: { addListener: () => {} },
    },
    commands: {
      getAll: async () => [
        { name: 'open-panel', shortcut: 'Alt+Shift+B' },
        { name: 'search-tabs', shortcut: 'Alt+Shift+F' },
      ],
    },
    runtime: {},
  };
})();
