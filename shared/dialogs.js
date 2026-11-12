/* Shared: helpers for pop-up menus built on the browser's <dialog>. Used by the game and the home page. */
'use strict';

// Clicking outside a dialog closes it. Newer Chrome does this itself for closedby="any"; older versions need this.
function enableLightDismiss(dialog) {
  if ('closedBy' in HTMLDialogElement.prototype) return;
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right;
    if (!inside) dialog.close();
  });
}
