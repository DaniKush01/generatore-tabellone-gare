/* gestisci_atleti.js – filtro + modal di modifica + delete (REST su atleti.php) */
(function () {
  'use strict';

  var API = 'https://generatore-tabellone-gare.infinityfree.me/atleti.php';

  // ---- session / auth info ----
  var isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  var myGym   = sessionStorage.getItem('palestra') || '';

  // ---- DOM ----
  var head   = document.getElementById('headGest');
  var list   = document.getElementById('athList') || document.getElementById('athleteList');
  var msgEl  = document.getElementById('athMsg');

  var q      = document.getElementById('q');
  var fPales = document.getElementById('f_palestra'); // opzionale
  var fComp  = document.getElementById('f_comp');
  var btnGo  = document.getElementById('btnApply');
  var btnClr = document.getElementById('btnClear');

  var btnCsv = document.getElementById('btnCsv'); // opzionali
  var btnPrn = document.getElementById('btnPrint');

  // ---- Modal refs ----
  var backdrop = document.getElementById('editBackdrop');
  var formEdit = document.getElementById('editForm');
  var editMsg  = document.getElementById('editMsg');

  var f_id  = document.getElementById('edit_id');
  var f_no  = document.getElementById('edit_nome');
  var f_co  = document.getElementById('edit_cognome');
  var f_se  = document.getElementById('edit_sesso');
  var f_et  = document.getElementById('edit_eta');
  var f_pe  = document.getElementById('edit_peso');
  var f_ci  = document.getElementById('edit_cintura');
  var f_cp  = document.getElementById('edit_competizione');
  var f_pa  = document.getElementById('edit_pagato');
  var f_pl  = document.getElementById('edit_palestra');
  var wrapPl = document.getElementById('wrap_palestra');

  var btnSave   = document.getElementById('btnSave');
  var btnCancel = document.getElementById('btnCancel');
  var btnClose  = document.getElementById('btnCloseModal');

  // admin può cambiare palestra; non-admin no
  wrapPl.style.display = isAdmin ? '' : 'none';

  // admin-only hint per filtro palestra
  if (!isAdmin && fPales) {
    fPales.disabled = true;
    if (myGym) fPales.placeholder = 'Palestra: ' + myGym;
  }

  var lastData = [];
  var NON_PESATE = { 'Dimostrazione':1, 'Kata':1, 'Kata Kobudo':1 };

  function euro(n) {
    n = Number(n || 0);
    return '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function paidClass(v) { return Number(v) > 0 ? 'badge-paid' : 'badge-unpaid'; }
  function setMsg(text) { if (msgEl) msgEl.textContent = text || ''; }

  function buildQuery() {
    var p = [];
    var qv = q && q.value.trim();
    if (qv) p.push('q=' + encodeURIComponent(qv));

    var comp = fComp && fComp.value;
    if (comp) p.push('competizione=' + encodeURIComponent(comp));

    var pal = (isAdmin ? (fPales && fPales.value && fPales.value.trim()) : myGym);
    if (pal) p.push('palestra=' + encodeURIComponent(pal));

    return p.length ? ('?' + p.join('&')) : '';
  }

  function rowTemplate(a) {
    var peso = (a.peso != null && a.peso !== '') ? a.peso : '-';
    var pag  = a.pagato != null ? a.pagato : 0;

    return '' +
      '<div class="row" style="justify-content:center; align-items:center;">' +
        '<div class="field" style="width:5%;">' + a.id + '</div>' +
        '<div class="field" style="width:10%;">' + (a.nome || '') + '</div>' +
        '<div class="field" style="width:10%;">' + (a.cognome || '') + '</div>' +
        '<div class="field" style="width:5%;">'  + (a.sesso || '') + '</div>' +
        '<div class="field" style="width:5%;">'  + (a.eta != null ? a.eta : '-') + '</div>' +
        '<div class="field" style="width:5%;">' + peso + '</div>' +
        '<div class="field" style="width:10%;">' + (a.cintura || '-') + '</div>' +
        '<div class="field" style="width:20%;">' + (a.competizione || '-') + '</div>' +
        '<div class="field" style="width:10%;">' +
          '<span class="' + paidClass(pag) + '">' + euro(pag) + '</span>' +
        '</div>' +
       '<div class="field" style="width:20%;">' +
        '<button class="btn btn-edit" data-id="' + a.id + '" title="Modifica" aria-label="Modifica">✏️</button> ' +
        '<button class="btn danger btn-del" data-id="' + a.id + '" title="Elimina" aria-label="Elimina">🗑️</button>' +
      '</div>' +
    '</div>';
  }

  function render(rows) {
    if (!list) return;
    list.innerHTML = '';
    if (!rows || !rows.length) {
      if (head) head.style.display = 'none';
      setMsg('Nessun atleta trovato');
      return;
    }
    if (head) head.style.display = 'flex';
    setMsg('');

    rows.forEach(function (a) {
      var row = document.createElement('div');
      row.className = 'row-list col-11';
      row.innerHTML = rowTemplate(a);
      list.appendChild(row);
    });
  }

  function parseResp(r) {
    return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
  }

  function handleHttp(res) {
    if (res.status === 401) { window.location.href = 'index.html'; return false; }
    if (res.status === 403) { setMsg('Operazione non consentita (403).'); return false; }
    if (!res.ok) {
      var m = (res.data && (res.data.error || res.data.message)) || 'Errore';
      setMsg(m); return false;
    }
    return true;
  }

  function fetchData() {
    if (!list) return;
    setMsg('');
    list.innerHTML = '<div class="field" style="grid-column:1/-1;text-align:center;">Caricamento…</div>';

    var url = API + buildQuery();
    fetch(url, { method: 'GET', credentials: 'include' })
      .then(parseResp)
      .then(function (res) {
        if (!handleHttp(res)) return;
        lastData = Array.isArray(res.data) ? res.data : [];
        render(lastData);
      })
      .catch(function (err) {
        list.innerHTML = '';
        setMsg(err && err.message ? err.message : 'Errore');
      });
  }

  // ---------- MODAL ----------
  function openModal() { backdrop.style.display = 'flex'; backdrop.setAttribute('aria-hidden', 'false'); }
  function closeModal() {
    backdrop.style.display = 'none'; backdrop.setAttribute('aria-hidden', 'true');
    formEdit.reset(); editMsg.textContent = ''; editMsg.className = 'hint';
  }
  btnCancel.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);
  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) closeModal(); });

  function fillModal(a) {
    f_id.value = a.id;
    f_no.value = a.nome || '';
    f_co.value = a.cognome || '';
    f_se.value = a.sesso || '';
    f_et.value = a.eta != null ? a.eta : '';
    f_pe.value = (a.peso != null && a.peso !== '') ? a.peso : '';
    f_ci.value = a.cintura || '';
    f_cp.value = a.competizione || '';
    f_pa.value = a.pagato != null ? a.pagato : 0;
    f_pl.value = a.palestra || (myGym || '');
    // hint peso
    var comp = f_cp.value || '';
    var nonPesata = NON_PESATE[comp] === 1;
    document.getElementById('pesoHelp').textContent =
      nonPesata ? ('Per ' + comp + ' il peso non è obbligatorio.')
                : 'Obbligatorio per Kick-Jitsu, Lotta a Terra, Submission.';
  }

  function getAthById(id) {
    id = Number(id);
    for (var i=0;i<lastData.length;i++) if (Number(lastData[i].id) === id) return lastData[i];
    return null;
  }

  // diff minimale: invia solo ciò che è cambiato
  function diffPayload(oldA) {
    var p = {};
    function setIfChanged(key, newVal){
      var oldVal = (oldA[key] == null ? '' : String(oldA[key]));
      var nv = (newVal == null ? '' : String(newVal));
      if (nv !== oldVal) p[key] = newVal;
    }
    setIfChanged('nome',         f_no.value.trim());
    setIfChanged('cognome',      f_co.value.trim());
    setIfChanged('sesso',        f_se.value);
    setIfChanged('eta',          f_et.value ? Number(f_et.value) : null);
    setIfChanged('peso',         f_pe.value === '' ? null : Number(f_pe.value));
    setIfChanged('cintura',      f_ci.value);
    setIfChanged('competizione', f_cp.value);
    setIfChanged('pagato',       f_pa.value === '' ? 0 : Number(f_pa.value));
    if (isAdmin) setIfChanged('palestra', f_pl.value.trim());
    return p;
  }

  formEdit.addEventListener('submit', function(e){
    e.preventDefault();
    editMsg.textContent = ''; editMsg.className = 'hint';

    // validazioni minime
    if (!f_no.value.trim() || !f_co.value.trim() || !f_se.value || !f_et.value || !f_ci.value || !f_cp.value) {
      editMsg.textContent = 'Compila tutti i campi obbligatori.'; editMsg.className = 'hint err'; return;
    }
    // peso richiesto se competizione pesata
    var comp = f_cp.value;
    var nonPes = !!NON_PESATE[comp];
    if (!nonPes && f_pe.value === '') {
      editMsg.textContent = 'Inserisci il peso per la competizione selezionata.'; editMsg.className = 'hint err'; return;
    }

    var id = f_id.value;
    var old = getAthById(id) || {};
    var payload = diffPayload(old);
    if (!Object.keys(payload).length) {
      editMsg.textContent = 'Nessuna modifica da salvare.'; editMsg.className = 'hint'; return;
    }

    btnSave.disabled = true;

    fetch(API + '?id=' + encodeURIComponent(id), {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(parseResp)
      .then(function(res){
        btnSave.disabled = false;
        if (!handleHttp(res)) { editMsg.textContent = (res.data && (res.data.error||res.data.message)) || 'Errore'; editMsg.className='hint err'; return; }
        editMsg.textContent = 'Salvato!'; editMsg.className = 'hint ok';
        // ricarica elenco per riflettere modifiche
        fetchData();
        // chiudi dopo un attimo
        setTimeout(closeModal, 400);
      })
      .catch(function(err){
        btnSave.disabled = false;
        editMsg.textContent = (err && err.message) || 'Errore'; editMsg.className='hint err';
      });
  });

  // Delegation: Modifica / Elimina
  if (list) {
    list.addEventListener('click', function(e){
      var t = e.target;
      if (t.classList.contains('btn-edit')) {
        var id = t.dataset.id;
        var a = getAthById(id);
        if (!a) return;
        fillModal(a);
        openModal();
        return;
      }
      if (t.classList.contains('btn-del')) {
        var idd = t.dataset.id;
        if (!confirm('Eliminare atleta #' + idd + '?')) return;
        fetch(API + '?id=' + encodeURIComponent(idd), { method:'DELETE', credentials:'include' })
          .then(parseResp)
          .then(function(res){ if (!handleHttp(res)) return; fetchData(); })
          .catch(function(err){ alert((err && err.message) || 'Errore eliminazione'); });
        return;
      }
    });
  }

  // ---- CSV / Print opzionali (se presenti) ----
  function toCsv(rows) {
    var headers = ['ID','Nome','Cognome','Sesso','Età','Peso','Cintura','Competizione','Pagato'];
    var lines = [headers.join(';')];
    (rows || []).forEach(function (a) {
      var r = [
        a.id, a.nome || '', a.cognome || '', a.sesso || '',
        (a.eta != null ? a.eta : ''), (a.peso != null ? a.peso : ''), a.cintura || '',
        a.competizione || '', (a.pagato != null ? a.pagato : 0)
      ].map(function (v) {
        v = (v == null) ? '' : String(v);
        v = v.replace(/"/g, '""');
        return '"' + v + '"';
      });
      lines.push(r.join(';'));
    });
    return '\ufeff' + lines.join('\n');
  }
  function downloadCsv() {
    var csv = toCsv(lastData || []);
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'atleti_iscritti.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }
  if (btnCsv) btnCsv.addEventListener('click', downloadCsv);
  if (btnPrn) btnPrn.addEventListener('click', function(){ window.print(); });

  // ---- Filtri ----
  if (btnGo)  btnGo.addEventListener('click', fetchData);
  if (btnClr) btnClr.addEventListener('click', function(){
    if (q) q.value = '';
    if (fComp) fComp.value = '';
    if (isAdmin && fPales) fPales.value = '';
    fetchData();
  });
  if (q) q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fetchData(); } });

  // ---- Avvio ----
  document.getElementById('gymName').textContent = myGym || (isAdmin ? 'Tutte' : '');
  fetchData();
})();
