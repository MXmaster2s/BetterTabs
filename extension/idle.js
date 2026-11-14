// Idle tabs: suspend or close tabs you have not used for a while.
// Runs in the service worker (background.js loads it) and, in the preview, in the page.
// Off until the user turns it on in Settings. Settings live in chrome.storage.local under
// `settings.idle` ({ on, hours, action }). Tabs it closes are listed in `idleClosed`
// ({ at, tabs: [{ title, url }] }) until the user reopens or dismisses them; the panel shows the note.

const IDLE_ALARM = 'idle-sweep';
const IDLE_EVERY_MINUTES = 10;
const IDLE_HOURS = [1, 4, 24, 72, 168];
const IDLE_KEEP = 200; // titles and addresses kept for Reopen
const IDLE_PAGE = /^(https?|file):/i; // only real pages: they can be reopened

function idleConfig(settings) {
  const idle = settings?.idle;
  return {
    on: idle?.on === true,
    hours: IDLE_HOURS.includes(idle?.hours) ? idle.hours : 24,
    action: idle?.action === 'close' ? 'close' : 'suspend',
  };
}

// A favourite is a page (url) or a whole site (site: a host such as github.com).
function idleIsFavourite(tab, favourites) {
  let host = '';
  try {
    host = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    return false;
  }
  return favourites.some((f) => (f.site ? host === f.site || host.endsWith(`.${f.site}`) : f.url === tab.url));
}

// The tabs that would be cleaned up now. Never: the tab you are on in any window, pinned tabs,
// tabs playing sound, favourites, and (when suspending) tabs that are already suspended.
async function idleFind(config) {
  const { favourites } = await chrome.storage.local.get('favourites');
  const kept = Array.isArray(favourites) ? favourites : [];
  const limit = Date.now() - config.hours * 3600e3;
  return (await chrome.tabs.query({})).filter(
    (tab) =>
      !tab.active &&
      !tab.pinned &&
      !tab.audible &&
      !(config.action === 'suspend' && tab.discarded) &&
      IDLE_PAGE.test(tab.url || tab.pendingUrl || '') &&
      Number.isFinite(tab.lastAccessed) &&
      tab.lastAccessed <= limit &&
      !idleIsFavourite(tab, kept),
  );
}

async function idleSweep(force = false) {
  const { settings } = await chrome.storage.local.get('settings');
  const config = idleConfig(settings);
  if (!config.on && !force) return { done: 0, action: config.action };
  const tabs = await idleFind(config);
  if (!tabs.length) return { done: 0, action: config.action };

  if (config.action === 'close') {
    // The note comes first, so a tab can never be closed without a way back.
    const { idleClosed } = await chrome.storage.local.get('idleClosed');
    const earlier = Array.isArray(idleClosed?.tabs) ? idleClosed.tabs : [];
    const now = tabs.map((t) => ({ title: String(t.title || t.url), url: t.url }));
    await chrome.storage.local.set({ idleClosed: { at: Date.now(), tabs: [...now, ...earlier].slice(0, IDLE_KEEP) } });
    await chrome.tabs.remove(tabs.map((t) => t.id)).catch((error) => console.error(error));
    return { done: tabs.length, action: 'close' };
  }
  const results = await Promise.allSettled(tabs.map((t) => chrome.tabs.discard(t.id)));
  // Chrome answers with nothing for a tab it would not unload.
  return { done: results.filter((r) => r.status === 'fulfilled' && r.value).length, action: 'suspend' };
}

// One alarm, only while the feature is on.
async function idleSchedule() {
  const { settings } = await chrome.storage.local.get('settings');
  if (idleConfig(settings).on) {
    if (!(await chrome.alarms.get(IDLE_ALARM))) {
      await chrome.alarms.create(IDLE_ALARM, { delayInMinutes: IDLE_EVERY_MINUTES, periodInMinutes: IDLE_EVERY_MINUTES });
    }
  } else {
    await chrome.alarms.clear(IDLE_ALARM);
  }
}

let idleQueue = Promise.resolve();
const idleDo = (fn) => (idleQueue = idleQueue.then(fn).catch((error) => console.error(error)));

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === IDLE_ALARM) idleDo(() => idleSweep());
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) idleDo(idleSchedule);
});
chrome.runtime.onInstalled.addListener(() => idleDo(idleSchedule));
chrome.runtime.onStartup.addListener(() => idleDo(idleSchedule));

// The panel asks how many tabs are idle right now (peek), or to clean up now (run).
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === 'idle-peek') {
    chrome.storage.local
      .get('settings')
      .then(({ settings }) => idleFind(idleConfig(settings)))
      .then((tabs) => reply({ count: tabs.length }))
      .catch(() => reply({ count: 0 }));
    return true;
  }
  if (message?.type === 'idle-run') {
    idleDo(() => idleSweep(true)).then((result) => reply(result ?? { done: 0 }));
    return true;
  }
  return false;
});
