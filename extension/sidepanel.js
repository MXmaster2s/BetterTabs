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
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);
// Only real pages are remembered by address: every new tab shares one address.
const REMEMBERABLE = /^(https?|file):/i;
const REMEMBER_NAMES = 300;
const MAX_FAVOURITES = 100;

const state = {
  view: 'site',
  query: '',
  collapsed: new Set(),
  tabs: [],
  groups: new Map(),
  windowId: null,
  duplicates: new Set(),
  extraCopies: [],
  names: new Map(), // tab id -> name typed by the user
  favourites: [], // favourite pages { url, title }, in the order they were added; kept until removed
  prints: new Map(), // page address -> short hash of it, for pages that can be remembered
  remembered: { names: {} }, // names by hash, kept across restarts
  editing: null, // id of the tab whose name is being edited
  menuTab: null, // id of the tab the context menu is open for (null on a closed favourite)
  menuFavourite: null, // address of the favourite icon the menu is open on, if it was opened on one
  selecting: false, // whether the list is in Select mode
  selected: new Set(), // ids of the selected tabs
  lastSelected: null, // the tab last ticked, for Shift-click ranges
  shownIds: new Set(), // ids of the tabs the list shows right now (a search can hide some)
  found: null, // id of the tab whose row is pulsing after Show current tab or a favourite click
  shortcuts: {}, // the keys Chrome has for the two commands, by command name
  settings: { showLongbook: true, startView: 'last', autoBackup: false },
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
const exportButton = document.getElementById('export-tabs');
const selectToggle = document.getElementById('select-toggle');
const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const selectionClose = document.getElementById('selection-close');
const selectionSuspend = document.getElementById('selection-suspend');
const selectionGroup = document.getElementById('selection-group');
const selectionDone = document.getElementById('selection-done');
const settingBackup = document.getElementById('setting-backup');
const openBackups = document.getElementById('open-backups');
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

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
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
  const focusedFavourite = document.activeElement?.closest?.('.fav')?.dataset.url;
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

  const folders = foldersFor(shown);
  list.replaceChildren(...(folders.length ? folders.map(renderFolder) : [renderEmpty()]));

  const rows = visibleRows();
  if (pendingFocus != null) {
    rows[Math.min(pendingFocus, rows.length - 1)]?.focus();
    pendingFocus = null;
  } else if (focusedId) {
    list.querySelector(`.tab[data-id="${focusedId}"] .tab-main`)?.focus();
  } else if (focusedFavourite) {
    [...strip.children].find((b) => b.dataset.url === focusedFavourite)?.focus();
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
  const open = state.tabs.filter((t) => urlOf(t) === fav.url);
  return (
    open.find((t) => t.active && t.windowId === state.windowId) ??
    open.find((t) => t.active) ??
    open.find((t) => t.windowId === state.windowId) ??
    open[0]
  );
}

function favouriteFor(tab) {
  return state.favourites.find((f) => f.url === urlOf(tab) && tabForFavourite(f)?.id === tab.id);
}

// The favourites: one icon per page, above the search box. A click goes to the tab, or opens
// the page again if you closed it. The icon stays until you remove it.
function renderFavourites() {
  strip.hidden = state.favourites.length === 0;
  strip.replaceChildren(
    ...state.favourites.map((fav) => {
      const tab = tabForFavourite(fav);
      const title = tab ? labelOf(tab) : fav.title;
      return h(
        'button',
        {
          class: tab ? 'fav' : 'fav fav-closed',
          type: 'button',
          'data-url': fav.url,
          style: `--base: hsl(${hueOf(siteOf(fav.url).key)} 62% 50%)`,
          title: `${title}\n${fav.url}\n${tab ? 'Favourite: click to go to this tab' : 'Favourite, closed: click to open it again'}\nRight-click to remove it`,
          'aria-label': tab ? title : `${title}, closed`,
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
            : 'Click to switch to this tab. F2 renames it. Ctrl or Cmd-click to select several.',
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
        title: 'Close tab (Delete key). It closes straight away.',
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
    h('p', null, `No tabs match “${state.query}”.`),
    h('button', { class: 'text-button', type: 'button', onclick: () => setQuery('') }, 'Clear search'),
  );
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

function removeFavourite(url, { fromStrip = false } = {}) {
  const tab = tabForFavourite({ url });
  state.favourites = state.favourites.filter((f) => f.url !== url);
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
    if (!tab || labelOf(tab) === fav.title) return fav;
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

// `row` is a tab row or a favourite icon. Favourite icons can only be removed.
function openMenu(row, x, y) {
  const fromStrip = row.classList.contains('fav');
  const id = fromStrip ? null : Number(row.dataset.id);
  const tab = state.tabs.find((t) => t.id === id) ?? {};
  state.menuTab = id;
  state.menuFavourite = fromStrip ? row.dataset.url : null;
  renameItem.hidden = fromStrip;
  resetName.hidden = fromStrip || !state.names.has(id);
  const starred = fromStrip || state.favourites.some((f) => f.url === urlOf(tab));
  favouriteItem.hidden = !fromStrip && !canFavourite(tab);
  favouriteItem.textContent = starred ? 'Remove from favourites' : 'Add to favourites';
  favouriteItem.title = starred
    ? 'Take this page off the favourites row'
    : 'Keep this page in the row above the search box, even after you close the tab';
  longbookItem.hidden = !offersLongbook(tab);
  menuGetLongbook.hidden = longbookItem.hidden;
  suspendItem.hidden = !canSuspend(tab);

  // Focus the row first so focus returns to it when the menu closes.
  (fromStrip ? row : row.querySelector('button.tab-main'))?.focus();
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

function exportTabs() {
  const exportable = state.tabs
    .filter((t) => urlOf(t) && !/^(chrome|edge):\/\/newtab\/?$/.test(urlOf(t)))
    .sort((a, b) => a.windowId - b.windowId || a.index - b.index);
  if (!exportable.length) {
    announce('There are no tabs to export');
    return;
  }
  const byWindow = Map.groupBy(exportable, (t) => t.windowId);
  const order = [...byWindow.keys()].sort((a, b) => (b === state.windowId) - (a === state.windowId));
  const date = dayOf(new Date());
  const windows = order.map((windowId, i) => ({
    name: windowId === state.windowId ? 'This window' : `Window ${i + 1}`,
    tabs: byWindow.get(windowId).map((tab) => ({ title: labelOf(tab), url: urlOf(tab) })),
  }));
  const total = downloadBookmarks(windows, date, `bettertabs-${date}.html`);
  announce(`Exported ${plural(total, 'tab')} to a file`);
}

// ---------- Backups ----------
// background.js keeps the copies in chrome.storage.local while the setting is on; the panel lists,
// restores, saves and deletes them.

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
          h('button', { class: 'text-button', type: 'button', title: 'Download this copy as a bookmarks file', onclick: () => saveBackup(backup) }, 'Save as file')));
    }),
  );
  deleteBackups.hidden = !backups.length;
  backupsNote.textContent = !state.settings.autoBackup
    ? 'Backups are off. Turn them on in Settings.'
    : backups.length
      ? 'Copies of your open tabs, kept on this computer. Restore opens each window with its tabs.'
      : 'No copies yet. The first one is taken when you open, close or change a tab.';
}

// Opens each saved window as a new window. Pages that are already open are skipped, and only the
// first tab of each window loads: the rest are suspended so hundreds of tabs don't load at once.
async function restoreBackup(backup) {
  const open = new Set(state.tabs.map(urlOf));
  let opened = 0;
  for (const saved of backup.windows) {
    const entries = saved.filter((t) => /^https?:/i.test(t.url) && !open.has(t.url));
    if (!entries.length) continue;
    const win = await chrome.windows.create({ url: entries.map((t) => t.url), focused: false });
    const created = (await chrome.tabs.query({ windowId: win.id })).sort((a, b) => a.index - b.index);
    created.forEach((tab, i) => {
      if (entries[i]?.pinned) chrome.tabs.update(tab.id, { pinned: true }).catch(() => {});
      if (i > 0) chrome.tabs.discard(tab.id).catch(() => {});
    });
    opened += entries.length;
  }
  backupsPanel.hidePopover();
  const total = backup.windows.reduce((sum, w) => sum + w.length, 0);
  announce(
    opened
      ? `Restored ${plural(opened, 'tab')}${opened < total ? `, skipping ${total - opened} already open or not a web page` : ''}`
      : 'Nothing to restore: every web page in this backup is already open',
  );
}

function saveBackup(backup) {
  const when = new Date(backup.at);
  const windows = backup.windows.map((tabs, i) => ({ name: `Window ${i + 1}`, tabs }));
  const total = downloadBookmarks(windows, `${dayOf(when)} ${pad(when.getHours())}:${pad(when.getMinutes())}`,
    `bettertabs-backup-${dayOf(when)}-${pad(when.getHours())}${pad(when.getMinutes())}.html`);
  announce(`Saved ${plural(total, 'tab')} from this backup to a file`);
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

async function restore() {
  loadShortcuts();
  const saved = await chrome.storage.local.get(['view', 'collapsed', 'settings', 'remembered', 'favourites']);
  if (VIEWS.includes(saved.view)) state.view = saved.view;
  state.settings.showLongbook = saved.settings?.showLongbook !== false;
  state.settings.autoBackup = saved.settings?.autoBackup === true;
  if (VIEWS.includes(saved.settings?.startView)) {
    state.settings.startView = saved.settings.startView;
    state.view = saved.settings.startView;
  }
  settingLongbook.checked = state.settings.showLongbook;
  settingBackup.checked = state.settings.autoBackup;
  settingView.value = state.settings.startView;
  state.collapsed = new Set(saved.collapsed ?? []);
  const names = saved.remembered?.names;
  state.remembered = { names: names && typeof names === 'object' ? names : {} };
  state.favourites = (Array.isArray(saved.favourites) ? saved.favourites : [])
    .filter((f) => typeof f?.url === 'string')
    .map((f) => ({ url: f.url, title: String(f.title || f.url) }))
    .slice(0, MAX_FAVOURITES);
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
  if (e.newState === 'open') settingLongbook.focus();
});
settingLongbook.addEventListener('change', () => {
  state.settings.showLongbook = settingLongbook.checked;
  saveSettings();
  render();
});
settingView.addEventListener('change', () => {
  state.settings.startView = settingView.value;
  saveSettings();
});

settingBackup.addEventListener('change', () => {
  state.settings.autoBackup = settingBackup.checked;
  saveSettings();
  // Off means nothing is kept: the saved copies go with the setting.
  if (!settingBackup.checked) chrome.storage.local.remove('backups');
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
  announce('Deleted all backups');
  showBackups();
});

selectToggle.addEventListener('click', () => setSelecting(!state.selecting));
selectionDone.addEventListener('click', () => setSelecting(false));
selectionClose.addEventListener('click', () => actOnSelected('close'));
selectionSuspend.addEventListener('click', () => actOnSelected('suspend'));
selectionGroup.addEventListener('click', () => actOnSelected('group'));

exportButton.addEventListener('click', exportTabs);

locate.addEventListener('click', showCurrentTab);

for (const area of [list, strip]) {
  area.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.tab, .fav');
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
    const url = state.menuFavourite ?? urlOf(state.tabs.find((t) => t.id === id) ?? {});
    if (state.favourites.some((f) => f.url === url)) removeFavourite(url, { fromStrip: state.menuFavourite != null });
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
  if (e.target.closest?.('.rename-input, #menu, #settings, #backups')) return;

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
  } else if (e.key === 'Delete') {
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

restore().then(load).then(focusSearchIfAsked);
