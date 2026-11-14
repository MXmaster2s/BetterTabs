// bettertabs.fyi's measurement, as the privacy page describes it: page views and clicks on the
// Chrome Web Store and GitHub links, sent to PostHog with no cookie and nothing kept in the
// browser. The extension itself sends nothing; this file is only on the website.
(() => {
  // Public by design: a project token only accepts events and reads nothing back.
  const TOKEN = 'phc_z38nEyLAFgHFSNGsfsNZcdLiWbRHqA9v3ffTjoBWbLfm';
  const HOST = 'https://us.i.posthog.com';

  // The visitor's own switch, on the privacy page. It is the one thing this file keeps in the
  // browser, and only for someone who asked not to be measured.
  const OPT_OUT = 'bettertabs.measure';
  const read = () => {
    try { return localStorage.getItem(OPT_OUT) === 'off'; } catch { return false; }
  };
  const write = (off) => {
    try { off ? localStorage.setItem(OPT_OUT, 'off') : localStorage.removeItem(OPT_OUT); } catch { /* no storage */ }
  };

  const wire = () => {
    const box = document.getElementById('measure-switch');
    if (!box) return;
    box.checked = !read();
    box.addEventListener('change', () => write(!box.checked));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  // A browser that asks not to be measured is not measured, and neither is any copy of the
  // site that is not bettertabs.fyi itself: a preview, a fork, a developer's machine.
  const signals = navigator;
  const declined = signals.globalPrivacyControl === true || signals.doNotTrack === '1' || read();
  const live = location.hostname === 'bettertabs.fyi' || location.hostname === 'www.bettertabs.fyi';
  if (declined || !live) return;

  // Addresses are reported without their query or fragment.
  const bare = (value) => (typeof value === 'string' ? value.split(/[?#]/)[0] : value);

  // Four campaign tags on the address a visit arrived by, and nothing else from its query. A value
  // is kept only if it is a plain label: no address, link or query.
  const campaign = {};
  try {
    const query = new URLSearchParams(location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      const value = (query.get(key) || '').trim().slice(0, 100);
      if (value && /^[A-Za-z0-9._+ -]+$/.test(value)) campaign[key] = value;
    }
  } catch { /* a malformed query carries no campaign */ }

  const pageviewId = Math.random().toString(36).slice(2, 18);

  const send = (name, extra) => {
    let referringDomain = '$direct';
    try { if (document.referrer) referringDomain = new URL(document.referrer).host; } catch { /* none */ }
    const properties = {
      token: TOKEN,
      distinct_id: '$posthog_cookieless',
      $cookieless_mode: true,
      $process_person_profile: false,
      $lib: 'web',
      $lib_version: 'bettertabs-site',
      $current_url: bare(location.href),
      $host: location.host,
      $pathname: location.pathname,
      $referrer: bare(document.referrer) || '$direct',
      $referring_domain: referringDomain,
      $raw_user_agent: navigator.userAgent,
      $timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      $pageview_id: pageviewId,
      $insert_id: Math.random().toString(36).slice(2, 18),
      $time: Date.now() / 1000,
      ...campaign,
      ...extra,
    };
    fetch(`${HOST}/batch/`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ api_key: TOKEN, batch: [{ event: name, properties, timestamp: new Date().toISOString() }] }),
    }).catch(() => {});
  };

  // Where on the page a link sits: the header, the footer, or the nearest section's id.
  const place = (link) => {
    if (link.closest('.nav')) return 'header';
    if (link.closest('footer')) return 'footer';
    return link.closest('[id]')?.id || 'page';
  };

  addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    if (/^chromewebstore\.google\.com$/.test(link.host)) {
      send('store_clicked', { page: location.pathname, place: place(link) });
    } else if (link.host === 'github.com') {
      send('source_clicked', { page: location.pathname, place: place(link) });
    }
  });

  send('$pageview', {});
})();
