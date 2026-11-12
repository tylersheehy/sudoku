// Clicking the toolbar icon opens the game in a tab, or focuses the one already open.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('game.html');
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});
