/* profilo.js – Cambio password + richiesta cambio email (self-service) */
document.addEventListener('DOMContentLoaded', () => {
  const API_ME    = 'https://generatore-tabellone-gare.infinityfree.me/me.php';
  const API_USERS = 'https://generatore-tabellone-gare.infinityfree.me/users.php';

  // refs
  const uEmail = document.getElementById('uEmail');
  const uGym   = document.getElementById('uGym');
  const uRole  = document.getElementById('uRole');
  const globalMsg = document.getElementById('globalMsg');

  const pwdForm = document.getElementById('pwdForm');
  const oldPwd  = document.getElementById('oldPwd');
  const newPwd  = document.getElementById('newPwd');
  const newPwd2 = document.getElementById('newPwd2');
  const pwdMsg  = document.getElementById('pwdMsg');

  const emailForm = document.getElementById('emailForm');
  const newEmail  = document.getElementById('newEmail');
  const newEmail2 = document.getElementById('newEmail2');
  const emailMsg  = document.getElementById('emailMsg');

  const btnBack   = document.getElementById('btnBack');
  const btnHome   = document.getElementById('btnHome');
  const btnLogout = document.getElementById('btnLogout');

  // helpers
  const showOk = (el, msg) => { el.style.color = '#0a8a0a'; el.textContent = msg; };
  const showErr = (el, msg) => { el.style.color = '#c00';   el.textContent = msg; };

  // 1) guard + bootstrap info utente
  async function loadMe() {
    try {
      const r = await fetch(API_ME, { credentials: 'same-origin' });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Non autenticato');
      uEmail.textContent = data.email || '—';
      uGym.textContent   = data.palestra || '—';
      uRole.textContent  = data.role || 'user';
    } catch (err) {
      // se non autenticato → torna al login
      location.href = 'index.html';
    }
  }

  // 2) cambio password
  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pwdMsg.textContent = '';
    const oldv = oldPwd.value;
    const n1   = newPwd.value;
    const n2   = newPwd2.value;

    if (n1.length < 8) {
      showErr(pwdMsg, 'La nuova password deve avere almeno 8 caratteri.');
      return;
    }
    if (n1 !== n2) {
      showErr(pwdMsg, 'Le nuove password non coincidono.');
      return;
    }

    const fd = new FormData();
    fd.append('action', 'change_password');
    fd.append('old_password', oldv);
    fd.append('new_password', n1);

    try {
      const r = await fetch(API_USERS + '?action=change_password', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const out = await r.json();
      if (!r.ok || out.error) throw new Error(out.error || 'Errore aggiornamento');
      showOk(pwdMsg, 'Password aggiornata con successo.');
      oldPwd.value = ''; newPwd.value = ''; newPwd2.value = '';
    } catch (err) {
      showErr(pwdMsg, err.message || 'Errore salvataggio');
    }
  });

  // 3) richiesta cambio email (invio link)
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailMsg.textContent = '';
    const e1 = newEmail.value.trim();
    const e2 = newEmail2.value.trim();

    if (!e1 || !e2) { showErr(emailMsg, 'Inserisci la nuova email in entrambi i campi.'); return; }
    if (e1 !== e2)  { showErr(emailMsg, 'Le email non coincidono.'); return; }

    const fd = new FormData();
    fd.append('action', 'request_email_change');
    fd.append('new_email', e1);

    try {
      const r = await fetch(API_USERS + '?action=request_email_change', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const out = await r.json();
      if (!r.ok || out.error) throw new Error(out.error || 'Errore invio email');
      showOk(emailMsg, 'Ti abbiamo inviato una email con il link di conferma (valido 24h).');
      newEmail.value = ''; newEmail2.value = '';
    } catch (err) {
      showErr(emailMsg, err.message || 'Errore invio email');
    }
  });

  // 4) nav
  btnBack.addEventListener('click', () => history.back());
  btnHome.addEventListener('click', () => location.href = 'menu.html');
  btnLogout.addEventListener('click', () => location.href = 'https://generatore-tabellone-gare.infinityfree.me/logout.php');

  // avvio
  loadMe();
});
