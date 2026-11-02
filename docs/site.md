# Website

The landing page lives in `site/`: plain HTML and CSS, no framework, no tracker, no cookies. The demo on the home page is the real side panel (`extension/sidepanel.*`) running on the fake tabs in `preview/`, so it can never drift from the extension.

| File | What it is |
| --- | --- |
| `site/index.html` | The home page: hero with the live demo, how it works, features, privacy and permissions, install steps, FAQ. |
| `site/privacy.html` | The privacy policy. Keep it in step with `docs/store-listing.md`. |
| `site/assets/site.css` | All styling. Light and dark mode, built from the extension's own colours and folder tabs. |
| `site/assets/icon.png` | A copy of `extension/icons/icon128.png`. `node scripts/check.mjs` fails if they differ. |

## Look at it

```bash
node scripts/build-site.mjs
python3 -m http.server 8742 --directory dist/site
```

Open <http://localhost:8742/>. The build copies `site/`, `extension/` and `preview/` into `dist/site/` (git ignores `dist/`), which is the folder to publish: the demo iframe loads `preview/`, and that page loads `extension/`.

## Keep it true

- The version in the JSON-LD block of `site/index.html` must match `extension/manifest.json`; the check fails otherwise. Update it with each release.
- When a feature changes, update its card, the FAQ and the permission lines on the home page along with the README and spec.
- Say only what is true today. The page says BetterTabs is not on the Chrome Web Store yet; change the install section and that FAQ answer when it is.
- Prices, testimonials and download counts do not belong here: the extension is free and has no analytics to count with.

## Publishing

Any static host works: publish the contents of `dist/site/`. With GitHub Pages, build in a workflow and upload `dist/site` as the Pages artifact. The pages use relative links, so they work from a project path such as `/BetterTabs/` as well as from a domain root.
