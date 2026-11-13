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

// Pages where you pay or choose what to pay: judged from the address alone, never the page.
const BILLING_SEGMENT = /^(billing|pricing|prices?|plans?|subscriptions?|subscribe|upgrade|checkout|invoices?|payment-methods?|manage-subscription)$/i;
const BILLING_HOST = /^(billing|pricing|checkout)\./i;
// longbook is a Mac and iPhone app; Chrome extensions only exist on desktop, so this is the Mac button.
const IS_MAC = /mac/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? '');
const REOPEN = IS_MAC ? 'Cmd+Shift+T' : 'Ctrl+Shift+T';

// A shortcut the way the platform writes it: Alt+Shift+B is ⌥⇧B on a Mac. Chrome already gives
// Mac symbols there; this also covers the plain names.
function keyLabel(shortcut) {
  if (!shortcut) return 'Not set';
  if (!IS_MAC) return shortcut;
  const symbols = { Alt: '⌥', Option: '⌥', Shift: '⇧', Ctrl: '⌃', MacCtrl: '⌃', Control: '⌃', Command: '⌘', Cmd: '⌘' };
  return shortcut
    .split('+')
    .map((part) => symbols[part] ?? part)
    .join('');
}

// The keys inside the panel, written for the platform you are on.
const PANEL_KEYS = [
  ['Jump to the search box', '/'],
  ['Move between tabs', '↑ ↓'],
  ['Go to the tab', 'Enter'],
  ['Rename the tab', 'F2'],
  ['Close the tab', IS_MAC ? '⌫' : 'Delete'],
  ['Select several tabs', IS_MAC ? '⌘-click' : 'Ctrl-click'],
  ['Select a range', 'Shift-click'],
  ['Leave Select mode or clear the search', 'Esc'],
  ['Reopen a closed tab', IS_MAC ? '⌘⇧T' : 'Ctrl+Shift+T'],
];
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);
// Only real pages are remembered by address: every new tab shares one address.
const REMEMBERABLE = /^(https?|file):/i;
const REMEMBER_NAMES = 300;
const MAX_FAVOURITES = 100;
const MAX_LISTS = 100;

const state = {
  view: 'site',
  query: '',
  history: { query: '', items: [] }, // pages from Chrome's history that match the search and are not open
  collapsed: new Set(),
  tabs: [],
  groups: new Map(),
  windowId: null,
  duplicates: new Set(),
  extraCopies: [],
  names: new Map(), // tab id -> name typed by the user
  favourites: [], // favourites { url, title, site? }, in the order they were added; kept until removed. With `site` (a host such as github.com) it stands for every page on that site
  prints: new Map(), // page address -> short hash of it, for pages that can be remembered
  remembered: { names: {} }, // names by hash, kept across restarts
  editing: null, // id of the tab whose name is being edited
  lists: [], // saved lists { id, name, at, tabs: [{ title, url }] }, newest first; kept until deleted
  menuTab: null, // id of the tab the context menu is open for (null on a closed favourite)
  menuFavourite: null, // key (see favKey) of the favourite icon the menu is open on, if it was opened on one
  menuSite: null, // host of the site folder the menu is open on, if it was opened on one
  layout: null, // the order the list was last drawn in (see stabilise); null sorts it afresh
  selecting: false, // whether the list is in Select mode
  selected: new Set(), // ids of the selected tabs
  lastSelected: null, // the tab last ticked, for Shift-click ranges
  shownIds: new Set(), // ids of the tabs the list shows right now (a search can hide some)
  found: null, // id of the tab whose row is pulsing after Show current tab or a favourite click
  shortcuts: {}, // the keys Chrome has for the two commands, by command name
  settings: { showLongbook: true, showStatus: true, startView: 'last' },
};

const list = document.getElementById('list');
const strip = document.getElementById('favourites');
const search = document.getElementById('search');
const count = document.getElementById('count');
const liveStatus = document.getElementById('status');
const closeDupes = document.getElementById('close-dupes');
const locate = document.getElementById('locate');
const menu = document.getElementById('menu');
const settingsPanel = document.getElementById('settings');
const settingLongbook = document.getElementById('setting-longbook');
const settingView = document.getElementById('setting-view');
const settingStatus = document.getElementById('setting-status');
const statusbar = document.getElementById('statusbar');
const mascot = document.getElementById('mascot');
const saveEverything = document.getElementById('save-everything');
const restoreFile = document.getElementById('restore-file');
const restoreInput = document.getElementById('restore-input');
const selectToggle = document.getElementById('select-toggle');
const tidy = document.getElementById('tidy');
const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const selectionSave = document.getElementById('selection-save');
const selectionClose = document.getElementById('selection-close');
const selectionSuspend = document.getElementById('selection-suspend');
const selectionGroup = document.getElementById('selection-group');
const selectionDone = document.getElementById('selection-done');
const openBackups = document.getElementById('open-backups');
const openLists = document.getElementById('open-lists');
const listsPanel = document.getElementById('lists');
const listsTitle = document.getElementById('lists-title');
const listsNote = document.getElementById('lists-note');
const listItems = document.getElementById('list-items');
const saveListPanel = document.getElementById('save-list');
const saveListForm = document.getElementById('save-list-form');
const listName = document.getElementById('list-name');
const listClose = document.getElementById('list-close');
const listSize = document.getElementById('list-size');
const backupsPanel = document.getElementById('backups');
const backupsTitle = document.getElementById('backups-title');
const backupsNote = document.getElementById('backups-note');
const backupList = document.getElementById('backup-list');
const deleteBackups = document.getElementById('delete-backups');
const menuGetLongbook = document.getElementById('menu-get-longbook');
const renameItem = menu.querySelector('[data-action="rename"]');
const resetName = menu.querySelector('[data-action="reset"]');
const favouriteItem = menu.querySelector('[data-action="favourite"]');
const longbookItem = menu.querySelector('[data-action="longbook"]');
const suspendItem = menu.querySelector('[data-action="suspend"]');

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
const ICON_CHECK = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2l2.2 2.2L8 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CHEVRON = '<svg class="chevron" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function plural(n, word, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

function urlOf(tab) {
  return tab.url || tab.pendingUrl || '';
}

// What the page calls itself, and what the list shows: the user's name wins.
function originalTitle(tab) {
  return tab.title || urlOf(tab) || 'New tab';
}

function labelOf(tab) {
  return state.names.get(tab.id) || originalTitle(tab);
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

// A billing or price page: /pricing, /account/billing, billing.example.com, #/settings/plans.
function isBillingPage(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (BILLING_HOST.test(u.hostname)) return true;
    const route = `${u.pathname}/${u.hash.replace(/^#!?/, '')}`.split(/[/?]/);
    return route.some((segment) => BILLING_SEGMENT.test(segment));
  } catch {
    return false;
  }
}

// The site's own name for the commitment: github.com -> Github, billing.example.co.uk -> Example.
function serviceName(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (/^[\d.]+$/.test(host) || host.includes(':')) return host;
  const labels = host.split('.');
  const n = labels.length;
  const registrable =
    n >= 3 && labels[n - 1].length === 2 && SECOND_LEVEL.has(labels[n - 2]) ? labels[n - 3] : (labels[n - 2] ?? labels[0]);
  return registrable.charAt(0).toUpperCase() + registrable.slice(1);
}

function offersLongbook(tab) {
  return IS_MAC && state.settings.showLongbook && isBillingPage(urlOf(tab));
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
  await fingerprint(tabs);
  // A name was opened for editing while these were loading: redrawing now would
  // throw away the text box. Try again once editing finishes.
  if (state.editing != null) {
    stale = true;
    return;
  }
  state.windowId = current.id;
  state.groups = new Map(groups.map((g) => [g.id, g]));
  state.tabs = sortTabs(tabs);
  // Adopt first: a tab that came back after a restart must get its name before the
  // clean-up below decides what is still wanted.
  if (adoptRemembered()) saveSession();
  forgetClosedTabs();
  for (const id of state.selected) if (!state.tabs.some((t) => t.id === id)) state.selected.delete(id);
  refreshFavouriteTitles();
  findDuplicates();
  render();
}

// A name belongs to its tab and goes when the tab does. The page's hash
// (see rememberChoices) is what brings it back if the same page opens again.
function forgetClosedTabs() {
  const open = new Set(state.tabs.map((t) => t.id));
  let changed = false;
  for (const id of state.names.keys()) {
    if (!open.has(id)) {
      state.names.delete(id);
      changed = true;
    }
  }
  if (changed) saveSession();
}

// ---------- Remembering names ----------

// A tab id dies with the tab, so names are also kept under a short hash of the page address.
// The address itself is never saved for a name, and only pages you named are kept. When the
// same page opens again, whether after a restart or in a new tab, it gets its name back.
// Favourites are different: you chose them to come back to, so they keep the address.

async function fingerprint(tabs) {
  if (state.prints.size > 1000) state.prints.clear();
  const fresh = [...new Set(tabs.map(urlOf))].filter((url) => REMEMBERABLE.test(url) && !state.prints.has(url));
  await Promise.all(
    fresh.map(async (url) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
      const hex = [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0'));
      state.prints.set(url, hex.join(''));
    }),
  );
}

function printOf(tab) {
  return tab && state.prints.get(urlOf(tab));
}

// Gives open tabs the names remembered for their pages. True if anything changed.
function adoptRemembered() {
  let changed = false;
  for (const tab of state.tabs) {
    const name = state.remembered.names[printOf(tab)];
    if (name && !state.names.has(tab.id)) {
      state.names.set(tab.id, name);
      changed = true;
    }
  }
  return changed;
}

// Pages that are closed keep their entries; an open page follows what the user chose just now.
function rememberChoices() {
  const open = new Set(state.tabs.map(printOf).filter(Boolean));
  const named = new Map();
  for (const tab of state.tabs) {
    if (state.names.has(tab.id) && printOf(tab)) named.set(printOf(tab), state.names.get(tab.id));
  }
  const names = { ...state.remembered.names };
  for (const print of open) {
    if (named.has(print)) names[print] = named.get(print);
    else delete names[print];
  }
  state.remembered = { names: Object.fromEntries(Object.entries(names).slice(-REMEMBER_NAMES)) };
  chrome.storage.local.set({ remembered: state.remembered });
}

let refreshTimer;
let stale = false;
function refresh() {
  // A hidden panel can't be seen, and a half-typed name must not be redrawn away.
  // Both catch up later through the same flag.
  if (document.hidden || state.editing != null) {
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
const VISIBLE_CHANGES = ['title', 'url', 'pinned', 'audible', 'groupId', 'status', 'discarded'];

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

function byRecent(tabs, layout) {
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
        // A tab stays in the bucket it was drawn in until Tidy up, so clicking it does not make it jump.
        const home = layout?.home.get(t.id);
        if (home) return home === span.key;
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

function foldersFor(tabs, layout) {
  switch (state.view) {
    case 'window':
      return byWindow(tabs);
    case 'recent':
      return byRecent(tabs, layout);
    case 'group':
      return byGroup(tabs);
    default:
      return bySite(tabs);
  }
}

// The list keeps the order it was drawn in, so rows do not move under the mouse while tabs open and
// close. A folder or tab that is already on screen keeps its place; a new one goes at the end (at the
// top in Recent, where the newest comes first); an empty folder goes. Tidy up sorts it afresh.
const NEW_LAST = 1e9;
function stabilise(folders, layout) {
  if (!layout) return folders;
  const newRank = state.view === 'recent' ? -1 : NEW_LAST;
  const rank = (order, key) => {
    const i = order.indexOf(key);
    return i === -1 ? newRank : i;
  };
  return [...folders]
    .sort((a, b) => rank(layout.folders, a.key) - rank(layout.folders, b.key))
    .map((folder) => {
      const order = layout.tabs.get(folder.key) ?? [];
      return { ...folder, tabs: [...folder.tabs].sort((a, b) => rank(order, a.id) - rank(order, b.id)) };
    });
}

function layoutOf(folders) {
  return {
    folders: folders.map((f) => f.key),
    tabs: new Map(folders.map((f) => [f.key, f.tabs.map((t) => t.id)])),
    home: new Map(folders.flatMap((f) => f.tabs.map((t) => [t.id, f.key]))),
  };
}

function sameOrder(a, b) {
  return a.length === b.length && a.every((f, i) => f.key === b[i].key && f.tabs.length === b[i].tabs.length && f.tabs.every((t, j) => t.id === b[i].tabs[j].id));
}

// ---------- Status bar ----------

// Tabs and Claude come from the tab list. Memory and processor use come from Chrome's system.*
// APIs, which report the whole computer: Chrome keeps its own per-process figures from extensions.
const usage = { memory: null, cpu: null, lastCpu: null };

const isClaudeTab = (tab) => /^https:\/\/([\w-]+\.)*claude\.ai(\/|$)/.test(tab.url ?? '');

function formatGB(bytes) {
  const gb = bytes / 2 ** 30;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

function renderStatusbar() {
  statusbar.hidden = !state.settings.showStatus;
  if (statusbar.hidden) return;

  document.getElementById('stat-tabs').textContent = plural(state.tabs.length, 'tab');

  const claudeTabs = state.tabs.filter(isClaudeTab);
  // Claude in Chrome keeps the tabs it drives in a tab group named Claude.
  const driven = state.tabs.filter((t) => !isClaudeTab(t) && /\bclaude\b/i.test(state.groups.get(t.groupId)?.title ?? ''));
  const claude = document.getElementById('stat-claude');
  claude.hidden = claudeTabs.length + driven.length === 0;
  document.getElementById('stat-claude-text').textContent = driven.length ? `${claudeTabs.length} + ${driven.length}` : String(claudeTabs.length);
  const tip = `${plural(claudeTabs.length, 'tab')} on claude.ai` + (driven.length ? `, and ${plural(driven.length, 'tab')} in a tab group Claude is working in` : '') + '. Chrome cannot tell whether one is mid-reply.';
  claude.title = tip;
  mascot.title = `${tip} Click the mascot.`;
  mascot.setAttribute('aria-label', tip);

  const memory = document.getElementById('stat-memory');
  memory.hidden = usage.memory == null;
  if (usage.memory != null) memory.textContent = `Memory ${formatGB(usage.memory.used)} of ${formatGB(usage.memory.total)}`;
  const cpu = document.getElementById('stat-cpu');
  cpu.hidden = usage.cpu == null;
  if (usage.cpu != null) {
    cpu.textContent = `CPU ${usage.cpu}%`;
    cpu.classList.toggle('stat-hot', usage.cpu >= 80);
  }
}

async function sampleUsage() {
  if (!state.settings.showStatus || document.hidden || !chrome.system) return;
  try {
    const memory = await chrome.system.memory.getInfo();
    usage.memory = { used: memory.capacity - memory.availableCapacity, total: memory.capacity };
    const { processors } = await chrome.system.cpu.getInfo();
    const now = processors.reduce((sum, p) => ({ busy: sum.busy + p.usage.total - p.usage.idle, total: sum.total + p.usage.total }), { busy: 0, total: 0 });
    // The counters only ever grow: the share in use is the change since the last look.
    if (usage.lastCpu && now.total > usage.lastCpu.total) {
      usage.cpu = Math.round((100 * (now.busy - usage.lastCpu.busy)) / (now.total - usage.lastCpu.total));
    }
    usage.lastCpu = now;
  } catch {
    usage.memory = usage.cpu = null;
  }
  renderStatusbar();
}
// Each click picks the next trick.
const TRICKS = ['spin', 'hop', 'wiggle', 'squish'];
let trick = 0;
mascot.addEventListener('click', () => {
  mascot.dataset.trick = '';
  void mascot.getBoundingClientRect(); // restart the animation if one is still running
  mascot.dataset.trick = TRICKS[trick++ % TRICKS.length];
});
mascot.addEventListener('animationend', (e) => {
  if (e.animationName.startsWith('mascot-') && mascot.dataset.trick) delete mascot.dataset.trick;
});
setInterval(sampleUsage, 3000);
document.addEventListener('visibilitychange', sampleUsage);

// ---------- Drawing the list ----------

function render() {
  const focusedId = document.activeElement?.closest?.('.tab')?.dataset.id;
  const focusedFavourite = document.activeElement?.closest?.('.fav')?.dataset.key;
  const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length
    ? state.tabs.filter((t) => {
        const text = `${state.names.get(t.id) ?? ''} ${t.title ?? ''} ${urlOf(t)}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
    : state.tabs;

  state.shownIds = new Set(shown.map((t) => t.id));
  const windows = new Set(state.tabs.map((t) => t.windowId)).size;
  count.textContent = words.length
    ? `${shown.length} of ${plural(state.tabs.length, 'tab')} match`
    : `${plural(state.tabs.length, 'tab')} in ${plural(windows, 'window')}`;

  closeDupes.hidden = state.extraCopies.length === 0;
  closeDupes.textContent = `Close ${plural(state.extraCopies.length, 'duplicate')}`;

  renderFavourites();
  renderSelection();
  renderStatusbar();

  // Order every tab first, so the layout covers the ones a search hides too.
  const all = stabilise(foldersFor(state.tabs, state.layout), state.layout);
  tidy.hidden = sameOrder(all, foldersFor(state.tabs, null));
  state.layout = layoutOf(all);
  const folders = words.length ? stabilise(foldersFor(shown, state.layout), state.layout) : all;
  list.replaceChildren(...(folders.length ? folders.map(renderFolder) : [renderEmpty()]), ...renderHistory());

  const rows = visibleRows();
  if (pendingFocus != null) {
    rows[Math.min(pendingFocus, rows.length - 1)]?.focus();
    pendingFocus = null;
  } else if (focusedId) {
    list.querySelector(`.tab[data-id="${focusedId}"] .tab-main`)?.focus();
  } else if (focusedFavourite) {
    [...strip.children].find((b) => b.dataset.key === focusedFavourite)?.focus();
  }
}

// ---------- Selecting several tabs ----------

function renderSelection() {
  selectToggle.textContent = state.selecting ? 'Done' : 'Select';
  selectToggle.setAttribute('aria-pressed', String(state.selecting));
  document.body.classList.toggle('selecting', state.selecting);
  selectionBar.hidden = !state.selecting;
  if (!state.selecting) return;
  const chosen = state.tabs.filter((t) => state.selected.has(t.id));
  const hidden = chosen.filter((t) => !state.shownIds.has(t.id)).length;
  selectionCount.textContent = `${chosen.length} selected${hidden ? `, ${hidden} hidden by the search` : ''}`;
  selectionSave.disabled = !chosen.some(canFavourite);
  selectionClose.disabled = chosen.length === 0;
  selectionSuspend.disabled = !chosen.some(canSuspend);
  selectionGroup.disabled = !chosen.some((t) => !t.pinned);
}

function setSelecting(on, { silent = false } = {}) {
  state.selecting = on;
  if (!on) {
    state.selected.clear();
    state.lastSelected = null;
  }
  render();
  if (!silent) announce(on ? 'Select mode: pick tabs, then choose an action' : 'Select mode off');
}

// Ticks or unticks a tab. With `range`, ticks every tab shown between this one and the last one ticked.
function toggleSelected(id, range = false) {
  const ids = visibleRows().map((row) => Number(row.closest('.tab').dataset.id));
  if (range && state.lastSelected != null && ids.includes(state.lastSelected) && ids.includes(id)) {
    const [from, to] = [ids.indexOf(state.lastSelected), ids.indexOf(id)].sort((a, b) => a - b);
    for (const between of ids.slice(from, to + 1)) state.selected.add(between);
  } else if (state.selected.has(id)) {
    state.selected.delete(id);
  } else {
    state.selected.add(id);
  }
  state.lastSelected = id;
  render();
}

function selectFolder(folder) {
  const all = folder.tabs.every((t) => state.selected.has(t.id));
  for (const tab of folder.tabs) {
    if (all) state.selected.delete(tab.id);
    else state.selected.add(tab.id);
  }
  render();
}

// Groups the given tabs, one Chrome tab group per window; pinned tabs can't be grouped.
async function groupTabs(tabs) {
  const byWindow = Map.groupBy(tabs.filter((t) => !t.pinned), (t) => t.windowId);
  const results = await Promise.allSettled([...byWindow.values()].map(async (set) => {
    await chrome.tabs.group({ tabIds: set.map((t) => t.id) });
    return set.length;
  }));
  const done = results.filter((r) => r.status === 'fulfilled').reduce((sum, r) => sum + r.value, 0);
  announce(done ? `Grouped ${plural(done, 'tab')}` : 'Chrome would not group these tabs');
}

async function actOnSelected(action) {
  const chosen = state.tabs.filter((t) => state.selected.has(t.id));
  if (!chosen.length) return;
  if (action === 'close') await closeTabs(chosen.map((t) => t.id));
  else if (action === 'suspend') await suspendTabs(chosen);
  else await groupTabs(chosen);
  setSelecting(false, { silent: true });
  if (action === 'close') announce(`Closed ${plural(chosen.length, 'tab')}`);
}

// The open tab that stands for a favourite: the one you are on, else one in this window, else the first.
function tabForFavourite(fav) {
  const open = state.tabs.filter((t) => (fav.site ? siteOf(urlOf(t)).key === fav.site : urlOf(t) === fav.url));
  return (
    open.find((t) => t.active && t.windowId === state.windowId) ??
    open.find((t) => t.active) ??
    open.find((t) => t.windowId === state.windowId) ??
    open[0]
  );
}

function favouriteFor(tab) {
  return state.favourites.find((f) => !f.site && f.url === urlOf(tab) && tabForFavourite(f)?.id === tab.id);
}

// What tells favourites apart: the page address, or the host for a whole site.
const favKey = (fav) => (fav.site ? `site:${fav.site}` : fav.url);

// The favourites: one icon per page or site, above the search box. A click goes to the tab, or opens
// the page again if you closed it. The icon stays until you remove it.
function renderFavourites() {
  strip.hidden = state.favourites.length === 0;
  strip.replaceChildren(
    ...state.favourites.map((fav) => {
      const tab = tabForFavourite(fav);
      const title = fav.site ? fav.site : tab ? labelOf(tab) : fav.title;
      const what = fav.site ? 'Favourite site' : 'Favourite';
      return h(
        'button',
        {
          class: `${tab ? 'fav' : 'fav fav-closed'}${fav.site ? ' fav-site' : ''}`,
          type: 'button',
          'data-key': favKey(fav),
          style: `--base: hsl(${hueOf(siteOf(fav.url).key)} 62% 50%)`,
          title: fav.site
            ? `${fav.site}: every page on this site\n${tab ? 'Favourite site: click to go to a tab on it' : `Favourite site, none open: click to open ${fav.url}`}\nRight-click to remove it`
            : `${title}\n${fav.url}\n${tab ? 'Favourite: click to go to this tab' : 'Favourite, closed: click to open it again'}\nRight-click to remove it`,
          'aria-label': fav.site ? `${what} ${title}${tab ? '' : ', none open'}` : tab ? title : `${title}, closed`,
          'aria-current': tab?.active && tab.windowId === state.windowId ? 'true' : null,
          onclick: () => openFavourite(fav),
        },
        favicon(fav.url),
      );
    }),
  );
}

function renderFolder(folder) {
  const id = `${state.view}:${folder.key}`;
  const collapsed = !state.query && state.collapsed.has(id);
  const n = folder.tabs.length;

  return h(
    'section',
    {
      class: 'folder',
      'data-folder': id,
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
          {
            class: 'folder-tab',
            type: 'button',
            title: `${collapsed ? 'Expand' : 'Collapse'} ${folder.label}`,
            'aria-expanded': String(!collapsed),
            onclick: () => toggle(id),
          },
          svg(ICON_CHEVRON),
          folder.icon && favicon(folder.icon),
          h('span', { class: 'folder-name' }, folder.label),
          h('span', { class: 'folder-count' }, n),
        ),
      ),
      h(
        'div',
        { class: 'folder-actions' },
        state.selecting &&
          h(
            'button',
            {
              class: 'text-button close-all',
              type: 'button',
              title: `Select or clear all ${plural(n, 'tab')} in ${folder.label}`,
              'aria-label': `${folder.tabs.every((t) => state.selected.has(t.id)) ? 'Clear' : 'Select all'} ${plural(n, 'tab')} in ${folder.label}`,
              onclick: () => selectFolder(folder),
            },
            folder.tabs.every((t) => state.selected.has(t.id)) ? 'Clear' : 'Select all',
          ),
        !state.selecting && groupsToMake(folder).length > 0 &&
          h(
            'button',
            {
              class: 'text-button close-all',
              type: 'button',
              title: `Put these tabs into one Chrome tab group named ${folder.label}. Pinned tabs are left out, and a tab already in another group moves out of it.`,
              'aria-label': `Group ${plural(folder.tabs.filter((t) => !t.pinned).length, 'tab')} from ${folder.label} into a Chrome tab group`,
              onclick: () => groupSite(folder),
            },
            'Group',
          ),
        !state.selecting && folder.tabs.some(canSuspend) &&
          h(
            'button',
            {
              class: 'text-button close-all',
              type: 'button',
              title: 'Unload these tabs from memory. They reload when you click them. The tab you are on, pinned tabs and tabs playing sound are left alone.',
              'aria-label': `Suspend ${plural(folder.tabs.filter(canSuspend).length, 'tab')} in ${folder.label}`,
              onclick: () => suspendTabs(folder.tabs),
            },
            'Suspend',
          ),
        !state.selecting && h(
          'button',
          {
            class: 'text-button close-all',
            type: 'button',
            title: `Close every tab in ${folder.label}. ${REOPEN} reopens the last one.`,
            'aria-label': `Close all ${plural(n, 'tab')} in ${folder.label}`,
            onclick: () => closeTabs(folder.tabs.map((t) => t.id)),
          },
          'Close all',
        ),
      ),
    ),
    h('ul', null, folder.tabs.map(renderTab)),
  );
}

function renderTab(tab) {
  const url = urlOf(tab);
  const title = labelOf(tab);
  const renamed = state.names.has(tab.id);
  const current = tab.active && tab.windowId === state.windowId;
  const rowProps = {
    class: 'tab',
    'data-id': tab.id,
    'data-found': state.found === tab.id ? '' : null,
    style: state.view === 'site' ? null : `--base: hsl(${hueOf(siteOf(url).key)} 62% 50%)`,
  };

  if (state.editing === tab.id) return renderEditor(tab, rowProps);

  let detail;
  if (state.view === 'site') detail = pathOf(url);
  else if (state.view === 'recent' && tab.lastAccessed) detail = `${siteOf(url).label}, ${ago(tab.lastAccessed)}`;
  else detail = siteOf(url).label;

  return h(
    'li',
    rowProps,
    h(
      'button',
      {
        class: 'tab-main',
        type: 'button',
        title: [
          title,
          renamed && `Original name: ${originalTitle(tab)}`,
          url,
          state.selecting
            ? 'Click to tick or untick this tab. Shift-click ticks a range.'
            : `Click to switch to this tab. F2 renames it. ${IS_MAC ? '⌘' : 'Ctrl'}-click to select several.`,
        ]
          .filter(Boolean)
          .join('\n'),
        'aria-current': current ? 'true' : null,
        'aria-pressed': state.selecting ? String(state.selected.has(tab.id)) : null,
        'aria-keyshortcuts': 'F2',
        onclick: (e) => {
          if (state.selecting) toggleSelected(tab.id, e.shiftKey);
          else if (e.ctrlKey || e.metaKey) {
            state.selecting = true;
            announce('Select mode: pick tabs, then choose an action');
            toggleSelected(tab.id);
          } else activate(tab);
        },
      },
      state.selecting && h('span', { class: 'tab-check' }, state.selected.has(tab.id) && svg(ICON_CHECK)),
      favicon(url),
      h(
        'span',
        { class: 'tab-text' },
        h('span', { class: 'tab-title' }, h('span', null, title)),
        h(
          'span',
          { class: 'tab-detail' },
          detail,
          renamed && h('span', { class: 'badge' }, 'Renamed'),
          favouriteFor(tab) && h('span', { class: 'badge' }, 'Favourite'),
          state.duplicates.has(tab.id) && h('span', { class: 'badge badge-duplicate' }, 'Duplicate'),
          tab.pinned && h('span', { class: 'badge' }, 'Pinned'),
          tab.audible && h('span', { class: 'badge' }, 'Playing'),
          tab.discarded && h('span', { class: 'badge' }, 'Suspended'),
        ),
      ),
    ),
    offersLongbook(tab) &&
      h(
        'button',
        {
          class: 'tab-longbook',
          type: 'button',
          title: `Add ${serviceName(url)} to longbook: opens the app on your Mac with the name filled in`,
          'aria-label': `Add ${serviceName(url)} to longbook`,
          onclick: () => addToLongbook(tab),
        },
        'Add to longbook',
      ),
    h(
      'button',
      {
        class: 'tab-close',
        type: 'button',
        'aria-label': `Close ${title}`,
        title: `Close tab (${IS_MAC ? '⌫ Delete' : 'Delete'} key). It closes straight away.`,
        onclick: (e) => closeTabs([tab.id], visibleRows().indexOf(e.currentTarget.closest('.tab').querySelector('.tab-main'))),
      },
      svg(ICON_CLOSE),
    ),
  );
}

// The row while its name is being edited: a text box in place of the title.
function renderEditor(tab, rowProps) {
  const input = h('input', {
    class: 'rename-input',
    type: 'text',
    value: labelOf(tab),
    placeholder: originalTitle(tab),
    maxlength: 120,
    'aria-label': 'Tab name',
    'aria-describedby': 'rename-hint',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit(tab.id, input.value, { refocus: true });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEdit(tab.id, null, { refocus: true });
    }
  });
  // Clicking away keeps what was typed.
  input.addEventListener('blur', () => finishEdit(tab.id, input.value));

  return h(
    'li',
    { ...rowProps, class: 'tab tab-editing' },
    h(
      'div',
      { class: 'tab-main' },
      favicon(urlOf(tab)),
      h(
        'span',
        { class: 'tab-text' },
        input,
        h('span', { class: 'tab-detail', id: 'rename-hint' }, 'Enter to save, Esc to cancel. Empty restores the original.'),
      ),
    ),
  );
}

function renderEmpty() {
  if (!state.query) return h('div', { class: 'empty' }, h('p', null, 'No tabs are open.'));
  return h(
    'div',
    { class: 'empty' },
    h('p', null, `No open tabs match “${state.query}”.`),
    h('button', { class: 'text-button', type: 'button', onclick: () => setQuery('') }, 'Clear search'),
  );
}

// Pages from Chrome's history that match the search and are not open now.
function renderHistory() {
  if (!state.query || state.history.query !== state.query) return [];
  const open = new Set(state.tabs.map(urlOf));
  const items = state.history.items.filter((item) => !open.has(item.url));
  if (!items.length) return [];
  return [
    h(
      'section',
      { class: 'history', 'aria-label': 'From your history' },
      h('h2', { class: 'history-head' }, 'From your history'),
      h(
        'ul',
        { class: 'history-list' },
        items.map((item) =>
          h(
            'li',
            null,
            h(
              'button',
              {
                class: 'history-row',
                type: 'button',
                title: `Open this page in a new tab:\n${item.url}`,
                onclick: () => {
                  chrome.tabs.create({ url: item.url });
                  announce(`Opened ${item.title || item.url}`);
                },
              },
              favicon(item.url),
              h(
                'span',
                { class: 'tab-text' },
                h('span', { class: 'tab-title' }, h('span', null, item.title || item.url)),
                h('span', { class: 'tab-detail' }, `${siteOf(item.url).label} · ${item.lastVisitTime ? ago(item.lastVisitTime) : 'visited'}`),
              ),
            ),
          ),
        ),
      ),
    ),
  ];
}

let historyTimer;
function searchHistory() {
  clearTimeout(historyTimer);
  const query = state.query;
  if (!query || !chrome.history) {
    state.history = { query: '', items: [] };
    return;
  }
  historyTimer = setTimeout(async () => {
    let found = [];
    try {
      // startTime 0 searches all of it; the API's default is only the last day.
      found = await chrome.history.search({ text: query, maxResults: 100, startTime: 0 });
    } catch (error) {
      console.error(error);
    }
    if (state.query !== query) return;
    const seen = new Set();
    const items = found
      .filter((v) => /^https?:/i.test(v.url) && !seen.has(v.url) && seen.add(v.url))
      .slice(0, 30);
    state.history = { query, items };
    render();
    const shown = renderHistory().length ? state.history.items.length : 0;
    if (shown) announce(`${plural(shown, 'page')} from your history`);
  }, 150);
}

function visibleRows() {
  return [...list.querySelectorAll('.folder:not([data-collapsed]) button.tab-main')];
}

// ---------- Actions ----------

async function activate(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId !== state.windowId) await chrome.windows.update(tab.windowId, { focused: true });
}

// ----- Renaming -----

function startEdit(id) {
  if (!state.tabs.some((t) => t.id === id)) return;
  state.editing = id;
  render();
  const input = list.querySelector('.rename-input');
  input?.focus();
  input?.select();
}

// `value` null means cancel. An empty or unchanged-from-original name clears the custom name.
function finishEdit(id, value, { refocus = false } = {}) {
  if (state.editing !== id) return; // already finished; removing the input fires blur again
  state.editing = null;

  const tab = state.tabs.find((t) => t.id === id);
  if (value !== null && tab) {
    const name = value.trim();
    if (!name || name === originalTitle(tab)) state.names.delete(id);
    else state.names.set(id, name);
    saveSession();
  }

  render();
  if (refocus) list.querySelector(`.tab[data-id="${id}"] button.tab-main`)?.focus();
  if (value !== null) announce(state.names.has(id) ? 'Name saved' : 'Original name restored');
  refresh(); // catch up on tab changes held back while editing
}

function clearName(id) {
  if (!state.names.delete(id)) return;
  saveSession();
  render();
  announce('Original name restored');
}

// Names: by tab id in session storage while Chrome runs, and by page hash on disk across restarts.
function storeSession() {
  chrome.storage.session.set({ names: Object.fromEntries(state.names) });
}

function saveSession() {
  storeSession();
  rememberChoices();
}

// ----- Favourites -----

function saveFavourites() {
  chrome.storage.local.set({ favourites: state.favourites });
}

// A page can be a favourite unless it has no address to come back to.
const canFavourite = (tab) => !!urlOf(tab) && !/^(chrome|edge):\/\/newtab\/?$/.test(urlOf(tab));

function addFavourite(tab) {
  if (state.favourites.length >= MAX_FAVOURITES) {
    announce(`You can have up to ${MAX_FAVOURITES} favourites`);
    return;
  }
  state.favourites = [...state.favourites, { url: urlOf(tab), title: labelOf(tab) }];
  saveFavourites();
  render();
  announce('Added to favourites');
}

function addSiteFavourite(host) {
  if (state.favourites.length >= MAX_FAVOURITES) {
    announce(`You can have up to ${MAX_FAVOURITES} favourites`);
    return;
  }
  // The home page of the site is what a click opens when no tab on it is open.
  const open = state.tabs.filter((t) => siteOf(urlOf(t)).key === host && /^https?:/i.test(urlOf(t)));
  const sample = open.find((t) => urlOf(t).startsWith('https:')) ?? open[0];
  if (!sample) return;
  state.favourites = [...state.favourites, { url: `${new URL(urlOf(sample)).origin}/`, title: host, site: host }];
  saveFavourites();
  render();
  announce(`Added ${host} to favourites: every page on the site`);
}

function removeFavourite(key, { fromStrip = false } = {}) {
  const fav = state.favourites.find((f) => favKey(f) === key);
  const tab = fav && tabForFavourite(fav);
  state.favourites = state.favourites.filter((f) => favKey(f) !== key);
  saveFavourites();
  render();
  // The icon that was just removed can't keep focus; hand it to the tab's row.
  if (fromStrip && tab) list.querySelector(`.tab[data-id="${tab.id}"] button.tab-main`)?.focus();
  announce('Removed from favourites');
}

// Goes to the favourite's tab, or opens the page again if it was closed, then shows it in the list.
async function openFavourite(fav) {
  let tab = tabForFavourite(fav);
  if (tab) await activate(tab);
  else tab = await chrome.tabs.create({ url: fav.url });
  await load();
  revealTab(tab.id);
}

// A favourite's title follows its tab while it is open, so a closed one shows the last title seen.
function refreshFavouriteTitles() {
  let changed = false;
  state.favourites = state.favourites.map((fav) => {
    const tab = tabForFavourite(fav);
    if (fav.site || !tab || labelOf(tab) === fav.title) return fav;
    changed = true;
    return { ...fav, title: labelOf(tab) };
  });
  if (changed) saveFavourites();
}

// ----- longbook -----

// Opens longbook's Add Commitment screen with the site's name filled in. Chrome cannot say
// whether an app answered, so "Get longbook" sits beside the item in the right-click menu.
function addToLongbook(tab) {
  const link = h('a', { href: `longbook://add?name=${encodeURIComponent(serviceName(urlOf(tab)))}&from=bettertabs` });
  document.body.append(link);
  link.click();
  link.remove();
}

// ----- Context menu -----

// `row` is a tab row, a favourite icon or a site folder's header. Favourite icons and site folders
// only offer the favourite item.
function openMenu(row, x, y) {
  const fromStrip = row.classList.contains('fav');
  const fromHead = row.classList.contains('folder-head');
  const id = fromStrip || fromHead ? null : Number(row.dataset.id);
  const tab = state.tabs.find((t) => t.id === id) ?? {};
  const host = fromHead ? row.closest('.folder').dataset.folder.slice(state.view.length + 1) : null;
  const siteFav = fromStrip ? state.favourites.find((f) => favKey(f) === row.dataset.key)?.site : null;
  state.menuTab = id;
  state.menuFavourite = fromStrip ? row.dataset.key : null;
  state.menuSite = host;
  const bare = fromStrip || fromHead;
  renameItem.hidden = bare;
  resetName.hidden = bare || !state.names.has(id);
  const starred = fromStrip || (fromHead ? state.favourites.some((f) => f.site === host) : state.favourites.some((f) => !f.site && f.url === urlOf(tab)));
  const site = fromHead || !!siteFav;
  favouriteItem.hidden = !bare && !canFavourite(tab);
  favouriteItem.textContent = `${starred ? 'Remove' : 'Add'}${site ? ' site' : ''} ${starred ? 'from' : 'to'} favourites`;
  favouriteItem.title = site
    ? starred
      ? 'Take this site off the favourites row'
      : 'Keep this whole site in the row above the search box: a click goes to a tab on it, or opens its home page. It stays even when a page changes address.'
    : starred
      ? 'Take this page off the favourites row'
      : 'Keep this page in the row above the search box, even after you close the tab';
  longbookItem.hidden = bare || !offersLongbook(tab);
  menuGetLongbook.hidden = longbookItem.hidden;
  suspendItem.hidden = bare || !canSuspend(tab);

  // Focus the row first so focus returns to it when the menu closes.
  (fromStrip ? row : row.querySelector(fromHead ? 'button' : 'button.tab-main'))?.focus();
  menu.showPopover();

  // Keyboard-opened menus have no pointer position, so sit under the row instead.
  const box = row.getBoundingClientRect();
  const wanted = x || y ? { x, y } : { x: box.left + 24, y: box.bottom };
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(4, Math.min(wanted.x, innerWidth - width - 4))}px`;
  menu.style.top = `${Math.max(4, Math.min(wanted.y, innerHeight - height - 4))}px`;
  menu.querySelector('[role="menuitem"]:not([hidden])').focus();
}

function menuItems() {
  return [...menu.querySelectorAll('[role="menuitem"]:not([hidden])')];
}

// ----- Finding the current tab -----

function showCurrentTab() {
  const current = state.tabs.find((t) => t.active && t.windowId === state.windowId);
  if (current) revealTab(current.id);
}

// Scrolls the list to a tab's row and pulses it.
function revealTab(id) {
  const rowFor = () => list.querySelector(`.tab[data-id="${id}"]`);

  // Undo whatever is hiding it: a search that filters it out, or a collapsed folder.
  if (state.query && !rowFor()) setQuery('');
  const folder = rowFor()?.closest('.folder');
  if (folder?.hasAttribute('data-collapsed')) {
    state.collapsed.delete(folder.dataset.folder);
    save();
    render();
  }

  const row = rowFor();
  if (!row) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  row.querySelector('button.tab-main')?.focus({ preventScroll: true });

  // A short pulse shows where it landed. The highlighter stroke stays after it fades.
  // Kept in state too, so a redraw in the middle of the pulse doesn't cut it short.
  state.found = id;
  row.setAttribute('data-found', '');
  setTimeout(() => {
    if (state.found === id) state.found = null;
    list.querySelector(`.tab[data-id="${id}"]`)?.removeAttribute('data-found');
  }, 1400);
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

// A tab can be suspended unless you are on it, it is playing sound, or it is pinned. Chrome keeps
// a suspended tab in the strip and reloads it when you click it.
function canSuspend(tab) {
  return !tab.active && !tab.discarded && !tab.audible && !tab.pinned && REMEMBERABLE.test(urlOf(tab));
}

async function suspendTabs(tabs) {
  const results = await Promise.allSettled(tabs.filter(canSuspend).map((t) => chrome.tabs.discard(t.id)));
  // Chrome answers with nothing for a tab it would not unload.
  const done = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  announce(done ? `Suspended ${plural(done, 'tab')}` : 'Chrome would not suspend these tabs');
  refresh();
}

// Group this site: one Chrome tab group per window holding that window's tabs from the folder.
// Chrome's groups live inside one window, and pinned tabs can't be in a group. A tab that is in
// another group is moved out of it, so the button hides once a window's tabs are already together.
function groupsToMake(folder) {
  if (state.view !== 'site' || folder.key.startsWith('~')) return [];
  const byWindow = Map.groupBy(
    folder.tabs.filter((t) => !t.pinned),
    (t) => t.windowId,
  );
  return [...byWindow.values()].filter(
    (tabs) => tabs.length > 1 && !(tabs[0].groupId !== -1 && tabs.every((t) => t.groupId === tabs[0].groupId)),
  );
}

async function groupSite(folder) {
  const sets = groupsToMake(folder);
  const results = await Promise.allSettled(
    sets.map(async (tabs) => {
      const id = await chrome.tabs.group({ tabIds: tabs.map((t) => t.id) });
      await chrome.tabGroups.update(id, { title: folder.label });
      return tabs.length;
    }),
  );
  const done = results.filter((r) => r.status === 'fulfilled').reduce((sum, r) => sum + r.value, 0);
  announce(done ? `Grouped ${plural(done, 'tab')} from ${folder.label}` : 'Chrome would not group these tabs');
  refresh();
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

// ---------- Exporting ----------

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// A bookmarks file: it opens as a list of links in any browser and imports into Chrome's bookmarks.
// Built from a Blob and a download link, so it needs no permission. `windows` is
// [{ name, tabs: [{ title, url }] }]; `stamp` is the date (and time) in the heading and file name.
function downloadBookmarks(windows, stamp, fileName) {
  const total = windows.reduce((sum, w) => sum + w.tabs.length, 0);
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">',
    `<title>BetterTabs ${stamp}</title>`,
    `<h1>BetterTabs: ${escapeHtml(plural(total, 'tab'))}, ${stamp}</h1>`,
    '<DL><p>',
  ];
  for (const { name, tabs } of windows) {
    lines.push(`  <DT><H3>${escapeHtml(name)} (${plural(tabs.length, 'tab')})</H3>`, '  <DL><p>');
    for (const tab of tabs) {
      lines.push(`    <DT><A HREF="${escapeHtml(tab.url)}">${escapeHtml(tab.title)}</A>`);
    }
    lines.push('  </DL><p>');
  }
  lines.push('</DL><p>');

  const link = h('a', {
    href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/html' })),
    download: fileName,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  return total;
}

// ---------- One file with everything ----------
// A file the user keeps, so favourites, lists, names, settings and recent tabs survive removing or
// reinstalling the extension (Chrome deletes its storage then). Written only when the button is
// clicked. Reading it back trusts nothing: every field is checked and trimmed, and nothing the
// user has now is deleted.

const FILE_FORMAT = 'bettertabs-everything';
const MAX_FILE_BYTES = 20e6;
const MAX_BACKUPS = 24; // as background.js keeps: BACKUP_RECENT + BACKUP_HOURLY (the recent-tab copies)

async function saveEverythingFile() {
  const { backups = [] } = await chrome.storage.local.get('backups');
  const date = dayOf(new Date());
  const file = {
    format: FILE_FORMAT,
    version: 1,
    extensionVersion: chrome.runtime.getManifest().version,
    savedAt: new Date().toISOString(),
    settings: state.settings,
    favourites: state.favourites,
    lists: state.lists,
    names: state.remembered.names,
    backups,
  };
  const link = h('a', {
    href: URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' })),
    download: `bettertabs-backup-${date}.json`,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  announce(`Saved a backup file with ${plural(state.favourites.length, 'favourite')}, ${plural(state.lists.length, 'list')}, ${plural(Object.keys(state.remembered.names).length, 'name')} and ${plural(backups.length, 'recent-tab copy', 'recent-tab copies')}`);
}

const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
const cleanTabs = (tabs, keep) =>
  (Array.isArray(tabs) ? tabs : [])
    .filter((t) => typeof t?.url === 'string' && keep.test(t.url))
    .slice(0, 5000)
    .map((t) => ({ title: clip(t.title, 200) || clip(t.url, 200), url: clip(t.url, 2000), ...(t.pinned === true && { pinned: true }) }));

// Favourites from a file: titles and addresses checked like tabs, and `site` kept only when it matches the address.
const cleanFavourites = (items) =>
  (Array.isArray(items) ? items : [])
    .slice(0, MAX_FAVOURITES)
    .flatMap((f) => {
      const [tab] = cleanTabs([f], REMEMBERABLE);
      if (!tab) return [];
      const site = typeof f.site === 'string' && f.site === siteOf(tab.url).key && /^https?:/i.test(tab.url) ? f.site : null;
      return [{ title: tab.title, url: tab.url, ...(site && { site }) }];
    });

async function restoreEverythingFile(file) {
  if (file.size > MAX_FILE_BYTES) return announce('That file is too big to be a BetterTabs file');
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return announce('That is not a BetterTabs file');
  }
  if (data?.format !== FILE_FORMAT || data.version !== 1) return announce('That is not a BetterTabs file');

  // Favourites and lists the user does not have yet; the ones they have stay.
  const haveKeys = new Set(state.favourites.map(favKey));
  const favourites = [
    ...state.favourites,
    ...cleanFavourites(data.favourites).filter((f) => !haveKeys.has(favKey(f))),
  ].slice(0, MAX_FAVOURITES);
  const haveIds = new Set(state.lists.map((l) => l.id));
  const lists = [
    ...state.lists,
    ...(Array.isArray(data.lists) ? data.lists : [])
      .filter((l) => typeof l?.id === 'string' && l.id.length <= 80 && !haveIds.has(l.id) && Array.isArray(l.tabs))
      .map((l) => ({ id: l.id, name: clip(l.name, 80) || 'Saved list', at: Number.isFinite(l.at) ? l.at : Date.now(), tabs: cleanTabs(l.tabs, REMEMBERABLE) }))
      .filter((l) => l.tabs.length),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_LISTS);
  const names = { ...state.remembered.names };
  if (data.names && typeof data.names === 'object') {
    for (const [print, name] of Object.entries(data.names)) {
      if (!(print in names) && print.length <= 100 && typeof name === 'string') names[print] = name.slice(0, 200);
    }
  }
  const { backups: haveBackups = [] } = await chrome.storage.local.get('backups');
  const haveAt = new Set(haveBackups.map((b) => b.at));
  const backups = [
    ...haveBackups,
    ...(Array.isArray(data.backups) ? data.backups : [])
      .filter((b) => Number.isFinite(b?.at) && !haveAt.has(b.at) && Array.isArray(b.windows))
      .map((b) => ({ at: b.at, windows: b.windows.slice(0, 50).map((w) => cleanTabs(w, /./)).filter((w) => w.length) }))
      .filter((b) => b.windows.length),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_BACKUPS);

  const settings = { ...state.settings };
  if (typeof data.settings?.showLongbook === 'boolean') settings.showLongbook = data.settings.showLongbook;
  if (typeof data.settings?.showStatus === 'boolean') settings.showStatus = data.settings.showStatus;
  if (VIEWS.includes(data.settings?.startView)) settings.startView = data.settings.startView;

  try {
    await chrome.storage.local.set({ favourites, lists, remembered: { names }, settings, backups });
  } catch {
    return announce('Could not restore: Chrome\'s extension storage is full');
  }
  const gained = {
    favourites: favourites.length - state.favourites.length,
    lists: lists.length - state.lists.length,
    names: Object.keys(names).length - Object.keys(state.remembered.names).length,
    backups: backups.length - haveBackups.length,
  };
  state.favourites = favourites;
  state.lists = lists;
  state.remembered = { names };
  state.settings = settings;
  settingLongbook.checked = settings.showLongbook;
  settingStatus.checked = settings.showStatus;
  settingView.value = settings.startView;
  backupsPanel.hidePopover();
  await load(); // open pages take their remembered names, and the favourites strip draws again
  announce(`Restored ${plural(gained.favourites, 'favourite')}, ${plural(gained.lists, 'list')}, ${plural(gained.names, 'name')} and ${plural(gained.backups, 'recent-tab copy', 'recent-tab copies')}`);
}

// ---------- Recent tabs ----------
// background.js keeps a copy of the open tabs in chrome.storage.local, automatically; the panel lists,
// restores, saves and deletes them. Stored as `backups`; the user sees them as recent tabs.

function whenText(at) {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

async function showBackups() {
  const { backups = [] } = await chrome.storage.local.get('backups');
  backupList.replaceChildren(
    ...backups.map((backup) => {
      const tabCount = backup.windows.reduce((sum, w) => sum + w.length, 0);
      return h('li', { class: 'backup' },
        h('p', { class: 'backup-when' }, whenText(backup.at)),
        h('p', { class: 'backup-size' }, `${plural(tabCount, 'tab')} in ${plural(backup.windows.length, 'window')}`),
        h('div', { class: 'backup-actions' },
          h('button', { class: 'text-button', type: 'button', title: 'Open this copy as new windows. Pages that are already open are skipped.', onclick: () => restoreBackup(backup) }, 'Restore'),
          h('button', { class: 'text-button', type: 'button', title: 'Download this copy as a bookmarks file', onclick: () => saveBackup(backup) }, 'Save as bookmarks')));
    }),
  );
  deleteBackups.hidden = !backups.length;
  backupsNote.textContent = backups.length
    ? 'Copies of your open tabs, kept on this computer for about half a day. Restore opens each window with its tabs.'
    : 'No copies yet. The first one is taken when you open, close or change a tab.';
}

// Opens each saved window as a new window. Pages that are already open are skipped, and only the
// first tab of each window loads: the rest are suspended so hundreds of tabs don't load at once.
async function openPages(windows, skip = new Set()) {
  let opened = 0;
  for (const saved of windows) {
    const entries = saved.filter((t) => /^https?:/i.test(t.url) && !skip.has(t.url));
    if (!entries.length) continue;
    const win = await chrome.windows.create({ url: entries.map((t) => t.url), focused: false });
    const created = (await chrome.tabs.query({ windowId: win.id })).sort((a, b) => a.index - b.index);
    created.forEach((tab, i) => {
      if (entries[i]?.pinned) chrome.tabs.update(tab.id, { pinned: true }).catch(() => {});
      if (i > 0) chrome.tabs.discard(tab.id).catch(() => {});
    });
    opened += entries.length;
  }
  return opened;
}

async function restoreBackup(backup) {
  const opened = await openPages(backup.windows, new Set(state.tabs.map(urlOf)));
  backupsPanel.hidePopover();
  const total = backup.windows.reduce((sum, w) => sum + w.length, 0);
  announce(
    opened
      ? `Restored ${plural(opened, 'tab')}${opened < total ? `, skipping ${total - opened} already open or not a web page` : ''}`
      : 'Nothing to restore: every web page in this copy is already open',
  );
}

// ---------- Saved lists ----------
// Tabs the user picked and named, kept until deleted (see AGENTS.md rule 6). Opened from Settings.

const listChoice = () => state.tabs.filter((t) => state.selected.has(t.id) && canFavourite(t));

function openSaveList() {
  const chosen = listChoice();
  if (!chosen.length) return;
  const sites = new Set(chosen.map((t) => siteOf(urlOf(t)).label));
  listName.value = sites.size === 1 ? [...sites][0] : `${plural(chosen.length, 'tab')}, ${dayOf(new Date())}`;
  listClose.checked = false;
  listSize.textContent = `Saves the title and address of ${plural(chosen.length, 'tab')} on this computer.`;
  saveListPanel.showPopover();
  listName.focus();
  listName.select();
}

async function saveList(e) {
  e.preventDefault();
  const chosen = listChoice();
  const name = listName.value.trim();
  if (!chosen.length || !name) return;
  const list = { id: crypto.randomUUID(), name, at: Date.now(), tabs: chosen.map((t) => ({ title: labelOf(t), url: urlOf(t) })) };
  try {
    await chrome.storage.local.set({ lists: [list, ...state.lists].slice(0, MAX_LISTS) });
  } catch {
    announce('Could not save the list: Chrome\'s extension storage is full. Delete a list or the recent tabs and try again.');
    return;
  }
  state.lists = [list, ...state.lists].slice(0, MAX_LISTS);
  saveListPanel.hidePopover();
  const closing = listClose.checked;
  if (closing) await closeTabs(chosen.map((t) => t.id));
  setSelecting(false, { silent: true });
  announce(`Saved the list ${name} with ${plural(chosen.length, 'tab')}${closing ? ' and closed them' : ''}`);
}

function showLists() {
  listItems.replaceChildren(
    ...state.lists.map((list) => {
      const remove = h('button', { class: 'text-button', type: 'button', title: 'Delete this list from this computer. Click twice to confirm.' }, 'Delete');
      let armed;
      remove.addEventListener('click', async () => {
        if (!armed) {
          armed = setTimeout(() => {
            armed = null;
            remove.textContent = 'Delete';
          }, 4000);
          remove.textContent = 'Delete it?';
          return;
        }
        clearTimeout(armed);
        state.lists = state.lists.filter((l) => l.id !== list.id);
        await chrome.storage.local.set({ lists: state.lists });
        announce(`Deleted the list ${list.name}`);
        showLists();
      });
      return h('li', { class: 'backup' },
        h('p', { class: 'backup-when' }, list.name),
        h('p', { class: 'backup-size' }, `${plural(list.tabs.length, 'tab')}, saved ${whenText(list.at)}`),
        h('div', { class: 'backup-actions' },
          h('button', { class: 'text-button', type: 'button', title: 'Open every page in this list in a new window. Only the first tab loads; the rest wait, suspended, until you click them.', onclick: () => openList(list) }, 'Open'),
          h('button', { class: 'text-button', type: 'button', title: 'Download this list as a bookmarks file', onclick: () => saveListFile(list) }, 'Save as file'),
          remove));
    }),
  );
  listsNote.textContent = state.lists.length
    ? 'Lists you saved, kept on this computer until you delete them.'
    : 'No saved lists yet. Select some tabs, then choose Save list.';
}

async function openList(list) {
  const opened = await openPages([list.tabs]);
  listsPanel.hidePopover();
  announce(opened ? `Opened ${plural(opened, 'tab')} from ${list.name}${opened < list.tabs.length ? `, skipping ${list.tabs.length - opened} that are not web pages` : ''}` : 'This list has no web pages to open');
}

function saveListFile(list) {
  const slug = list.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'list';
  const total = downloadBookmarks([{ name: list.name, tabs: list.tabs }], dayOf(new Date(list.at)), `bettertabs-list-${slug}.html`);
  announce(`Saved ${plural(total, 'tab')} from ${list.name} to a file`);
}

function saveBackup(backup) {
  const when = new Date(backup.at);
  const windows = backup.windows.map((tabs, i) => ({ name: `Window ${i + 1}`, tabs }));
  const total = downloadBookmarks(windows, `${dayOf(when)} ${pad(when.getHours())}:${pad(when.getMinutes())}`,
    `bettertabs-backup-${dayOf(when)}-${pad(when.getHours())}${pad(when.getMinutes())}.html`);
  announce(`Saved ${plural(total, 'tab')} from this copy to a bookmarks file`);
}

function setQuery(value) {
  search.value = value;
  state.query = value.trim();
  render();
  searchHistory();
  if (state.query) announce(count.textContent);
}

function setView(view) {
  state.view = view;
  state.layout = null;
  save();
  render();
  window.scrollTo(0, 0);
}

function save() {
  chrome.storage.local.set({ view: state.view, collapsed: [...state.collapsed] });
}

function saveSettings() {
  chrome.storage.local.set({ settings: state.settings });
}

// The keys Chrome has for the two commands (the user can change them), shown in the tooltips.
async function loadShortcuts() {
  try {
    for (const command of await chrome.commands.getAll()) state.shortcuts[command.name] = command.shortcut;
  } catch {
    // Without them the tooltips just leave the shortcut out.
  }
  const find = state.shortcuts['search-tabs'];
  search.title = `Search tabs by name, title or address. Press / to jump here${find ? `, or ${find} from any page to open BetterTabs with this box ready` : ''}.`;
}

// The keys Chrome has for the two commands, and the version, shown on the Settings page.
function showShortcuts() {
  document.getElementById('key-open-panel').textContent = keyLabel(state.shortcuts['open-panel']);
  document.getElementById('key-search-tabs').textContent = keyLabel(state.shortcuts['search-tabs']);
  document.getElementById('panel-keys').replaceChildren(
    ...PANEL_KEYS.map(([what, key]) => h('div', { class: 'row' }, h('span', { class: 'row-title' }, what), h('kbd', null, key))),
  );
  document.getElementById('about-version').textContent = `Version ${chrome.runtime.getManifest().version}`;
}

async function restore() {
  loadShortcuts();
  const saved = await chrome.storage.local.get(['view', 'collapsed', 'settings', 'remembered', 'favourites', 'lists']);
  if (VIEWS.includes(saved.view)) state.view = saved.view;
  state.settings.showLongbook = saved.settings?.showLongbook !== false;
  state.settings.showStatus = saved.settings?.showStatus !== false;
  if (VIEWS.includes(saved.settings?.startView)) {
    state.settings.startView = saved.settings.startView;
    state.view = saved.settings.startView;
  }
  settingLongbook.checked = state.settings.showLongbook;
  settingStatus.checked = state.settings.showStatus;
  settingView.value = state.settings.startView;
  state.collapsed = new Set(saved.collapsed ?? []);
  const names = saved.remembered?.names;
  state.remembered = { names: names && typeof names === 'object' ? names : {} };
  state.favourites = (Array.isArray(saved.favourites) ? saved.favourites : [])
    .filter((f) => typeof f?.url === 'string')
    .map((f) => ({ url: f.url, title: String(f.title || f.url), ...(f.site && f.site === siteOf(f.url).key && { site: f.site }) }))
    .slice(0, MAX_FAVOURITES);
  state.lists = (Array.isArray(saved.lists) ? saved.lists : [])
    .filter((l) => typeof l?.id === 'string' && Array.isArray(l.tabs))
    .slice(0, MAX_LISTS);
  const session = await chrome.storage.session.get('names');
  state.names = new Map(Object.entries(session.names ?? {}).map(([id, name]) => [Number(id), name]));
  document.querySelector(`input[name="view"][value="${state.view}"]`).checked = true;
}

// ---------- Wiring ----------

search.addEventListener('input', () => setQuery(search.value));

for (const input of document.querySelectorAll('input[name="view"]')) {
  input.addEventListener('change', () => setView(input.value));
}

closeDupes.addEventListener('click', () => closeTabs(state.extraCopies));

settingsPanel.addEventListener('toggle', (e) => {
  if (e.newState !== 'open') return;
  showShortcuts();
  document.getElementById('settings-title').focus();
});
for (const back of document.querySelectorAll('[data-back="settings"]')) {
  back.addEventListener('click', () => {
    back.closest('[popover]').hidePopover();
    settingsPanel.showPopover();
  });
}
document.getElementById('change-shortcuts').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});
settingLongbook.addEventListener('change', () => {
  state.settings.showLongbook = settingLongbook.checked;
  saveSettings();
  render();
});
settingStatus.addEventListener('change', () => {
  state.settings.showStatus = settingStatus.checked;
  saveSettings();
  renderStatusbar();
});
settingView.addEventListener('change', () => {
  state.settings.startView = settingView.value;
  saveSettings();
});

openBackups.addEventListener('click', () => {
  settingsPanel.hidePopover();
  backupsPanel.showPopover();
});
backupsPanel.addEventListener('toggle', (e) => {
  if (e.newState !== 'open') return;
  showBackups().then(() => backupsTitle.focus());
});
deleteBackups.addEventListener('click', async () => {
  await chrome.storage.local.remove('backups');
  announce('Deleted all recent tabs');
  showBackups();
});

saveEverything.addEventListener('click', () => saveEverythingFile().catch(console.error));
function restoreFrom(file) {
  if (file) restoreEverythingFile(file).catch((error) => {
    console.error(error);
    announce('Could not read that file');
  });
}
// Three ways in, because a native file dialog can fail in a side panel:
// the file chooser API, the plain file input, or dropping the file on the panel.
restoreFile.addEventListener('click', async () => {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'BetterTabs backup', accept: { 'application/json': ['.json'] } }],
      });
      restoreFrom(await handle.getFile());
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
    }
  }
  restoreInput.click();
});
restoreInput.addEventListener('change', () => {
  const [file] = restoreInput.files;
  restoreInput.value = '';
  restoreFrom(file);
});
backupsPanel.addEventListener('dragover', (e) => e.preventDefault());
backupsPanel.addEventListener('drop', (e) => {
  e.preventDefault();
  restoreFrom(e.dataTransfer.files[0]);
});

selectToggle.addEventListener('click', () => setSelecting(!state.selecting));
tidy.addEventListener('click', () => {
  state.layout = null;
  render();
  announce('List tidied');
});
selectionDone.addEventListener('click', () => setSelecting(false));
selectionSave.addEventListener('click', openSaveList);
selectionClose.addEventListener('click', () => actOnSelected('close'));
saveListForm.addEventListener('submit', saveList);
document.getElementById('list-cancel').addEventListener('click', () => saveListPanel.hidePopover());
openLists.addEventListener('click', () => {
  settingsPanel.hidePopover();
  listsPanel.showPopover();
});
listsPanel.addEventListener('toggle', (e) => {
  if (e.newState !== 'open') return;
  showLists();
  listsTitle.focus();
});
selectionSuspend.addEventListener('click', () => actOnSelected('suspend'));
selectionGroup.addEventListener('click', () => actOnSelected('group'));


locate.addEventListener('click', showCurrentTab);

for (const area of [list, strip]) {
  area.addEventListener('contextmenu', (e) => {
    let row = e.target.closest('.tab, .fav, .folder-head');
    // A folder header offers the menu only in the Sites view, for a real website.
    if (row?.classList.contains('folder-head') && !(state.view === 'site' && !row.closest('.folder').dataset.folder.slice(5).startsWith('~'))) row = null;
    // While a name is being edited, leave the browser's own menu (copy, paste) alone.
    if (!row || row.classList.contains('tab-editing')) return;
    e.preventDefault();
    openMenu(row, e.clientX, e.clientY);
  });
}

menu.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  const id = state.menuTab;
  menu.hidePopover();
  if (action === 'rename') startEdit(id);
  else if (action === 'favourite') {
    const host = state.menuSite;
    const key = host ? `site:${host}` : (state.menuFavourite ?? urlOf(state.tabs.find((t) => t.id === id) ?? {}));
    if (state.favourites.some((f) => favKey(f) === key)) removeFavourite(key, { fromStrip: state.menuFavourite != null });
    else if (host) addSiteFavourite(host);
    else addFavourite(state.tabs.find((t) => t.id === id));
  }
  else if (action === 'longbook') addToLongbook(state.tabs.find((t) => t.id === id));
  else if (action === 'suspend') suspendTabs(state.tabs.filter((t) => t.id === id));
  else clearName(id);
});

menu.addEventListener('keydown', (e) => {
  const items = menuItems();
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
  else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus();
  else if (e.key === 'Home') items[0].focus();
  else if (e.key === 'End') items.at(-1).focus();
  else if (e.key === 'Tab') menu.hidePopover();
  else return;
  if (e.key !== 'Tab') e.preventDefault();
});

document.addEventListener('keydown', (e) => {
  // The rename box, the context menu and the settings handle their own keys.
  if (e.target.closest?.('.rename-input, #menu, #settings, #backups, #lists, #save-list')) return;

  const rows = visibleRows();
  const typing = e.target === search;

  if (e.key === 'Escape' && state.selecting && !(typing && search.value)) {
    e.preventDefault();
    setSelecting(false);
    return;
  }

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
  } else if (e.key === 'F2') {
    e.preventDefault();
    startEdit(Number(rows[i].closest('.tab').dataset.id));
  } else if (e.key === 'Delete' || (IS_MAC && e.key === 'Backspace')) {
    e.preventDefault();
    const id = Number(rows[i].closest('.tab').dataset.id);
    // On a ticked tab, Delete closes every ticked tab, as the Close button does.
    if (state.selecting && state.selected.has(id)) actOnSelected('close');
    else closeTabs([id], i);
  }
});

for (const event of ['onCreated', 'onRemoved', 'onActivated', 'onMoved', 'onAttached', 'onDetached']) {
  chrome.tabs[event].addListener(refresh);
}
// Suspending a tab can give it a new id: its name moves with it.
chrome.tabs.onReplaced.addListener((added, removed) => {
  if (state.names.has(removed)) {
    state.names.set(added, state.names.get(removed));
    state.names.delete(removed);
  }
  storeSession();
  refresh();
});
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (VISIBLE_CHANGES.some((key) => key in change)) refresh();
});
for (const event of ['onCreated', 'onRemoved', 'onUpdated', 'onMoved']) {
  chrome.tabGroups[event]?.addListener(refresh);
}
chrome.windows.onFocusChanged.addListener(refresh);

// The keyboard shortcut for searching (see background.js) leaves a note here; focus the box once.
async function focusSearchIfAsked() {
  const { focusSearch } = await chrome.storage.session.get('focusSearch');
  if (!focusSearch) return;
  chrome.storage.session.remove('focusSearch');
  if (Date.now() - focusSearch > 5000) return;
  search.focus();
  search.select();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.focusSearch?.newValue) focusSearchIfAsked();
});

restore().then(load).then(focusSearchIfAsked).then(sampleUsage);
