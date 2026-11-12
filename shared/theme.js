// Paper (light) by default; the user can switch to dark. Loaded in <head>, before the CSS paints,
// so the saved theme applies without a flash. Uses localStorage because the read must be synchronous.
(() => {
  const KEY = 'sudoku.theme';
  const meta = document.querySelector('meta[name="color-scheme"]');
  const read = () => { try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } };
  const apply = (t) => { meta.content = t; };
  apply(read());

  function toggle() {
    const next = meta.content === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      if (next === 'dark') localStorage.setItem(KEY, 'dark');
      else localStorage.removeItem(KEY); // back to the paper default
    } catch (e) { /* theme still applies for this page, it just isn't remembered */ }
  }

  // Keep the game and Learn tabs in sync.
  window.addEventListener('storage', (e) => { if (e.key === KEY) apply(read()); });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-btn').forEach((b) => b.addEventListener('click', toggle));
  });
})();
