// Clicking the toolbar icon opens the game in a tab, or focuses the one already open.
// runtime.getContexts finds our own extension pages without needing the "tabs" permission.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('game/game.html');
  try {
    const [ctx] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
    if (ctx) {
      await chrome.tabs.update(ctx.tabId, { active: true });
      await chrome.windows.update(ctx.windowId, { focused: true });
      return;
    }
  } catch (err) {
    console.error('Could not focus the existing game tab:', err);
  }
  await chrome.tabs.create({ url });
});
