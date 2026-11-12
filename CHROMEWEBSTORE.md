# Chrome Web Store Listing: Sudoku for Fun

> Last Updated: 2026-11-11

## Store Listing

**Extension Name**
Sudoku for Fun
<!-- Must match manifest.json "name". -->

**Short Description** (≤132 chars, matches manifest.json)
Sudoku in its own tab: six difficulty levels, notes, hints, undo, pause, scoring, and full keyboard play.

**Detailed Description**
<!-- CWS strips markdown: paste as plain text with line breaks. -->

Play Sudoku in a full browser tab, and learn the solving techniques behind harder puzzles.

Features:
Six difficulty levels, from Easy to Insane
Notes (pencil marks) for tracking candidates
Up to three hints per puzzle
Unlimited undo
Pause, with the clock stopping automatically when you switch tabs
Scoring with a difficulty multiplier and a high-score list
Full keyboard play: arrow keys, digits, and single-key shortcuts for every tool
12 interactive lessons that teach solving techniques with worked examples, "try it yourself" exercises and matching practice puzzles

How to use:
1. Click the Sudoku for Fun icon in your toolbar, or press Alt+Shift+S.
2. Pick a difficulty and start playing. Your game is saved automatically, so you can close the tab and pick up later.
3. Open "Learn techniques" to work through the lessons.

Privacy:
Sudoku for Fun works entirely offline. Your game in progress, high scores and lesson progress are stored only on your device. Nothing is collected or sent anywhere.

Support:
Report issues at https://github.com/tylersheehy/sudoku/issues

**Category**
Fun
<!-- Shown on the store as "Games" under Entertainment, depending on the current dashboard taxonomy. -->

**Single Purpose**
Lets you play Sudoku puzzles and learn Sudoku solving techniques in a browser tab.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | icons/icon128.png |
| Screenshot 1 | 1280×800 | ✅ Ready | store-screenshot-2-game-full-1280x800.png (Downloads) |
| Screenshot 2 | 1280×800 | ✅ Ready | store-screenshot-3-lesson-1280x800.png (Downloads) |
| Screenshot 3 | 1280×800 | ⬜ Optional | High scores dialog |
| Small Promo Tile | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
1. A game in progress on Medium or Hard, with a cell selected and some notes visible.
2. The Learn techniques page showing a worked example with highlighted candidates.
3. The High scores dialog with a few entries.

Tip: set the browser window to 1280×800 (DevTools device toolbar → Responsive, 1280×800), then capture the screen with DevTools' "Capture screenshot" command.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Saves the user's game in progress, high-score list and completed lessons on their device, so a puzzle can be resumed after closing the tab and progress is kept between sessions. Nothing is synced or transmitted. |

No host permissions are requested. The extension has no content scripts and does not read or change any website.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

All data (the current puzzle, scores and lesson progress) is stored locally with `chrome.storage.local` and never leaves the device. There are no network requests, analytics or third-party services.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | No | No | | No |
| Personal communications | No | No | | No |
| Location | No | No | | No |
| Web history | No | No | | No |
| User activity | No | No | | No |
| Website content | No | No | | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
https://tylersheehy.github.io/sudoku/privacy
<!-- Source: privacy.md in this repo (GitHub Pages, main branch root). Keep it in sync with the text below. -->

```
Privacy Policy for Sudoku for Fun

Last updated: 2026-11-11

Sudoku for Fun does not collect, store on any server, or transmit any personal data or browsing information.

The extension saves your game in progress, your high scores and which lessons you have completed. This data is stored only on your device, in the browser's extension storage, and is used only to resume your game and show your progress. It is never sent anywhere.

This extension does not use cookies, analytics, advertising or any third-party services, and it does not read or change the websites you visit.

You can delete all saved data at any time by removing the extension from Chrome.

If these practices change, this policy will be updated and the "Last updated" date changed.

Questions: tyler.sheehy3@gmail.com
```

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**
Tyler Sheehy

**Contact Email**
tyler.sheehy3@gmail.com (shown publicly and must be monitored)

**Support URL**
https://github.com/tylersheehy/sudoku/issues

**Homepage URL**
https://github.com/tylersheehy/sudoku

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-11-11 | Initial release: six difficulty levels, notes, hints, undo, pause, scoring, high scores, keyboard play, 12 technique lessons. | Draft |

## Review Notes

### Known Issues / Limitations
- Requires Chrome 116 or later.
- Saves made by pre-release builds in `localStorage` are migrated automatically on first launch.

### Pre-submit TODO
- [x] Search the Web Store to confirm "Sudoku for Fun" isn't already taken (checked 2026-11-11: no exact match)
- [x] Take screenshots (at least one at 1280×800)
- [x] Host the privacy policy and fill in its URL
- [x] Register as a developer; contact email set
- [x] Fill in the publisher name
- [ ] Run `package.ps1` and upload `dist/sudoku-1.0.0.zip`
