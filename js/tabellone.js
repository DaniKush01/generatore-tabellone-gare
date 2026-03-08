/* tabellone.js – categorie peso + BRACKET multi-round + stampa con riepilogo filtri
   - Round 1: accoppiamenti con nomi (gestisce bye)
   - Round successivi: 2 celle vuote per match fino alla finale
   - Stampa: mostra tabellone + riepilogo filtri testuale (affidabile su carta)
*/
document.addEventListener('DOMContentLoaded', function () {
  var form      = document.getElementById('filterForm');
  var msgEl     = document.getElementById('msg');
  var selComp   = document.getElementById('competizione');
  var selSesso  = document.getElementById('sesso');
  var selEta    = document.getElementById('eta_range');
  var selPreset = document.getElementById('pesoPreset');
  var inpPMin   = document.getElementById('peso_min');
  var inpPMax   = document.getElementById('peso_max');

  // Bracket + toolbar stampa
  var bracketEl = document.getElementById('bracket');
  var printBar  = document.getElementById('bracketToolbar');
  var btnPrint  = document.getElementById('btnPrintBracket');

  // === CSS di stampa: nasconde navbar/toolbar, mostra riepilogo filtri ===
  (function injectPrintCSS(){
    if (!bracketEl) return; // la pagina deve avere #bracket
    var id = 'bracket-print-css';
    if (document.getElementById(id)) return;
    var css = `
      /* riepilogo filtri nascosto a schermo, visibile in stampa */
      #filtersSummary{ display:none; margin:12px 0; font-weight:600; }
      #filtersSummary .tag{ display:inline-block; margin-right:10px; }
      #filtersSummary .label{ opacity:.7; margin-right:4px; }

      /* stile seme */
      .seed .meta{ opacity:.7 }

      @media print{
        .navbar, .toolbar, #bracketToolbar{ display:none !important; }
        /* non stampare i pulsanti del form */
        #filterForm button{ display:none !important; }
        /* stampiamo SOLO i nomi nel tabellone (niente dettagli peso/eta) */
        .seed .meta{ display:none !important; }
        /* mostra il riepilogo filtri testuale */
        #filtersSummary{ display:block !important; }
        /* pulizia bordi contenitore */
        .wrapper{ box-shadow:none !important; border:none !important; }
      }`;
    var el = document.createElement('style');
    el.id = id; el.type = 'text/css'; el.appendChild(document.createTextNode(css));
    document.head.appendChild(el);
  })();

  // crea/recupera contenitore riepilogo filtri e lo piazza sopra il bracket
  function ensureFiltersSummary(){
    var el = document.getElementById('filtersSummary');
    if (!el){
      el = document.createElement('div');
      el.id = 'filtersSummary';
      if (bracketEl && bracketEl.parentNode) {
        bracketEl.parentNode.insertBefore(el, bracketEl);
      }
    }
    return el;
  }
  // testina compatta per ogni filtro
  function tag(label, value){
    var span = document.createElement('span');
    span.className = 'tag';
    span.innerHTML = '<span class="label">'+label+':</span><span class="val">'+(value||'—')+'</span>';
    return span;
  }
  // testo visibile del <select>
  function selectedText(sel){
    if (!sel) return '';
    var i = sel.selectedIndex;
    return (i >= 0 && sel.options[i]) ? sel.options[i].text : '';
  }
  // aggiorna riepilogo (chiamato dopo la generazione)
  function updateFiltersSummary(){
    var box = ensureFiltersSummary();
    if (!box) return;
    box.innerHTML = '';
    box.appendChild(tag('Competizione', selectedText(selComp)));
    box.appendChild(tag('Sesso',        selectedText(selSesso)));
    box.appendChild(tag('Età',          selectedText(selEta)));
    // per le non-pesate mostro “N/A”
    var comp = getVal(selComp);
    var pesoTxt = NON_WEIGHT[comp] ? 'N/A' : selectedText(selPreset) || '';
    box.appendChild(tag('Categoria peso', pesoTxt));
  }

  var NON_WEIGHT = { 'Dimostrazione':1, 'Kata':1, 'Kata Kobudo':1 };

  // categorie peso
  var WEIGHT_CLASSES = {
    'Kick-Jitsu': {
      'M': [
        { label: '≤ 30 kg',  min: 0,  max: 30 },
        { label: '31–40 kg', min: 31, max: 40 },
        { label: '41–50 kg', min: 41, max: 50 },
        { label: '51–60 kg', min: 51, max: 60 },
        { label: '61–70 kg', min: 61, max: 70 },
        { label: '71–80 kg', min: 71, max: 80 },
        { label: '81–90 kg', min: 81, max: 90 },
        { label: '≥ 91 kg',  min: 91, max: 999 }
      ],
      'F': [
        { label: '≤ 30 kg',  min: 0,  max: 30 },
        { label: '31–40 kg', min: 31, max: 40 },
        { label: '41–50 kg', min: 41, max: 50 },
        { label: '51–60 kg', min: 51, max: 60 },
        { label: '61–70 kg', min: 61, max: 70 },
        { label: '≥ 71 kg',  min: 71, max: 999 }
      ]
    },
    'Lotta a Terra': {
      'M': [
        { label: '≤ 35 kg',  min: 0,  max: 35 },
        { label: '36–45 kg', min: 36, max: 45 },
        { label: '46–55 kg', min: 46, max: 55 },
        { label: '56–65 kg', min: 56, max: 65 },
        { label: '66–75 kg', min: 66, max: 75 },
        { label: '≥ 76 kg',  min: 76, max: 999 }
      ],
      'F': [
        { label: '≤ 35 kg',  min: 0,  max: 35 },
        { label: '36–45 kg', min: 36, max: 45 },
        { label: '46–55 kg', min: 46, max: 55 },
        { label: '56–65 kg', min: 56, max: 65 },
        { label: '≥ 66 kg',  min: 66, max: 999 }
      ]
    },
    'Submission': {
      'M': [
        { label: '≤ 60 kg',  min: 0,  max: 60 },
        { label: '61–70 kg', min: 61, max: 70 },
        { label: '71–80 kg', min: 71, max: 80 },
        { label: '81–90 kg', min: 81, max: 90 },
        { label: '≥ 91 kg',  min: 91, max: 999 }
      ],
      'F': [
        { label: '≤ 50 kg',  min: 0,  max: 50 },
        { label: '51–60 kg', min: 51, max: 60 },
        { label: '61–70 kg', min: 61, max: 70 },
        { label: '≥ 71 kg',  min: 71, max: 999 }
      ]
    },
    'Dimostrazione': { 'M': [{ label:'— non applicabile —', min:0, max:999 }], 'F': [{ label:'— non applicabile —', min:0, max:999 }] },
    'Kata':          { 'M': [{ label:'— libero —',          min:0, max:999 }], 'F': [{ label:'— libero —',          min:0, max:999 }] },
    'Kata Kobudo':   { 'M': [{ label:'— libero —',          min:0, max:999 }], 'F': [{ label:'— libero —',          min:0, max:999 }] }
  };

  function getVal(sel){ return sel && typeof sel.value === 'string' ? sel.value : ''; }
  function clearPresetOptions(ph){
    while (selPreset.firstChild) selPreset.removeChild(selPreset.firstChild);
    var o=document.createElement('option'); o.value=''; o.textContent=ph||'Categoria peso'; selPreset.appendChild(o);
  }
  function populatePesoPreset(){
    var comp=getVal(selComp), sesso=getVal(selSesso);
    if(!comp||!sesso){ clearPresetOptions('Seleziona competizione e sesso'); selPreset.required=false; inpPMin.value=''; inpPMax.value=''; return; }
    clearPresetOptions('Categoria peso');
    var list=(WEIGHT_CLASSES[comp]&&WEIGHT_CLASSES[comp][sesso])?WEIGHT_CLASSES[comp][sesso]:[];
    list.forEach(function(it,i){ var o=document.createElement('option'); o.value=String(i); o.textContent=it.label; selPreset.appendChild(o); });
    if (NON_WEIGHT[comp]) { selPreset.required=false; if(list.length){ selPreset.value='0'; applyPresetToHidden(); } else { inpPMin.value='0'; inpPMax.value='999'; } }
    else { selPreset.required=true; selPreset.value=''; inpPMin.value=''; inpPMax.value=''; }
  }
  function applyPresetToHidden(){
    var comp=getVal(selComp), sesso=getVal(selSesso), idx=parseInt(getVal(selPreset),10);
    var list=(WEIGHT_CLASSES[comp]&&WEIGHT_CLASSES[comp][sesso])?WEIGHT_CLASSES[comp][sesso]:null;
    if(!list||isNaN(idx)||!list[idx]) return;
    inpPMin.value=String(list[idx].min); inpPMax.value=String(list[idx].max);
  }
  selComp&&selComp.addEventListener('change',populatePesoPreset);
  selSesso&&selSesso.addEventListener('change',populatePesoPreset);
  selPreset&&selPreset.addEventListener('change',applyPresetToHidden);
  clearPresetOptions('Seleziona competizione e sesso');

  /* ===== Bracket helpers ===== */
  function nextPow2(n){ var p=1; while(p<n) p<<=1; return p; }
  function roundsCount(n){ n=Math.max(2,n); var r=0,s=1; while(s<n){ s<<=1; r++; } return Math.max(1,r); }
  function roundLabelBySize(size){
    if (size===2)  return 'Finale';
    if (size===4)  return 'Semifinali';
    if (size===8)  return 'Quarti';
    if (size===16) return 'Ottavi';
    if (size===32) return 'Sedicesimi';
    return 'Round';
  }

  function makeSeedNode(name, meta, extraClass){
    var d=document.createElement('div');
    d.className='seed' + (extraClass?(' '+extraClass):'');
    var sName=document.createElement('span'); sName.className='name'; sName.textContent=name||'';
    d.appendChild(sName);
    if (meta){
      var sMeta=document.createElement('span'); sMeta.className='meta'; sMeta.textContent=' • '+meta;
      d.appendChild(sMeta);
    }
    return d;
  }
  function metaFromAth(a){
    var parts=[];
    if (a.peso!=null && a.peso!=='') parts.push((Number(a.peso)).toLocaleString('it-IT',{maximumFractionDigits:2})+' kg');
    return parts.join(' • ');
  }

  function buildBracketDOM(players){
    players.sort(function(a,b){ return (Number(a.peso||0)-Number(b.peso||0)) || (Number(a.eta||0)-Number(b.eta||0)); });

    var M=players.length;
    var R=roundsCount(M);
    var S=nextPow2(Math.max(2,M)); // 2,4,8,16,...

    bracketEl.style.display='';
    bracketEl.style.setProperty('--rounds', R);
    bracketEl.innerHTML='';

    for (var r=0; r<R; r++){
      var stageSize = S >> r;
      var col = document.createElement('div');
      col.className='round';

      var title=document.createElement('div');
      title.className='round-title';
      title.textContent=roundLabelBySize(stageSize);
      col.appendChild(title);

      if (r===0){
        var seeds=new Array(S).fill(null);
        for (var i=0;i<M;i++) seeds[i]=players[i];

        for (var m=0;m<S/2;m++){
          var a=seeds[2*m], b=seeds[2*m+1];
          var match=document.createElement('div'); match.className='match';

          if (a){ match.appendChild( makeSeedNode(a.nome+' '+a.cognome, metaFromAth(a)) ); }
          else  { match.appendChild( makeSeedNode('— bye —', null, 'bye') ); }

          if (b){ match.appendChild( makeSeedNode(b.nome+' '+b.cognome, metaFromAth(b)) ); }
          else  { match.appendChild( makeSeedNode('— bye —', null, 'bye') ); }

          col.appendChild(match);
        }
      } else {
        var matches = stageSize/2;
        for (var k=0;k<matches;k++){
          var mbox=document.createElement('div'); mbox.className='match';
          mbox.appendChild(makeSeedNode('', null, 'placeholder'));
          mbox.appendChild(makeSeedNode('', null, 'placeholder'));
          col.appendChild(mbox);
        }
      }

      bracketEl.appendChild(col);
    }

    if (printBar) printBar.style.display = '';
    updateFiltersSummary(); // <- aggiorna riepilogo per la stampa
  }

  /* ===== Submit ===== */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (msgEl) msgEl.textContent='';
    if (bracketEl){ bracketEl.style.display='none'; bracketEl.innerHTML=''; }
    if (printBar) printBar.style.display='none';

    var comp=getVal(selComp);
    if (!NON_WEIGHT[comp]) {
      if (!getVal(selPreset)) { if (msgEl) msgEl.textContent='Seleziona una categoria di peso.'; return; }
      applyPresetToHidden();
    } else {
      if (!inpPMin.value||!inpPMax.value){ inpPMin.value='0'; inpPMax.value='999'; }
    }

    var fd=new FormData(form);

    fetch('https://jujitsugroup.it/gestione_gare/atleti_match.php', { method:'POST', body:fd })
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, data:j}; }); })
      .then(function(res){
        if(!res.ok) throw new Error((res.data&&res.data.error)||'Errore');
        var players=[];
        if (Array.isArray(res.data)) players=res.data;
        else if (res.data && res.data.mode==='demo' && Array.isArray(res.data.groups)) {
          res.data.groups.forEach(function(g){ g.forEach(function(a){ players.push(a); }); });
        }
        if (players.length<1){ if (msgEl) msgEl.textContent='Nessun atleta trovato per i filtri selezionati.'; return; }
        buildBracketDOM(players);
      })
      .catch(function(err){ console.error(err); if (msgEl) msgEl.textContent=err.message||'Errore'; });
  });

  // Stampa tabellone (+ riepilogo filtri)
  if (btnPrint){
    btnPrint.addEventListener('click', function(){
      if (!bracketEl || bracketEl.style.display==='none' || !bracketEl.querySelector('.match')){
        alert('Genera prima il tabellone.'); return;
      }
      updateFiltersSummary();
      window.print();
    });
  }
});
