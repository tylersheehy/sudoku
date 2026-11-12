// Persistence via chrome.storage.local, shared by game.html and learn.html.
// Values saved by older versions in localStorage are migrated on first read.

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
