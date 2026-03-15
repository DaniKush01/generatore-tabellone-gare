window.addEventListener('DOMContentLoaded', () => {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

  const setDisplay = (el, show, displayVal = 'flex') => {
    if (el) el.style.display = show ? displayVal : 'none';
  };
  const bindNav = (id, href, { adminOnly = false } = {}) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (adminOnly && !isAdmin) { btn.style.display = 'none'; return; }
    btn.addEventListener('click', () => { location.href = href; });
  };

  const viewAdmin = document.getElementById('viewAdmin');
  setDisplay(viewAdmin, isAdmin, 'flex');

  // comuni
  bindNav('btnIscrivi',   'iscrivi.html');
  bindNav('btnGestisci',  'gestisci.html');
  bindNav('btnTabellone', 'tabellone.html');
  bindNav('btnProfilo',   'profilo.html'); // NEW

  // admin
  bindNav('btnUtenti',      'gestione_utenti.html', { adminOnly: true });
  bindNav('btnTuttiAtleti', 'tutti_atleti.html',    { adminOnly: true });
});
document.getElementById('btnLogout')?.addEventListener('click', async () => {
  try {
    await fetch('https://generatore-tabellone-gare.infinityfree.me/logout.php', { method: 'POST', credentials: 'include' });
  } catch(_) {}
  sessionStorage.clear();
  location.href = 'index.html';
});
