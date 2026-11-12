/* Game: the "New game" menu that asks which difficulty to play. Needs game-rules.js and game-screen.js.
   The browser's <dialog> handles centring, the dimmed background, Esc, and returning focus. */
'use strict';

const newMenu = $('#newMenu');
let menuWasPlaying = false;

function openNewMenu() {
  if (newMenu.open) return;
  closeAsk();
  // Pause the clock while choosing; it resumes if the menu is cancelled.
  menuWasPlaying = active();
  if (menuWasPlaying) { S.paused = true; render(); }
  $('#newMenuWarn').hidden = !hasProgress();
  // Highlight and focus the level being played now.
  newMenu.querySelectorAll('.menu-levels button').forEach((b) => {
    const current = b.value === S.diff;
    b.autofocus = current;
    if (current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  newMenu.returnValue = '';
  newMenu.showModal();
}

newMenu.addEventListener('close', () => {
  const choice = newMenu.returnValue;
  newMenu.returnValue = '';
  const resume = menuWasPlaying;
  menuWasPlaying = false;
  if (DIFFS[choice]) newGame(choice);
  else if (resume) pause(false); // cancelled: carry on where you were
});

enableLightDismiss(newMenu); // clicking outside the menu closes it
