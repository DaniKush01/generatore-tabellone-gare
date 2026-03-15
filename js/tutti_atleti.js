/* tutti_atleti.js – Admin view con filtri:
   - Età: 0–17 / 18+
   - Peso: categorie predefinite (mappate in min/max)
   - Totale corrente = somma 'pagato'
   - Filtro Pagato in client-side: 1 => pagato > 0, 0 => pagato == 0
*/
(function () {
  'use strict';

  var API = 'https://generatore-tabellone-gare.infinityfree.me/atleti.php';

  // gating admin lato client (opzionale, server resta autorevole)
  var isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  if (!isAdmin) {
    alert('Accesso riservato agli admin');
    location.href = 'menu.html';
    return;
  }

  // DOM
  var form   = document.getElementById('filterForm');
  var q      = document.getElementById('q');
  var fSesso = document.getElementById('f_sesso');
  var fEtaG  = document.getElementById('f_eta_group'); // nuovo
  var fPesoC = document.getElementById('f_peso_cat');  // nuovo
  var fCint  = document.getElementById('f_cintura');
  var fComp  = document.getElementById('f_comp');
  var fPales = document.getElementById('f_palestra');
  var fPaga  = document.getElementById('f_pagato');    // 1 -> >0, 0 -> ==0 (client-side)

  var head   = document.getElementById('headAll');
  var list   = document.getElementById('listAll');
  var msgBox = document.querySelector('#msg .field');
  var totEl  = document.getElementById('totaleVal');

  var btnCsv = document.getElementById('btnCsv');
  var btnPrn = document.getElementById('btnPrint');

  // Mappa categorie peso → {min,max} (in kg). Editale per allinearle al tabellone.
  var WEIGHT_CATEGORIES = {
    '':      { min: null, max: null }, // tutte
    'le40':  { min: null, max: 40 },
    '41-50': { min: 41,   max: 50 },
    '51-60': { min: 51,   max: 60 },
    '61-70': { min: 61,   max: 70 },
    '71-80': { min: 71,   max: 80 },
    '81-90': { min: 81,   max: 90 },
    'ge90':  { min: 90,   max: null }
  };

  function euro(n) {
    n = Number(n || 0);
    return '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function paidClass(v) { return Number(v) > 0 ? 'badge-paid' : 'badge-unpaid'; }
  function setMsg(t){ if (msgBox) msgBox.textContent = t || ''; }

  function buildQueryParams() {
    var p = new URLSearchParams();

    var s = (q && q.value.trim()) || '';
    if (s) p.set('q', s);

    if (fSesso && fSesso.value)   p.set('sesso', fSesso.value);
    if (fCint  && fCint.value)    p.set('cintura', fCint.value);
    if (fComp  && fComp.value)    p.set('competizione', fComp.value);
    if (fPales && fPales.value)   p.set('gym', fPales.value.trim());
    // ⚠️ niente parametro 'pagato' al backend: filtriamo in client-side

    // Età group → eta_min/eta_max
    if (fEtaG && fEtaG.value) {
      if (fEtaG.value === 'u18') {
        p.set('eta_min', '0'); p.set('eta_max', '17');
      } else if (fEtaG.value === '18plus') {
        p.set('eta_min', '18');
      }
    }

    // Peso categoria → peso_min/peso_max
    if (fPesoC && fPesoC.value) {
      var cat = WEIGHT_CATEGORIES[fPesoC.value] || {};
      if (cat.min != null) p.set('peso_min', String(cat.min));
      if (cat.max != null) p.set('peso_max', String(cat.max));
    }

    return p.toString() ? ('?' + p.toString()) : '';
  }

  function rowTemplate(a) {
    return '' +
      '<div class="row" style="justify-content:center; gap:0px;">' +
        '<div class="field" style="width:10%;">' + (a.nome || '') + '</div>' +
        '<div class="field" style="width:10%;">' + (a.cognome || '') + '</div>' +
        '<div class="field" style="width:5%;">' + (a.sesso || '') + '</div>' +
        '<div class="field" style="width:5%;">' + (a.eta != null ? a.eta : '') + '</div>' +
        '<div class="field" style="width:10%;">' + (a.peso != null ? a.peso : '') + '</div>' +
        '<div class="field" style="width:10%;">' + (a.cintura || '') + '</div>' +
        '<div class="field" style="width:20%;">' + (a.competizione || '') + '</div>' +
        '<div class="field" style="width:20%;">' + (a.palestra || '') + '</div>' +
        '<div class="field" style="width:10%;">' +
          '<span class="' + paidClass(a.pagato) + '">' + euro(a.pagato || 0) + '</span>' +
        '</div>' +
      '</div>';
  }

  function render(rows) {
    list.innerHTML = '';
    if (!rows || !rows.length) {
      if (head) head.style.display = 'none';
      setMsg('Nessun atleta trovato');
      totEl.textContent = '€ 0,00';
      return;
    }
    if (head) head.style.display = 'flex';
    setMsg('');

    // Totale = somma dei 'pagato' delle righe visualizzate
    var totPaid = 0;
    rows.forEach(function (a) {
      totPaid += Number(a.pagato || 0);
      var row = document.createElement('div');
      row.className = 'row-list col-10';
      row.innerHTML = rowTemplate(a);
      list.appendChild(row);
    });
    totEl.textContent = euro(totPaid);
  }

  function parseResp(r){ return r.json().then(function(j){ return {ok:r.ok, status:r.status, data:j}; }); }
  function handleHttp(res){
    if (res.status === 401) { location.href = 'index.html'; return false; }
    if (!res.ok) { setMsg((res.data && (res.data.error||res.data.message)) || 'Errore'); return false; }
    return true;
  }

  function applyClientPaidFilter(rows) {
    if (!fPaga || fPaga.value === '') return rows;
    var wantPaid = (fPaga.value === '1');
    return rows.filter(function(a){
      var p = Number(a.pagato || 0);
      return wantPaid ? (p > 0) : (p === 0);
    });
  }

  function fetchData() {
    setMsg('');
    list.innerHTML = '<div class="field" style="width:100%; text-align:center;">Caricamento…</div>';

    var url = API + buildQueryParams();
    fetch(url, { method:'GET', credentials:'include' })
      .then(parseResp)
      .then(function(res){
        if (!handleHttp(res)) return;
        var rows = Array.isArray(res.data) ? res.data : [];
        // filtro pagato client-side (1 => >0, 0 => ==0)
        rows = applyClientPaidFilter(rows);
        window.__lastRows = rows; // per CSV
        render(rows);
      })
      .catch(function(err){
        setMsg(err && err.message ? err.message : 'Errore');
        list.innerHTML='';
      });
  }

  // CSV / Print
  function toCsv(rows){
    var headers = ['Nome','Cognome','Sesso','Età','Peso','Cintura','Competizione','Palestra','Pagato'];
    var lines = [headers.join(';')];
    (rows||[]).forEach(function(a){
      var r = [
        a.nome||'', a.cognome||'', a.sesso||'',
        a.eta!=null?a.eta:'', a.peso!=null?a.peso:'', a.cintura||'',
        a.competizione||'', a.palestra||'',
        a.pagato!=null?String(a.pagato):'0'
      ].map(function(v){ v=(v==null)?'':String(v); v=v.replace(/"/g,'""'); return '"'+v+'"'; });
      lines.push(r.join(';'));
    });
    return '\ufeff'+lines.join('\n');
  }
  function downloadCsv(data){
    var csv = toCsv(data||[]);
    var blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'tutti_gli_atleti.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  if (btnCsv) btnCsv.addEventListener('click', function(){ downloadCsv(window.__lastRows||[]); });
  if (btnPrn) btnPrn.addEventListener('click', function(){ window.print(); });

  // Submit filtri
  if (form) {
    form.addEventListener('submit', function(e){ e.preventDefault(); fetchData(); });
  }
  if (q) q.addEventListener('keydown', function(e){ if (e.key==='Enter'){ e.preventDefault(); fetchData(); } });

  // Prima render
  fetchData();

})();
