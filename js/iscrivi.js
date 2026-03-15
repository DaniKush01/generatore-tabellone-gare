/* iscrivi.js – iscrizione atleta singolo */

(function(){

'use strict';

var API = 'https://generatore-tabellone-gare.infinityfree.me/inserisci_atleta.php';

var form = document.getElementById('athForm');
var msg  = document.getElementById('msg');

var nome    = document.getElementById('nome');
var cognome = document.getElementById('cognome');
var sesso   = document.getElementById('sesso');
var eta     = document.getElementById('eta');
var peso    = document.getElementById('peso');
var cintura = document.getElementById('cintura');
var comp    = document.getElementById('competizione');
var gym     = document.getElementById('palestra');

var pesoHint = document.getElementById('pesoHint');

var NON_PESATE = { 
  'Kata':1, 
  'Kata Kobudo':1 
};

function getPalestraValue(){

  var v = '';

  if (gym && gym.value) v = gym.value.trim();

  if (!v) {
    try { v = (sessionStorage.getItem('palestra') || '').trim(); } catch(_){}
  }

  return v;

}

function showMsg(text, ok){

  if (!msg) return;

  msg.textContent = text || '';
  msg.className = 'hint ' + (ok ? 'ok' : 'err');

}

function clearMsg(){
  if (msg){
    msg.textContent='';
    msg.className='hint';
  }
}

function setPesoRequirement(){

  if (!peso) return;

  var c = comp.value;

  if (NON_PESATE[c]){

    peso.removeAttribute('required');

    if (pesoHint) pesoHint.textContent = 'Per ' + c + ' il peso non è necessario.';

  } else {

    peso.setAttribute('required','required');

    if (pesoHint) pesoHint.textContent = 'Peso obbligatorio per questa competizione.';

  }

}

if (comp){
  comp.addEventListener('change', setPesoRequirement);
}

setPesoRequirement();

form.addEventListener('submit', function(e){

  e.preventDefault();
  clearMsg();

  var palestraVal = getPalestraValue();

  if (!palestraVal){
    showMsg('Palestra mancante', false);
    return;
  }

  if (!nome.value.trim() || !cognome.value.trim() || !sesso.value || !eta.value || !cintura.value || !comp.value){
    showMsg('Compila tutti i campi obbligatori', false);
    return;
  }

  if (!NON_PESATE[comp.value] && !peso.value){
    showMsg('Inserisci il peso', false);
    return;
  }

  var fd = new FormData();

  fd.append('nome', nome.value.trim());
  fd.append('cognome', cognome.value.trim());
  fd.append('sesso', sesso.value);
  fd.append('eta', eta.value);
  fd.append('peso', peso.value || '');
  fd.append('cintura', cintura.value);
  fd.append('competizione', comp.value);
  fd.append('palestra', palestraVal);

  fetch(API, { method:'POST', body:fd })
  .then(r=>r.json())
  .then(data=>{

    if(data.error) throw new Error(data.error);

    showMsg('Atleta iscritto con successo', true);

    form.reset();
    setPesoRequirement();

  })
  .catch(err=>{
    showMsg(err.message || 'Errore', false);
  });

});

})();
