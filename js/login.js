/*  js/login.js  –  Login via fetch POST + bootstrap sessione
    --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('loginForm');
  const errMsg    = document.getElementById('login_error');
  const pwdInput  = document.getElementById('password');
  const emailInput= document.getElementById('username');
  const toggleBox = document.getElementById('mostra_password');
  const toggleLbl = document.getElementById('toggle_pw_label');
  const submitBtn = document.getElementById('login_button');

  // Mostra/Nascondi password (compatibile anche senza inline onclick)
  if (toggleBox) {
    const applyToggle = () => {
      const show = !!toggleBox.checked;
      pwdInput.type = show ? 'text' : 'password';
      if (toggleLbl) toggleLbl.textContent = show ? 'Nascondi password' : 'Mostra password';
    };
    toggleBox.addEventListener('change', applyToggle);
    // fallback per eventuale onclick legacy
    window.showPassword = applyToggle;
  }

  // Helper UI
  function setError(msg) {
    if (!errMsg) return;
    errMsg.textContent = msg || '';
    errMsg.style.display = msg ? 'block' : 'none';
  }
  function setLoading(loading) {
    if (submitBtn) submitBtn.disabled = !!loading;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = (emailInput?.value || '').trim();
    const pass  = pwdInput?.value || '';

    if (!email || !pass) {
      setError('Inserisci email e password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/gestione_gare/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      // Prova a leggere sempre JSON
      const out = await res.json().catch(() => ({}));

      if (!res.ok || (!out.ok && out.ok !== true)) {
        throw new Error(out.error || 'Credenziali non corrette');
      }

      // Normalizza campi di risposta
      const userId   = out.id ?? out.user_id ?? out.userId ?? null;
      const ruolo    = (out.role ?? out.ruolo ?? '').toString().toLowerCase();
      const palestra = out.palestra ?? '';
      const isAdmin  = ruolo === 'admin';

      // Bootstrap sessione per tutte le pagine
      sessionStorage.setItem('userId', userId ? String(userId) : '');
      sessionStorage.setItem('email', email);
      sessionStorage.setItem('palestra', palestra);
      sessionStorage.setItem('role', ruolo);           // backward-compat
      sessionStorage.setItem('ruolo', ruolo);          // nel dubbio salviamo entrambe
      sessionStorage.setItem('isAdmin', String(isAdmin));

      // Vai al menu
      location.href = 'menu.html';
    } catch (err) {
      setError('Credenziali non corrette');
    } finally {
      setLoading(false);
    }
  });
});
