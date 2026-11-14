// bettertabs.fyi's measurement, as the privacy page describes it: PostHog with cookies and
// session replay, so the owner can see how people find and use the website. The extension itself
// sends nothing; this file is only on the website.
//
// Where it asks first: a visitor in the EU, the rest of the EEA, the UK or Switzerland, or one
// whose country is not known, sees a cookie banner, and nothing starts until they accept.
// Everywhere else it starts at once and no banner is shown. The country comes from Cloudflare's
// own /cdn-cgi/trace on this host; if that cannot be read, the banner is shown.
(() => {
  // Public by design: a project token only accepts events and reads nothing back.
  const TOKEN = 'phc_z38nEyLAFgHFSNGsfsNZcdLiWbRHqA9v3ffTjoBWbLfm';
  const HOST = 'https://us.i.posthog.com';
  const LIB = 'vendor/posthog-1.434.3.js';

  // The EU, the rest of the EEA (Iceland, Liechtenstein, Norway), the UK and Switzerland.
  const ASK = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
    'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];

  const CHOICE = 'bettertabs.consent'; // 'granted' or 'denied', kept in this browser only
  const get = () => { try { return localStorage.getItem(CHOICE); } catch { return null; } };
  const put = (value) => { try { localStorage.setItem(CHOICE, value); } catch { /* asked again next visit */ } };

  const here = document.currentScript?.src || location.href;
  const url = (path) => new URL(path, here).href;

  // A browser that asks not to be measured is not measured, and neither is any copy of the
  // site that is not bettertabs.fyi itself: a preview, a fork, a developer's machine.
  const live = location.hostname === 'bettertabs.fyi' || location.hostname === 'www.bettertabs.fyi';
  const signals = navigator;
  const asked = signals.globalPrivacyControl === true || signals.doNotTrack === '1';

  let state = 'off'; // on, off, or waiting (the banner is open)
  let loading = null;

  const load = () => {
    if (loading) return loading;
    loading = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = url(LIB);
      s.async = true;
      s.onload = () => {
        const ph = window.posthog;
        if (!ph) return resolve(null);
        ph.init(TOKEN, {
          api_host: HOST,
          ui_host: 'https://us.posthog.com',
          person_profiles: 'identified_only',
          persistence: 'localStorage+cookie',
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: true,
          respect_dnt: true,
          disable_surveys: true,
          // What visitors type is never recorded; the pages themselves are public.
          session_recording: { maskAllInputs: true },
        });
        resolve(ph);
      };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return loading;
  };

  const start = () => { state = 'on'; load(); };
  const stop = () => {
    state = 'off';
    const ph = window.posthog;
    if (ph && ph.__loaded) { ph.opt_out_capturing(); ph.reset(); }
  };

  // Which country the visit is from, by Cloudflare. Anything unclear means: ask.
  const mustAsk = async () => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 2500);
      const res = await fetch('/cdn-cgi/trace', { cache: 'no-store', signal: ctl.signal });
      clearTimeout(timer);
      if (!res.ok) return true;
      const code = (/^loc=([A-Z0-9]{2})$/m.exec(await res.text()) || [])[1];
      if (!code || code === 'XX' || code === 'T1') return true;
      return ASK.includes(code);
    } catch {
      return true;
    }
  };

  // The banner, shown only where asking is required.
  let banner = null;
  const closeBanner = () => { if (banner) { banner.remove(); banner = null; } };
  const choose = (value) => {
    put(value);
    closeBanner();
    value === 'granted' ? start() : stop();
    refresh();
  };
  const openBanner = () => {
    if (banner) return;
    state = 'waiting';
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookies');
    const p = document.createElement('p');
    p.append('This website uses cookies and records how visitors use it, including screen recordings, to see how people find BetterTabs. It starts only if you accept. The BetterTabs extension collects nothing. ');
    const a = document.createElement('a');
    a.href = url('privacy.html#website');
    a.textContent = 'Privacy policy';
    p.append(a);
    const row = document.createElement('div');
    row.className = 'consent-actions';
    const no = document.createElement('button');
    no.type = 'button'; no.className = 'button button-quiet'; no.textContent = 'Decline';
    no.addEventListener('click', () => choose('denied'));
    const yes = document.createElement('button');
    yes.type = 'button'; yes.className = 'button button-primary'; yes.textContent = 'Accept';
    yes.addEventListener('click', () => choose('granted'));
    row.append(no, yes);
    banner.append(p, row);
    document.body.appendChild(banner);
  };

  // The controls on the privacy page: allow or stop, from any region.
  const refresh = () => {
    const note = document.getElementById('consent-state');
    if (!note) return;
    note.textContent = asked
      ? 'Your browser asks not to be measured, so nothing is recorded.'
      : state === 'on' ? 'Cookies and screen recordings are on in this browser.'
      : state === 'waiting' ? 'You have not chosen yet.'
      : 'Cookies and screen recordings are off in this browser.';
  };
  const wire = () => {
    for (const b of document.querySelectorAll('[data-consent-set]')) {
      b.addEventListener('click', () => choose(b.dataset.consentSet));
    }
    refresh();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  if (!live || asked) return;

  const clicks = (event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link || state !== 'on' || !window.posthog?.__loaded) return;
    const place = link.closest('.nav') ? 'header' : link.closest('footer') ? 'footer' : (link.closest('[id]')?.id || 'page');
    if (link.host === 'chromewebstore.google.com') window.posthog.capture('store_clicked', { page: location.pathname, place });
    else if (link.host === 'github.com') window.posthog.capture('source_clicked', { page: location.pathname, place });
  };
  addEventListener('click', clicks);

  const decide = async () => {
    const choice = get();
    if (choice === 'denied') return refresh();
    if (choice === 'granted') { start(); return refresh(); }
    if (await mustAsk()) {
      const open = () => { openBanner(); refresh(); };
      if (document.body) open(); else document.addEventListener('DOMContentLoaded', open);
    } else {
      start();
      refresh();
    }
  };
  decide();
})();
