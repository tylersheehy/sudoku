# Project rules for Sudoku for Fun

Read and follow these every time you edit code in this project.

## File size
- Every code file must stay **under 400 lines**. Check line counts after each edit.
- If a file would go over, split it into separate files by purpose (for example `game-rules.js`, `game-screen.js`), not at an arbitrary line.

## Folder structure
- Keep the layout easy for a non-technical person to follow. The map is in `README.md`; update it whenever files are added, renamed or moved.
- `manifest.json` stays in the project root (Chrome requires it). Everything else lives in a folder named for what it is:
  - `game/`: the game page. `learn/`: the lessons page. `shared/`: code and styles used by both pages.
  - `background/`: the service worker. `icons/`: icon images. `tools/`: scripts such as packaging.
- Use plain, descriptive file names (`save-data.js`, not `utils.js`).
- Pages load plain `<script>` files in order and share top-level names, with no build step. When splitting a file, keep the load order in the HTML correct and avoid duplicate top-level names across files.

## Chrome extension rules (Manifest V3)
- No inline scripts or inline event handlers in HTML: Chrome's extension security policy blocks them. Use separate `.js` files.
- All paths in `manifest.json`, `chrome.runtime.getURL()` and HTML links are relative to the project root or the page's own folder. Update them whenever files move.
- New files must be inside `background/`, `game/`, `learn/`, `shared/` or `icons/` to be included by `tools/package.ps1`.
- Keep `CHROMEWEBSTORE.md` in the project root and update it when features, permissions or the version change.
- Don't move `privacy.md`; the published privacy policy URL depends on it.
