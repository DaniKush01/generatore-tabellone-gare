// /gestione_gare/js/modifica_credenziali.js
document.addEventListener('DOMContentLoaded', () => {
  console.info('modifica_credenziali.js v1');

  const API = 'https://generatore-tabellone-gare.infinityfree.me/users.php';
  const status = document.getElementById('status');

  // ricava l'utente corrente (assumo salvato al login)
  const userId = sessionStorage.getItem('userId');
  const userEmail = sessionStorage.getItem('email');
  if (!userId) {
    status.className = 'status error';
    status.textContent = 'Devi effettuare il login.';
    return;
  }

  /* Cambio password */
  const pwdForm = document.getElementById('pwdForm');
  pwdForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const oldPwd = document.getElementById('oldPwd').value;
    const newPwd = document.getElementById('newPwd').value;
    const newPwd2= document.getElementById('newPwd2').value;

    if (newPwd.length < 8) { status.className='status error'; status.textContent='Password minima 8 caratteri'; return; }
    if (newPwd !== newPwd2) { status.className='status error'; status.textContent='Le nuove password non coincidono'; return; }

    const fd = new FormData();
    fd.append('action','change_password');
    fd.append('id', userId);
    fd.append('old_password', oldPwd);
    fd.append('new_password', newPwd);

    try {
      const res = await fetch(API+'?action=change_password', { method:'POST', body:fd });
      const out = await res.json();
      if(!res.ok || out.error) throw new Error(out.error || 'Errore cambio password');
      status.className = 'status ok'; status.textContent = 'Password aggiornata';
      e.target.reset();
    } catch(err){
      status.className = 'status error'; status.textContent = err.message;
    }
  });

  /* Cambio email (richiesta verifica) */
  const mailForm = document.getElementById('mailForm');
  mailForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const newEmail = document.getElementById('newEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      status.className='status error'; status.textContent='Email non valida'; return;
    }

    const fd = new FormData();
    fd.append('action','request_email_change');
    fd.append('id', userId);
    fd.append('new_email', newEmail);

    try {
      const res = await fetch(API+'?action=request_email_change', { method:'POST', body:fd });
      const out = await res.json();
      if(!res.ok || out.error) throw new Error(out.error || 'Errore invio link');
      status.className = 'status ok';
      status.textContent = 'Ti abbiamo inviato un link di verifica alla nuova email.';
      e.target.reset();
    } catch(err){
      status.className='status error'; status.textContent=err.message;
    }
  });
});
