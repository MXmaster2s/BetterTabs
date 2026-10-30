'use strict';

const VIEWS = ['site', 'window', 'recent', 'group'];
const NO_GROUP = -1;

// Chrome's own tab group colours, so the Groups view matches the tab strip.
const GROUP_COLOURS = {
  grey: '#5f6368',
  blue: '#1a73e8',
  red: '#d93025',
  yellow: '#f9ab00',
  green: '#188038',
  pink: '#d01884',
  purple: '#a142f4',
  cyan: '#007b83',
  orange: '#fa903e',
};

const state = {
  view: 'site',
  query: '',
  collapsed: new Set(),
  tabs: [],
  groups: new Map(),
  windowId: null,
  duplicates: new Set(),
  extraCopies: [],
};

const list = document.getElementById('list');
const search = document.getElementById('search');
const count = document.getElementById('count');
const liveStatus = document.getElementById('status');
const closeDupes = document.getElementById('close-dupes');

let pendingFocus = null;

// ---------- Small helpers ----------

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') el.style.cssText = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

function svg(markup) {
  const wrap = document.createElement('span');
  wrap.innerHTML = markup;
  return wrap.firstElementChild;
}

const ICON_CLOSE = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7m0-7l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICON_CHEVRON = '<svg class="chevron" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function urlOf(tab) {
  return tab.url || tab.pendingUrl || '';
}

function siteOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      const host = u.hostname.replace(/^www\./, '');
      return { key: host, label: host };
    }
    if (u.protocol === 'file:') return { key: '~files', label: 'Files on this computer' };
    if (['chrome:', 'chrome-extension:', 'about:', 'edge:', 'devtools:'].includes(u.protocol)) {
      return { key: '~chrome', label: 'Chrome pages' };
    }
  } catch {
    // Not a URL we can read; falls through to "Other".
  }
  return { key: '~other', label: 'Other' };
}

function pathOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
    const path = decodeURIComponent(u.pathname).replace(/\/$/, '');
    return path ? path + (u.search ? '?…' : '') : 'Home page';
  } catch {
    return url;
  }
}

function hueOf(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return hash % 360;
}

function ago(time) {
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${plural(Math.round(hours / 24), 'day')} ago`;
}

function faviconSrc(url) {
  if (!/^https?:/i.test(url) || !chrome.runtime?.getURL) return null;
  const src = new URL(chrome.runtime.getURL('/_favicon/'));
  src.searchParams.set('pageUrl', url);
  src.searchParams.set('size', '32');
  return src.toString();
}

function favicon(url) {
  const letter = () =>
    h('span', { class: 'favicon favicon-letter', 'aria-hidden': 'true' }, (siteOf(url).label[0] ?? '?').toUpperCase());
  const src = faviconSrc(url);
  if (!src) return letter();
  const img = h('img', { class: 'favicon', src, alt: '', width: 16, height: 16 });
  img.addEventListener('error', () => img.replaceWith(letter()), { once: true });
  return img;
}

// ---------- Reading tabs from Chrome ----------

async function load() {
  const [tabs, groups, current] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({}),
    chrome.windows.getCurrent(),
  ]);
  state.windowId = current.id;
  state.groups = new Map(groups.map((g) => [g.id, g]));
  state.tabs = sortTabs(tabs);
  findDuplicates();
  render();
}

let refreshTimer;
let stale = false;
function refresh() {
  // A hidden panel can't be seen, so skip the work and catch up when it returns.
  if (document.hidden) {
    stale = true;
    return;
  }
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(load, 60);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && stale) {
    stale = false;
    refresh();
  }
});

// Tabs report every loading step; only these changes alter what the list shows.
const VISIBLE_CHANGES = ['title', 'url', 'pinned', 'audible', 'groupId', 'status'];

// This window first, then the others in the order they were opened.
function windowOrder() {
  const ids = [...new Set(state.tabs.map((t) => t.windowId))];
  return ids.sort((a, b) => (a === state.windowId ? -1 : b === state.windowId ? 1 : a - b));
}

function sortTabs(tabs) {
  const rank = (id) => (id === state.windowId ? -Infinity : id);
  return [...tabs].sort((a, b) => rank(a.windowId) - rank(b.windowId) || a.index - b.index);
}

function findDuplicates() {
  // Only exact matches count: apps like Gmail keep different views after the #.
  const byPage = new Map();
  for (const tab of state.tabs) {
    const page = urlOf(tab);
    if (!page) continue;
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(tab);
  }
  state.duplicates = new Set();
  state.extraCopies = [];
  for (const copies of byPage.values()) {
    if (copies.length < 2) continue;
    for (const tab of copies) state.duplicates.add(tab.id);
    // Keep the copy you are looking at, otherwise the one used most recently.
    const keep =
      copies.find((t) => t.active && t.windowId === state.windowId) ??
      [...copies].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
    state.extraCopies.push(...copies.filter((t) => t !== keep).map((t) => t.id));
  }
}

// ---------- Organising tabs into folders ----------

function bySite(tabs) {
  const folders = new Map();
  for (const tab of tabs) {
    const site = siteOf(urlOf(tab));
    if (!folders.has(site.key)) {
      folders.set(site.key, {
        key: site.key,
        label: site.label,
        colour: site.key.startsWith('~') ? null : `hsl(${hueOf(site.key)} 62% 50%)`,
        icon: site.key.startsWith('~') ? null : urlOf(tab),
        tabs: [],
      });
    }
    folders.get(site.key).tabs.push(tab);
  }
  // Busiest sites first; Chrome pages, files and other leftovers last.
  return [...folders.values()].sort(
    (a, b) =>
      a.key.startsWith('~') - b.key.startsWith('~') ||
      b.tabs.length - a.tabs.length ||
      a.label.localeCompare(b.label),
  );
}

function byWindow(tabs) {
  return windowOrder()
    .map((id, i) => ({
      key: `w${id}`,
      label: id === state.windowId ? 'This window' : `Window ${i + 1}`,
      tabs: tabs.filter((t) => t.windowId === id),
    }))
    .filter((folder) => folder.tabs.length);
}

function byRecent(tabs) {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const spans = [
    { key: 'hour', label: 'Last hour', from: now - 3600e3 },
    { key: 'today', label: 'Earlier today', from: startOfDay },
    { key: 'week', label: 'This week', from: now - 7 * 864e5 },
    { key: 'older', label: 'Older', from: -Infinity },
  ];
  const sorted = [...tabs].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  return spans
    .map((span, i) => ({
      key: span.key,
      label: span.label,
      tabs: sorted.filter((t) => {
        const seen = t.lastAccessed ?? 0;
        return seen >= span.from && (i === 0 || seen < spans[i - 1].from);
      }),
    }))
    .filter((folder) => folder.tabs.length);
}

function byGroup(tabs) {
  const folders = new Map();
  for (const tab of tabs) {
    const id = tab.groupId ?? NO_GROUP;
    if (!folders.has(id)) {
      const group = state.groups.get(id);
      folders.set(id, {
        key: id === NO_GROUP ? 'none' : `g${id}`,
        label: id === NO_GROUP ? 'Not in a group' : group?.title || 'Untitled group',
        colour: GROUP_COLOURS[group?.color] ?? null,
        tabs: [],
      });
    }
    folders.get(id).tabs.push(tab);
  }
  // Groups in tab-strip order, loose tabs at the end.
  return [...folders.values()].sort((a, b) => (a.key === 'none') - (b.key === 'none'));
}

function foldersFor(tabs) {
  switch (state.view) {
    case 'window':
      return byWindow(tabs);
    case 'recent':
      return byRecent(tabs);
    case 'group':
      return byGroup(tabs);
    default:
      return bySite(tabs);
  }
}

// ---------- Drawing the list ----------

function render() {
  const focusedId = document.activeElement?.closest?.('.tab')?.dataset.id;
  const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length
    ? state.tabs.filter((t) => {
        const text = `${t.title ?? ''} ${urlOf(t)}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
    : state.tabs;

  const windows = new Set(state.tabs.map((t) => t.windowId)).size;
  count.textContent = words.length
    ? `${shown.length} of ${plural(state.tabs.length, 'tab')} match`
    : `${plural(state.tabs.length, 'tab')} in ${plural(windows, 'window')}`;

  closeDupes.hidden = state.extraCopies.length === 0;
  closeDupes.textContent = `Close ${plural(state.extraCopies.length, 'duplicate')}`;

  const folders = foldersFor(shown);
  list.replaceChildren(...(folders.length ? folders.map(renderFolder) : [renderEmpty()]));

  const rows = visibleRows();
  if (pendingFocus != null) {
    rows[Math.min(pendingFocus, rows.length - 1)]?.focus();
    pendingFocus = null;
  } else if (focusedId) {
    list.querySelector(`.tab[data-id="${focusedId}"] .tab-main`)?.focus();
  }
}

function renderFolder(folder) {
  const id = `${state.view}:${folder.key}`;
  const collapsed = !state.query && state.collapsed.has(id);
  const n = folder.tabs.length;

  return h(
    'section',
    {
      class: 'folder',
      'data-collapsed': collapsed,
      style: folder.colour ? `--base: ${folder.colour}` : null,
    },
    h(
      'div',
      { class: 'folder-head' },
      h(
        'h2',
        null,
        h(
          'button',
          { class: 'folder-tab', type: 'button', 'aria-expanded': String(!collapsed), onclick: () => toggle(id) },
          svg(ICON_CHEVRON),
          folder.icon && favicon(folder.icon),
          h('span', { class: 'folder-name' }, folder.label),
          h('span', { class: 'folder-count' }, n),
        ),
      ),
      h(
        'button',
        {
          class: 'text-button close-all',
          type: 'button',
          'aria-label': `Close all ${plural(n, 'tab')} in ${folder.label}`,
          onclick: () => closeTabs(folder.tabs.map((t) => t.id)),
        },
        'Close all',
      ),
    ),
    h('ul', null, folder.tabs.map(renderTab)),
  );
}

function renderTab(tab) {
  const url = urlOf(tab);
  const title = tab.title || url || 'New tab';
  const current = tab.active && tab.windowId === state.windowId;

  let detail;
  if (state.view === 'site') detail = pathOf(url);
  else if (state.view === 'recent' && tab.lastAccessed) detail = `${siteOf(url).label}, ${ago(tab.lastAccessed)}`;
  else detail = siteOf(url).label;

  return h(
    'li',
    {
      class: 'tab',
      'data-id': tab.id,
      style: state.view === 'site' ? null : `--base: hsl(${hueOf(siteOf(url).key)} 62% 50%)`,
    },
    h(
      'button',
      {
        class: 'tab-main',
        type: 'button',
        title: url,
        'aria-current': current ? 'true' : null,
        onclick: () => activate(tab),
      },
      favicon(url),
      h(
        'span',
        { class: 'tab-text' },
        h('span', { class: 'tab-title' }, h('span', null, title)),
        h(
          'span',
          { class: 'tab-detail' },
          detail,
          state.duplicates.has(tab.id) && h('span', { class: 'badge badge-duplicate' }, 'Duplicate'),
          tab.pinned && h('span', { class: 'badge' }, 'Pinned'),
          tab.audible && h('span', { class: 'badge' }, 'Playing'),
        ),
      ),
    ),
    h(
      'button',
      {
        class: 'tab-close',
        type: 'button',
        'aria-label': `Close ${title}`,
        title: 'Close tab',
        onclick: (e) => closeTabs([tab.id], visibleRows().indexOf(e.currentTarget.previousElementSibling)),
      },
      svg(ICON_CLOSE),
    ),
  );
}

function renderEmpty() {
  if (!state.query) return h('div', { class: 'empty' }, h('p', null, 'No tabs are open.'));
  return h(
    'div',
    { class: 'empty' },
    h('p', null, `No tabs match “${state.query}”.`),
    h('button', { class: 'text-button', type: 'button', onclick: () => setQuery('') }, 'Clear search'),
  );
}

function visibleRows() {
  return [...list.querySelectorAll('.folder:not([data-collapsed]) .tab-main')];
}

// ---------- Actions ----------

async function activate(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId !== state.windowId) await chrome.windows.update(tab.windowId, { focused: true });
}

async function closeTabs(ids, focusIndex = null) {
  pendingFocus = focusIndex;
  try {
    await chrome.tabs.remove(ids);
    announce(`Closed ${plural(ids.length, 'tab')}`);
  } catch (error) {
    console.error(error);
    refresh();
  }
}

function toggle(id) {
  if (state.collapsed.has(id)) state.collapsed.delete(id);
  else state.collapsed.add(id);
  save();
  render();
}

// Screen readers hear this politely; routine tab updates never go through it.
function announce(message) {
  liveStatus.textContent = message;
}

function setQuery(value) {
  search.value = value;
  state.query = value.trim();
  render();
  if (state.query) announce(count.textContent);
}

function setView(view) {
  state.view = view;
  save();
  render();
  window.scrollTo(0, 0);
}

function save() {
  chrome.storage.local.set({ view: state.view, collapsed: [...state.collapsed] });
}

async function restore() {
  const saved = await chrome.storage.local.get(['view', 'collapsed']);
  if (VIEWS.includes(saved.view)) state.view = saved.view;
  state.collapsed = new Set(saved.collapsed ?? []);
  document.querySelector(`input[name="view"][value="${state.view}"]`).checked = true;
}

// ---------- Wiring ----------

search.addEventListener('input', () => setQuery(search.value));

for (const input of document.querySelectorAll('input[name="view"]')) {
  input.addEventListener('change', () => setView(input.value));
}

closeDupes.addEventListener('click', () => closeTabs(state.extraCopies));

document.addEventListener('keydown', (e) => {
  const rows = visibleRows();
  const typing = e.target === search;

  if (e.key === '/' && !typing) {
    e.preventDefault();
    search.focus();
    search.select();
    return;
  }
  if (typing) {
    if (e.key === 'Escape' && search.value) {
      e.preventDefault();
      setQuery('');
    } else if (e.key === 'ArrowDown' && rows.length) {
      e.preventDefault();
      rows[0].focus();
    } else if (e.key === 'Enter' && rows.length) {
      rows[0].click();
    }
    return;
  }

  const i = rows.indexOf(document.activeElement);
  if (i === -1) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    rows[i + 1]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    (rows[i - 1] ?? search).focus();
  } else if (e.key === 'Delete') {
    e.preventDefault();
    closeTabs([Number(rows[i].closest('.tab').dataset.id)], i);
  }
});

for (const event of ['onCreated', 'onRemoved', 'onActivated', 'onMoved', 'onAttached', 'onDetached', 'onReplaced']) {
  chrome.tabs[event].addListener(refresh);
}
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (VISIBLE_CHANGES.some((key) => key in change)) refresh();
});
for (const event of ['onCreated', 'onRemoved', 'onUpdated', 'onMoved']) {
  chrome.tabGroups[event]?.addListener(refresh);
}
chrome.windows.onFocusChanged.addListener(refresh);

restore().then(load);
