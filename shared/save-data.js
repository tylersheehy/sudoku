// Persistence via chrome.storage.local, shared by every page.
// Values saved by older versions in localStorage are migrated on first read.

// The names everything is saved under, in one place so every page agrees.
const SAVE_KEYS = {
  game: 'pencilmark.game.v1',     // the game in progress
  scores: 'pencilmark.scores.v1', // top 50 scores
  stats: 'pencilmark.stats.v1',   // puzzles solved, best score and fastest time per level
  lessons: 'sudoku.learn.v1',     // which lessons are done
};

async function storeGet(key) {
  try {
    const got = await chrome.storage.local.get(key);
    if (got[key] !== undefined) return got[key];
  } catch (err) {
    console.error('storage read failed:', err);
    return null;
  }
  // One-time migration from localStorage.
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    await chrome.storage.local.set({ [key]: value });
    localStorage.removeItem(key);
    return value;
  } catch (err) {
    return null;
  }
}

function storeSet(key, value) {
  try {
    chrome.storage.local.set({ [key]: value }).catch((err) => console.error('storage write failed:', err));
  } catch (err) {
    // chrome.storage is missing when a page is opened directly as a file; nothing is saved then.
  }
}
