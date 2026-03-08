/* iscrivi.js – singolo atleta + modalità "Dimostrazione" con 2–4 atleti.
   Legge sempre "palestra" da input #palestra se presente, altrimenti da sessionStorage. */
(function(){
  'use strict';

  var API = 'https://jujitsugroup.it/gestione_gare/inserisci_atleta.php';

  var form   = document.getElementById('athForm');
  var msg    = document.getElementById('msg');

  var nome   = document.getElementById('nome');
  var cogn   = document.getElementById('cognome');
  var sesso  = document.getElementById('sesso');
  var eta    = document.getElementById('eta');
  var peso   = document.getElementById('peso');
  var cintura= document.getElementById('cintura');
  var comp   = document.getElementById('competizione');
  var gym    = document.getElementById('palestra'); // potrebbe NON esserci nell'HTML
  var pesoHint = document.getElementById('pesoHint'); // opzionale

  // competizioni dove il peso non è obbligatorio
  var NON_PESATE = { 'Dimostrazione':1, 'Kata':1, 'Kata Kobudo':1 };

  // ===== helper palestra: input -> sessionStorage
  function getPalestraValue() {
    var v = '';
    if (gym && gym.value) v = gym.value.trim();
    if (!v) {
      try { v = (sessionStorage.getItem('palestra') || '').trim(); } catch(_) {}
    }
    return v;
  }
  (function prefillGym(){
    var v = getPalestraValue();
    if (gym && !gym.value && v) gym.value = v;
  })();

  // ---- utilità UI
  function showMsg(text, ok){
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'hint ' + (ok ? 'ok' : 'err');
  }
  function clearMsg(){ if (msg){ msg.textContent=''; msg.className='hint'; } }
  function isDemo(){ return (comp && (comp.value||'').toLowerCase() === 'dimostrazione'); }

  // ---- peso obbligatorio o no (solo per modalità singola)
  function setPesoRequirement(){
    if (!peso) return;
    var c = comp && comp.value;
    if (NON_PESATE[c]) {
      peso.removeAttribute('required');
      if (pesoHint) pesoHint.textContent = 'Per ' + c + ' il peso non è necessario.';
    } else {
      peso.setAttribute('required','required');
      if (pesoHint) pesoHint.textContent = 'Obbligatorio per Kick-Jitsu, Lotta a Terra, Submission.';
    }
  }

  // ===================== MODALITÀ DIMOSTRAZIONE =====================
  var MIN = 2, MAX = 4;

  // Creo container e bottone (inseriti dinamicamente dopo la riga del select competizione)
  var demoGroup = document.createElement('div');
  demoGroup.id = 'demoGroup';
  demoGroup.style.display = 'none';
  demoGroup.style.flexBasis = '100%';
  demoGroup.style.marginTop = '12px';

  var athletesContainer = document.createElement('div');
  athletesContainer.id = 'athletesContainer';
  demoGroup.appendChild(athletesContainer);

  var btnWrap = document.createElement('div');
  btnWrap.className = 'field';
  btnWrap.style.textAlign = 'center';
  btnWrap.style.marginTop = '8px';
  btnWrap.style.flexBasis = '100%';

  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.id = 'addAthleteBtn';
  addBtn.textContent = '➕ Aggiungi atleta';
  btnWrap.appendChild(addBtn);

  var hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Min 2, max 4 atleti.';
  btnWrap.appendChild(hint);

  demoGroup.appendChild(btnWrap);

  (function insertDemoGroup(){
    var compRow = comp ? comp.closest('.row') : null;
    if (compRow && compRow.parentNode) {
      compRow.parentNode.insertBefore(demoGroup, compRow.nextSibling);
    } else {
      form.appendChild(demoGroup);
    }
  })();

  // nascondi/mostra e disattiva/riattiva i campi singoli
  function enableSingleFields(enable){
    var list = [nome, cogn, sesso, eta, peso, cintura];
    list.forEach(function(el){
      if (!el) return;
      if (enable) { if (el.dataset.wasRequired === '1') el.required = true; }
      else { el.dataset.wasRequired = el.required ? '1' : '0'; el.required = false; }
      if (enable) { if (el.dataset.origName) el.name = el.dataset.origName; }
      else { if (!el.dataset.origName) el.dataset.origName = el.name; el.name = ''; }
      el.disabled = !enable;
      var wrapper = el.closest('.field') || el;
      wrapper.style.display = enable ? '' : 'none';
    });
    // Mantieni sempre visibile il select competizione
    if (comp) {
      var w = comp.closest('.field') || comp;
      w.style.display = '';
    }
  }

  function createAthleteCard(index){
    var wrap = document.createElement('div');
    wrap.className = 'card athlete';
    wrap.style.border = '1px solid #e5e7eb';
    wrap.style.borderRadius = '8px';
    wrap.style.padding = '8px';
    wrap.style.marginBottom = '8px';
    wrap.dataset.index = String(index);

    wrap.innerHTML =
      '<div class="row col-4" style="margin:0;">'
        + '<div class="field"><input type="text" name="athletes['+index+'][nome]" placeholder="Nome" required></div>'
        + '<div class="field"><input type="text" name="athletes['+index+'][cognome]" placeholder="Cognome" required></div>'
        + '<div class="field">'
          + '<select name="athletes['+index+'][sesso]" required>'
            + '<option value="" disabled selected>Sesso</option>'
            + '<option value="M">Maschile</option>'
            + '<option value="F">Femminile</option>'
          + '</select>'
        + '</div>'
        + '<div class="field"><input type="number" name="athletes['+index+'][eta]" placeholder="Età" min="3" max="99" required></div>'
      + '</div>'
      + '<div class="row col-3" style="margin-top:10px;">'
        + '<div class="field"><input type="number" name="athletes['+index+'][peso]" placeholder="Peso (kg)" step="0.1"></div>'
        + '<div class="field">'
          + '<select name="athletes['+index+'][cintura]" required>'
            + '<option value="" disabled selected>Cintura</option>'
            + '<option>Bianca</option><option>Gialla</option><option>Arancione</option>'
            + '<option>Verde</option><option>Blu</option><option>Viola</option>'
            + '<option>Marrone</option><option>Nera</option>'
          + '</select>'
        + '</div>'
        + '<div class="field" style="display:flex; align-items:center;">'
          + '<button type="button" class="removeAthleteBtn" style="width:auto; padding:10px;" title="Rimuovi">🗑️</button>'
        + '</div>'
      + '</div>';

    var rem = wrap.querySelector('.removeAthleteBtn');
    rem.addEventListener('click', function(){ removeAthlete(wrap); });
    return wrap;
  }

  function renumberAthletes(){
    var cards = [].slice.call(athletesContainer.querySelectorAll('.card.athlete'));
    cards.forEach(function(card, i){
      card.dataset.index = String(i);
      card.querySelectorAll('input,select,textarea').forEach(function(el){
        el.name = el.name.replace(/athletes\[\d+\]/, 'athletes['+i+']');
      });
    });
    var canRemove = cards.length > MIN;
    cards.forEach(function(c){
      var btn = c.querySelector('.removeAthleteBtn');
      if (btn) btn.disabled = !canRemove;
    });
    addBtn.disabled = cards.length >= MAX;
  }

  function addAthlete(){
    var count = athletesContainer.querySelectorAll('.card.athlete').length;
    if (count >= MAX) return;
    athletesContainer.appendChild(createAthleteCard(count));
    renumberAthletes();
  }

  function removeAthlete(card){
    var count = athletesContainer.querySelectorAll('.card.athlete').length;
    if (count <= MIN) return;
    card.remove();
    renumberAthletes();
  }

  addBtn.addEventListener('click', addAthlete);

  function enterDemo(){
    enableSingleFields(false);
    demoGroup.style.display = '';
    if (athletesContainer.querySelectorAll('.card.athlete').length === 0) {
      addAthlete(); addAthlete();
    }
    clearMsg();
  }
  function exitDemo(){
    enableSingleFields(true);
    demoGroup.style.display = 'none';
    athletesContainer.innerHTML = '';
    addBtn.disabled = false;
    clearMsg();
  }

  // toggle quando cambia la competizione
  if (comp) {
    comp.addEventListener('change', function(){
      isDemo() ? enterDemo() : exitDemo();
      setPesoRequirement();
    });
  }

  // stato iniziale
  setPesoRequirement();
  if (isDemo()) enterDemo();

  // ===================== SUBMIT =====================
  form.addEventListener('submit', function(e){
    e.preventDefault();
    clearMsg();

    var palestraVal = getPalestraValue();
    if (!palestraVal) { showMsg('Palestra mancante: rifai login o riprova.', false); return; }

    // ---- MODALITÀ DIMOSTRAZIONE
    if (isDemo()) {
      var cards = [].slice.call(athletesContainer.querySelectorAll('.card.athlete'));
      var count = cards.length;
      if (count < MIN || count > MAX) {
        showMsg('Per la Dimostrazione servono minimo '+MIN+' e massimo '+MAX+' atleti.', false);
        return;
      }
      // validazione base su ciascuna scheda
      for (var i=0;i<count;i++){
        var requiredInputs = cards[i].querySelectorAll('input[required],select[required]');
        for (var j=0;j<requiredInputs.length;j++){
          var el = requiredInputs[j];
          if (!el.value || (el.tagName==='SELECT' && el.value==='')) {
            el.focus();
            showMsg('Compila tutti i campi obbligatori per ogni atleta.', false);
            return;
          }
        }
      }

      var fd = new FormData();
      fd.append('competizione', comp.value);
      fd.append('palestra', palestraVal);
      fd.append('mode', 'demo'); // opzionale

      // raccogli ogni atleta
      cards.forEach(function(card){
        var fields = card.querySelectorAll('input,select');
        fields.forEach(function(el){
          var name = el.name; // es: athletes[0][nome]
          var val  = (el.value || '').trim();
          if (/\[peso\]/.test(name) && !val) return; // peso opzionale
          fd.append(name, val);
        });
      });
console.log('palestraVal =', palestraVal);
for (const [k, v] of (fd || fd1).entries()) {
  console.log('POST', k, v);
}

      fetch(API, { method: 'POST', body: fd, cache: 'no-store' })
        .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, data:j };}); })
        .then(function(res){
          if (!res.ok || (res.data && res.data.error)) {
            throw new Error((res.data && res.data.error) || 'Errore iscrizione');
          }
          if (!res.data || !res.data.inseriti || res.data.inseriti < 1) {
            throw new Error('Nessun atleta inserito');
          }
          showMsg('Squadra iscritta con successo.', true);
          form.reset();
          athletesContainer.innerHTML = '';
          (function(){
            try { var v = (sessionStorage.getItem('palestra')||'').trim(); if (gym && v) gym.value = v; } catch(_){}
          })();
          exitDemo();
          setPesoRequirement();
        })
        .catch(function(err){
          showMsg(err.message || 'Errore di rete', false);
        });

      return; // fine submit demo
    }

    // ---- MODALITÀ SINGOLA
    if (!nome.value.trim() || !cogn.value.trim() || !sesso.value || !eta.value || !cintura.value || !comp.value){
      showMsg('Compila tutti i campi obbligatori.', false);
      return;
    }
    if (!NON_PESATE[comp.value] && (!peso || !peso.value)) {
      showMsg('Inserisci il peso per la competizione selezionata.', false);
      return;
    }

    var fd1 = new FormData();
    fd1.append('nome', nome.value.trim());
    fd1.append('cognome', cogn.value.trim());
    fd1.append('sesso', sesso.value);
    fd1.append('eta', eta.value);
    if (peso && peso.value) fd1.append('peso', peso.value);
    else if (!NON_PESATE[comp.value]) fd1.append('peso', '0');
    fd1.append('cintura', cintura.value);
    fd1.append('competizione', comp.value);
    fd1.append('palestra', palestraVal);
console.log('palestraVal =', palestraVal);
for (const [k, v] of (fd || fd1).entries()) {
  console.log('POST', k, v);
}

    fetch(API, { method: 'POST', body: fd1, cache: 'no-store' })
      .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, data:j };}); })
      .then(function(res){
        if (!res.ok || (res.data && res.data.error)) {
          throw new Error((res.data && res.data.error) || 'Errore iscrizione');
        }
        if (!res.data || !res.data.inseriti || res.data.inseriti < 1) {
          throw new Error('Inserimento non effettuato');
        }
        showMsg('Atleta iscritto con successo.', true);
        form.reset();
        (function(){
          try { var v = (sessionStorage.getItem('palestra')||'').trim(); if (gym && v) gym.value = v; } catch(_){}
        })();
        setPesoRequirement();
      })
      .catch(function(err){
        showMsg(err.message || 'Errore di rete', false);
      });
  });
})();
