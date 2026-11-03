// Clicking the toolbar icon opens the side panel instead of a popup.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// The keyboard shortcuts (change them at chrome://extensions/shortcuts). Opening comes first:
// Chrome only allows it while the key press still counts as the user's action.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'open-panel' && command !== 'search-tabs') return;
  const opened = chrome.sidePanel.open({ windowId: tab.windowId });
  // The panel reads this note when it opens, or at once if it is already open.
  if (command === 'search-tabs') await chrome.storage.session.set({ focusSearch: Date.now() });
  await opened.catch((error) => console.error(error));
});
