/*  gestione_utenti – CRUD via fetch + UX/validazioni/throttle
    Layout: row-list / field (6 colonne)
------------------------------------------------------------*/
const API_URL = 'https://generatore-tabellone-gare.infinityfree.me/users.php';

document.addEventListener('DOMContentLoaded', () => {
  console.info('utenti.js v8');

  /* ---------- GATING ADMIN (client) ---------- */
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  if (!isAdmin) {
    alert('Accesso riservato agli admin');
    location.href = 'menu.html';
    return;
  }

  /* ---------- RIFERIMENTI DOM ---------- */
  const listWrapper = document.getElementById('usersList');
  const form        = document.getElementById('userForm');
  const formTitle   = document.getElementById('formTitle');
  const cancelBtn   = document.getElementById('cancelBtn');
  const submitBtn   = form.querySelector('button[type="submit"]');

  const idField     = document.getElementById('userId');
  const emailField  = document.getElementById('email');
  const passField   = document.getElementById('password');
  const palField    = document.getElementById('palestra');
  const roleField   = document.getElementById('ruolo');

  /* ---------- Status (non invasivo) ---------- */
  function ensureStatusBar() {
    let el = document.getElementById('statusBar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'statusBar';
      el.style.margin = '8px 0';
      el.style.textAlign = 'center';
      el.style.fontWeight = '600';
      form.parentNode.insertBefore(el, form);
    }
    return el;
  }
  const statusBar = ensureStatusBar();
  function showStatus(msg, type = 'info') {
    statusBar.textContent = msg || '';
    statusBar.style.color = type === 'error' ? '#c00' : (type === 'success' ? '#0a8a0a' : '#222');
  }

  /* ---------- Throttle reinvio (60s/utente) ---------- */
  const COOLDOWN = 60; // sec
  const keyCd = id => `resend_until_${id}`;
  const remainingCd = id => {
    const until = parseInt(localStorage.getItem(keyCd(id)) || '0', 10);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  };
  function startCooldown(btn, id) {
    const until = Date.now() + COOLDOWN * 1000;
    localStorage.setItem(keyCd(id), String(until));
    applyCooldown(btn, id);
  }
  function applyCooldown(btn, id) {
    let rem = remainingCd(id);
    if (rem <= 0) {
      btn.disabled = false;
      btn.textContent = '✉️';
      return;
    }
    btn.disabled = true;
    btn.textContent = `✉️ ${rem}s`;
    const t = setInterval(() => {
      rem = remainingCd(id);
      if (rem <= 0) {
        clearInterval(t);
        btn.disabled = false;
        btn.textContent = '✉️';
        localStorage.removeItem(keyCd(id));
      } else {
        btn.textContent = `✉️ ${rem}s`;
      }
    }, 1000);
  }

  /* ---------- CARICA LISTA UTENTI ---------- */
  async function loadUsers() {
    listWrapper.innerHTML = '<div class="field" style="grid-column: span 6;">Caricamento…</div>';
    showStatus('');
    try {
      const res  = await fetch(API_URL);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore generico');

      if (!Array.isArray(data) || !data.length) {
        listWrapper.innerHTML = '<div class="field" style="grid-column: span 6;">Nessun utente.</div>';
        return;
      }

      listWrapper.innerHTML = '';
      data.forEach(u => {
        const row = document.createElement('div');
        row.className = 'row-list col-6';
        row.innerHTML = `
          <div class="field">${u.id}</div>
          <div class="field">${u.email}</div>
          <div class="field">${u.palestra}</div>
          <div class="field">${u.ruolo}</div>
          <div class="field">${u.last_log ?? '-'}</div>
          <div class="field actions">
            <button data-id="${u.id}" class="edit"   title="Modifica">✏️</button>
            <button data-id="${u.id}" class="resend" title="Reinvia invito">✉️</button>
            <button data-id="${u.id}" class="del"    title="Elimina">🗑️</button>
          </div>`;
        listWrapper.appendChild(row);

        // applica cooldown se attivo
        const resendBtn = row.querySelector('button.resend');
        if (resendBtn) applyCooldown(resendBtn, String(u.id));
      });

    } catch (err) {
      listWrapper.innerHTML =
        `<div class="field" style="grid-column: span 6; color:#c00;">Errore: ${err.message}</div>`;
    }
  }

  /* ---------- Validazioni ---------- */
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validateForm(isCreate) {
    const email = (emailField.value || '').trim();
    const palestra = (palField.value || '').trim();
    const ruolo = (roleField.value || '').trim();
    const pwd = passField.value || '';

    if (!emailRe.test(email)) return 'Email non valida';
    if (!palestra) return 'Palestra obbligatoria';
    if (!ruolo) return 'Ruolo obbligatorio';
    if (isCreate && pwd.length < 8) return 'Password minima 8 caratteri';
    return null;
  }

  /* ---------- CREA o UPDATE ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isCreate = !idField.value;
    const valErr = validateForm(isCreate);
    if (valErr) { showStatus(valErr, 'error'); return; }

    const formData = new FormData(form);
    const id = idField.value;

    // non inviare il campo id se create
    if (!id) formData.delete('id');

    // override metodo per compatibilità con PHP (multipart su PUT non viene parsato)
    let url = API_URL + (id ? `?id=${encodeURIComponent(id)}` : '');
    formData.append('_method', id ? 'PUT' : 'POST'); // per create non serve, ma innocuo
    const options = { method: 'POST', body: formData };

    submitBtn.disabled = true;
    const origTxt = submitBtn.textContent;
    submitBtn.textContent = id ? 'Salvataggio…' : 'Creazione…';
    showStatus('');

    try {
      const res  = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio');

      showStatus(id ? 'Utente modificato' : 'Utente creato', 'success');
      resetForm();
      loadUsers();
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = origTxt;
    }
  });

  /* ---------- AZIONI RIGA: EDIT / RESEND / DELETE (delegation) ---------- */
  listWrapper.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    /* EDIT */
    if (btn.classList.contains('edit')) {
      showStatus('');
      try {
        const r = await fetch(API_URL + '?id=' + encodeURIComponent(id));
        const u = await r.json();
        if (!r.ok) throw new Error(u.error || 'Errore lettura utente');

        idField.value      = u.id;
        emailField.value   = u.email;
        passField.value    = '';               // cambia solo se l'admin ne inserisce una nuova
        palField.value     = u.palestra;
        roleField.value    = u.ruolo;
        formTitle.textContent = 'Modifica utente';
        cancelBtn.classList.remove('hidden');
      } catch (err) {
        showStatus(err.message, 'error');
      }
      return;
    }

    /* RESEND INVITE */
    if (btn.classList.contains('resend')) {
      // throttle locale
      const rem = remainingCd(id);
      if (rem > 0) { applyCooldown(btn, id); return; }

      btn.disabled = true;
      showStatus('');
      try {
        // invio action e id sia in query sia nel body (massima compatibilità hosting)
        const url = API_URL + '?id=' + encodeURIComponent(id) + '&action=resend';
        const fd  = new FormData();
        fd.append('action', 'resend');
        fd.append('id', id);

        console.log('RESEND →', url);
        const res  = await fetch(url, { method: 'POST', body: fd });
        const out  = await res.json();
        if (!res.ok || out.error) throw new Error(out.error || 'Errore invio email');

        showStatus('Email di invito reinviata', 'success');
        startCooldown(btn, id);
      } catch (err) {
        showStatus(err.message, 'error');
        btn.disabled = false;
      }
      return;
    }

    /* DELETE */
    if (btn.classList.contains('del')) {
      if (!confirm('Eliminare utente #' + id + '?')) return;
      showStatus('');
      try {
        const fd = new FormData();
        fd.append('_method', 'DELETE');
        fd.append('id', id);

        // manteniamo anche l'id in query per massima compatibilità
        const res  = await fetch(API_URL + '?id=' + encodeURIComponent(id), { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Errore eliminazione');

        showStatus('Utente eliminato', 'success');
        loadUsers();
      } catch (err) {
        showStatus(err.message, 'error');
      }
      return;
    }
  });

  /* ---------- RESET FORM ---------- */
  function resetForm() {
    form.reset();
    idField.value = '';
    formTitle.textContent = 'Crea nuovo utente';
    cancelBtn.classList.add('hidden');
  }
  cancelBtn.addEventListener('click', resetForm);

  /* ---------- AVVIO ---------- */
  loadUsers();
});
