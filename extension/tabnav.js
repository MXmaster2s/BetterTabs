// Back and forward through the tabs you switched between (not through a page's own history).
// Runs in the service worker (background.js loads it) and, in the preview, in the page.
// Per window: the tabs you were on, oldest first, and where you are in that list.
// Kept in chrome.storage.session, so it is gone when Chrome closes. Never leaves the computer.

const NAV_MAX = 50;
const NAV_SKIP_MS = 1500; // an activation we caused ourselves is not a new step

let navQueue = Promise.resolve();
const navDo = (fn) => (navQueue = navQueue.then(fn).catch((error) => console.error(error)));

async function navRead() {
  const { tabNav = {} } = await chrome.storage.session.get('tabNav');
  return tabNav;
}
const navWrite = (tabNav) => chrome.storage.session.set({ tabNav });

function navStep(tabNav, windowId, tabId) {
  const s = (tabNav[windowId] ??= { ids: [], at: -1 });
  if (s.skip === tabId && Date.now() < s.skipUntil) {
    delete s.skip;
    return;
  }
  if (s.ids[s.at] === tabId) return;
  s.ids = s.ids.slice(0, s.at + 1);
  s.ids.push(tabId);
  if (s.ids.length > NAV_MAX) s.ids.shift();
  s.at = s.ids.length - 1;
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) =>
  navDo(async () => {
    const tabNav = await navRead();
    navStep(tabNav, windowId, tabId);
    await navWrite(tabNav);
  }),
);

// A closed tab leaves the list; neighbours that become the same tab fold into one.
chrome.tabs.onRemoved.addListener((tabId) =>
  navDo(async () => {
    const tabNav = await navRead();
    let changed = false;
    for (const s of Object.values(tabNav)) {
      if (!s.ids.includes(tabId)) continue;
      changed = true;
      const ids = [];
      let at = -1;
      s.ids.forEach((id, i) => {
        if (id !== tabId && ids[ids.length - 1] !== id) ids.push(id);
        if (i <= s.at && ids.length) at = ids.length - 1;
      });
      s.ids = ids;
      s.at = Math.min(at, ids.length - 1);
    }
    if (changed) await navWrite(tabNav);
  }),
);

async function navGo(windowId, direction) {
  const tabNav = await navRead();
  if (!tabNav[windowId]) {
    // Nothing recorded yet: start from the tab you are on.
    const [active] = await chrome.tabs.query({ windowId, active: true });
    tabNav[windowId] = { ids: active ? [active.id] : [], at: active ? 0 : -1 };
  }
  const s = tabNav[windowId];
  for (let i = s.at + direction; i >= 0 && i < s.ids.length; i += direction) {
    const tab = await chrome.tabs.get(s.ids[i]).catch(() => null);
    if (!tab || tab.windowId !== windowId) continue; // closed or moved: step over it
    s.at = i;
    s.skip = tab.id;
    s.skipUntil = Date.now() + NAV_SKIP_MS;
    await navWrite(tabNav);
    await chrome.tabs.update(tab.id, { active: true });
    return;
  }
}

// The tab you are on when recording starts (install, reload, Chrome starting, the panel opening)
// is the first step, so the first Back has somewhere to go. Windows already recorded are left alone.
async function navSeed(windowId) {
  const tabNav = await navRead();
  const active = await chrome.tabs.query(windowId == null ? { active: true } : { active: true, windowId });
  let changed = false;
  for (const tab of active) {
    if (tabNav[tab.windowId]) continue;
    tabNav[tab.windowId] = { ids: [tab.id], at: 0 };
    changed = true;
  }
  if (changed) await navWrite(tabNav);
}

chrome.runtime.onInstalled.addListener(() => navDo(() => navSeed()));
chrome.runtime.onStartup.addListener(() => navDo(() => navSeed()));

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === 'tab-seed') {
    navDo(() => navSeed(message.windowId)).then(() => reply({ ok: true }));
    return true;
  }
  if (message?.type !== 'tab-nav' || ![-1, 1].includes(message.direction)) return false;
  navDo(() => navGo(message.windowId, message.direction)).then(() => reply({ ok: true }));
  return true;
});
