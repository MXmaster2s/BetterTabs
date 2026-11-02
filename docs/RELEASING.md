# Releasing

BetterTabs ships as a zip uploaded to the Chrome Web Store. Anyone can also load the `extension/` folder unpacked, so `main` should always be loadable.

## Cut a release

1. Finish the change and its docs: **Features** in `README.md`, `docs/SPEC.md`, `docs/store-listing.md` where users would notice.
2. Bump `version` in `extension/manifest.json` (patch for fixes, minor for features) and `softwareVersion` in the JSON-LD of `site/index.html`.
3. Add a `## <version>` entry at the top of `CHANGELOG.md`, newest first, in plain sentences about what people can now do.
4. Run the checks and try the extension in real Chrome (reload it on `chrome://extensions`):

   ```bash
   node scripts/check.mjs
   ```

5. Build the zip:

   ```bash
   node scripts/package.mjs
   ```

6. Commit, push to `main`, and wait for the **Check** workflow to pass.
7. Tag and publish the release on GitHub with the zip attached:

   ```bash
   git tag v<version> && git push origin v<version>
   gh release create v<version> dist/bettertabs-<version>.zip --notes-from-tag
   ```

8. Upload the same zip in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Paste the listing text and permission justifications from `docs/store-listing.md`.

## Before the first store submission

- A Web Store developer account (one-time registration fee).
- At least one 1280×800 or 640×400 screenshot of the panel, and a 440×280 promo tile if you want to be featured.
- A public privacy policy address. The policy text is in `docs/store-listing.md`; publish it somewhere that has a URL (a GitHub Pages page or the repository's file view works).
