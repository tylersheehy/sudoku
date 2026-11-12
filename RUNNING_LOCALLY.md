# Running Sudoku locally

This project is a Chrome extension (Manifest V3). There is no build step and nothing to install: you load the folder straight into Chrome.

## Load the extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select this project folder (the one containing `manifest.json`).
5. The "Sudoku for Fun" extension now appears in your list.

## Play

- Click the extension's toolbar icon, or press **Alt+Shift+S**.
- The game opens in its own tab (`game.html`). If it is already open, the existing tab is focused instead.
- If the icon is hidden, click the puzzle-piece menu in Chrome's toolbar and pin **Sudoku for Fun**.
- The learning section is `learn.html`. Open it from the game's UI.

## Edit and reload

After changing any file, go to `chrome://extensions` and click the **reload** (circular arrow) button on the Sudoku card, then refresh the game tab.

- Changes to `game.*`, `learn.*`, `solver.js` and `lessons-data.js` only need a tab refresh once the extension has been reloaded.
- Changes to `manifest.json` or `background.js` always need the reload button.

## Debugging

- **Game page:** right-click the page, then **Inspect**.
- **Background service worker:** on the extension's card in `chrome://extensions`, click **service worker** to open its DevTools.
- **Load errors:** an **Errors** button appears on the extension card if something fails to load.

## Quick preview without Chrome's extension loader (optional)

The pages are plain HTML, so you can also open `game.html` directly in a browser. The toolbar button, the keyboard shortcut and anything using `chrome.*` APIs will not work this way, but the game itself should.

## Packaging for the Chrome Web Store

```
powershell -ExecutionPolicy Bypass -File package.ps1
```

This creates `dist/sudoku-<version>.zip` containing only the files Chrome needs. Bump `version` in `manifest.json` before each upload. Listing text, permission justifications and the privacy policy live in `CHROMEWEBSTORE.md`.

Requires Chrome 116 or later.

## Automatic publishing (GitHub Actions)

[.github/workflows/publish.yml](.github/workflows/publish.yml) uploads a new version and submits it for review when you push a version tag. Credentials live only in GitHub's encrypted secrets, never in the repo.

### One-time setup

1. **Google Cloud:** create a project, enable the **Chrome Web Store API**, and create a **service account** (no roles needed). Under the account's **Keys** tab, create a JSON key. It downloads a file; save it **outside** this project folder.
2. **Developer Dashboard:** in **Account**, add the service account's email (only one is allowed). Note your **Publisher ID** and the extension's **item ID**.
3. **GitHub:** in the repo, go to **Settings → Environments → New environment**, name it `chrome-web-store`, and tick **Required reviewers** (add yourself). In that environment, add the secrets:
   - `CWS_SERVICE_ACCOUNT_JSON`: paste the entire JSON key file contents
   - `CWS_PUBLISHER_ID`
   - `CWS_EXTENSION_ID`
4. Delete the downloaded JSON key file from your computer.

### Releasing a new version

1. Bump `version` in `manifest.json` (e.g. `1.0.1`), commit and push to `main`.
2. Tag and push the tag:
   ```
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. On GitHub, open **Actions → Publish to Chrome Web Store**, review and click **Approve**.

The job fails without uploading if the tag doesn't match the manifest version. Don't release while a previous version is still in review.

**If a key is ever exposed:** delete it in Google Cloud (service account → Keys) immediately, create a new one and update the secret. Removing it from git history is not enough.

## Windows note

If `npx` or `npm` fail in PowerShell with "running scripts is disabled", use `npx.cmd` / `npm.cmd`, or run:

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
