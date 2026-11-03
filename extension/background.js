// Clicking the toolbar icon opens the side panel instead of a popup.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// The toolbar icon's tooltip names the shortcut for opening the panel, whatever the user set it to.
chrome.commands
  .getAll()
  .then((commands) => {
    const key = commands.find((c) => c.name === 'open-panel')?.shortcut;
    return chrome.action.setTitle({ title: key ? `Open BetterTabs (${key})` : 'Open BetterTabs' });
  })
  .catch((error) => console.error(error));

// The keyboard shortcuts (change them at chrome://extensions/shortcuts). Opening comes first:
// Chrome only allows it while the key press still counts as the user's action.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'open-panel' && command !== 'search-tabs') return;
  const opened = chrome.sidePanel.open({ windowId: tab.windowId });
  // The panel reads this note when it opens, or at once if it is already open.
  if (command === 'search-tabs') await chrome.storage.session.set({ focusSearch: Date.now() });
  await opened.catch((error) => console.error(error));
});

// ---------- Automatic backups (a setting, off by default) ----------
// Only when the user turns it on: a copy of the open tabs' titles and addresses is kept in
// chrome.storage.local, on this computer. Turning the setting off deletes the copies.

const BACKUP_GAP = 5 * 60 * 1000; // at most one copy every five minutes
const BACKUP_RECENT = 12; // every copy of the last hour or so is kept ...
const BACKUP_HOURLY = 12; // ... then one copy an hour, for about half a day more
const HOUR = 60 * 60 * 1000;
const NEW_TAB = /^(chrome|edge):\/\/newtab\/?$/;

let lastLook = 0;
let backing = false;

// Oldest-first copies in; newest-first out, thinned to the rules above.
function thin(backups) {
  const newest = [...backups].sort((a, b) => b.at - a.at);
  const kept = newest.slice(0, BACKUP_RECENT);
  const hours = new Set();
  for (const backup of newest.slice(BACKUP_RECENT)) {
    const hour = Math.floor(backup.at / HOUR);
    if (hours.has(hour) || hours.size >= BACKUP_HOURLY) continue;
    hours.add(hour);
    kept.push(backup);
  }
  return kept;
}

const addressesOf = (backup) => JSON.stringify(backup.windows.map((tabs) => tabs.map((t) => t.url)));

async function backUp(now = false) {
  if (backing || (!now && Date.now() - lastLook < 30000)) return;
  backing = true;
  lastLook = Date.now();
  try {
    const { settings, backups = [] } = await chrome.storage.local.get(['settings', 'backups']);
    if (!settings?.autoBackup) return;
    if (backups.length && Date.now() - backups[0].at < BACKUP_GAP) return;
    const open = await chrome.tabs.query({});
    const byWindow = new Map();
    for (const tab of open.sort((a, b) => a.windowId - b.windowId || a.index - b.index)) {
      const url = tab.url || tab.pendingUrl || '';
      if (!url || NEW_TAB.test(url)) continue;
      const entry = { title: (tab.title || url).slice(0, 200), url: url.slice(0, 2000) };
      if (tab.pinned) entry.pinned = true;
      byWindow.set(tab.windowId, [...(byWindow.get(tab.windowId) ?? []), entry]);
    }
    const windows = [...byWindow.values()];
    if (!windows.length) return;
    const copy = { at: Date.now(), windows };
    // Nothing changed since the last copy: don't push an older one out.
    if (backups.length && addressesOf(backups[0]) === addressesOf(copy)) return;
    let next = thin([copy, ...backups]);
    // The storage quota is shared: drop the oldest copies until it fits.
    while (next.length) {
      try {
        await chrome.storage.local.set({ backups: next });
        return;
      } catch {
        next = next.slice(0, -1);
      }
    }
  } finally {
    backing = false;
  }
}

for (const event of ['onCreated', 'onRemoved', 'onUpdated', 'onAttached']) {
  chrome.tabs[event].addListener(() => backUp().catch((error) => console.error(error)));
}
chrome.runtime.onStartup.addListener(() => backUp().catch((error) => console.error(error)));
// Turning the setting on takes the first copy at once.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings?.newValue?.autoBackup && !changes.settings.oldValue?.autoBackup) {
    backUp(true).catch((error) => console.error(error));
  }
});
