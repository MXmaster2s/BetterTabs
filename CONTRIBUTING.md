# Contributing

Issues and pull requests are welcome. BetterTabs is small on purpose: one folder, no build step, no dependencies.

## Before you start

- Read [AGENTS.md](AGENTS.md). Its hard rules apply to people as much as to agents: no build step or dependency, the fewest permissions possible, no network, closing a tab stays immediate.
- For anything bigger than a fix, open an issue first so we agree on the behaviour before you write it.

## Make a change

1. Fork and clone the repository, then load the `extension/` folder in Chrome (see [Install](README.md#install)).
2. Make the change. Match the surrounding code: two-space indent, single quotes, semicolons, DOM built with `h()`.
3. Try it with fake tabs: `python3 -m http.server 8741`, then open <http://localhost:8741/preview/>. Check light and dark mode, every view, and the keyboard.
4. Run `node scripts/check.mjs`. It must pass; CI runs the same command.
5. In the same pull request, update the docs a reader would look at:
   - the **Features** list (and **Keyboard** table) in [README.md](README.md),
   - [docs/SPEC.md](docs/SPEC.md) when behaviour changes,
   - [docs/store-listing.md](docs/store-listing.md) when users would see the difference or a permission changes,
   - [CHANGELOG.md](CHANGELOG.md), with `version` bumped in `extension/manifest.json`.

`node scripts/check.mjs` fails if the changelog has no entry for the manifest version, if a permission has no store justification, or if a document names a file that does not exist.

## Reporting a problem

Use the issue templates. Include your Chrome version and the BetterTabs version from `chrome://extensions`.

## License

By contributing you agree that your contribution is released under the [MIT license](LICENSE).
