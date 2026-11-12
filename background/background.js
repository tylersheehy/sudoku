// Clicking the toolbar icon opens the home page in a tab, or switches to a Sudoku tab that's already open
// (home, game or lessons). runtime.getContexts lists our own pages without needing the "tabs" permission.
chrome.action.onClicked.addListener(async () => {
  try {
    const [ctx] = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });
    if (ctx) {
      await chrome.tabs.update(ctx.tabId, { active: true });
      await chrome.windows.update(ctx.windowId, { focused: true });
      return;
    }
  } catch (err) {
    console.error('Could not switch to an open Sudoku tab:', err);
  }
  await chrome.tabs.create({ url: chrome.runtime.getURL('home/home.html') });
});
