/* tabellone.js – generazione bracket gara */

document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById('filterForm');
  const msg  = document.getElementById('msg');

  const selComp  = document.getElementById('competizione');
  const selSesso = document.getElementById('sesso');
  const selEta   = document.getElementById('eta_range');
  const selPeso  = document.getElementById('pesoPreset');

  const inpMin = document.getElementById('peso_min');
  const inpMax = document.getElementById('peso_max');

  const bracket = document.getElementById('bracket');
  const toolbar = document.getElementById('bracketToolbar');
  const btnPrint = document.getElementById('btnPrintBracket');


  /* ===============================
     COMPETIZIONI SENZA PESO
  =============================== */

  const NON_WEIGHT = {
    "Kata":1,
    "Kata Kobudo":1
  };


  /* ===============================
     CATEGORIE PESO
  =============================== */

  const WEIGHT_CLASSES = {

    "Kick-Jitsu": {
      "M":[
        {label:"≤30",min:0,max:30},
        {label:"31-40",min:31,max:40},
        {label:"41-50",min:41,max:50},
        {label:"51-60",min:51,max:60},
        {label:"61-70",min:61,max:70},
        {label:"71-80",min:71,max:80},
        {label:"81-90",min:81,max:90},
        {label:"≥91",min:91,max:999}
      ],
      "F":[
        {label:"≤30",min:0,max:30},
        {label:"31-40",min:31,max:40},
        {label:"41-50",min:41,max:50},
        {label:"51-60",min:51,max:60},
        {label:"61-70",min:61,max:70},
        {label:"≥71",min:71,max:999}
      ]
    },

    "Lotta a Terra":{
      "M":[
        {label:"≤35",min:0,max:35},
        {label:"36-45",min:36,max:45},
        {label:"46-55",min:46,max:55},
        {label:"56-65",min:56,max:65},
        {label:"66-75",min:66,max:75},
        {label:"≥76",min:76,max:999}
      ],
      "F":[
        {label:"≤35",min:0,max:35},
        {label:"36-45",min:36,max:45},
        {label:"46-55",min:46,max:55},
        {label:"56-65",min:56,max:65},
        {label:"≥66",min:66,max:999}
      ]
    },

    "Submission":{
      "M":[
        {label:"≤60",min:0,max:60},
        {label:"61-70",min:61,max:70},
        {label:"71-80",min:71,max:80},
        {label:"81-90",min:81,max:90},
        {label:"≥91",min:91,max:999}
      ],
      "F":[
        {label:"≤50",min:0,max:50},
        {label:"51-60",min:51,max:60},
        {label:"61-70",min:61,max:70},
        {label:"≥71",min:71,max:999}
      ]
    }

  };


  /* ===============================
     POPOLA SELECT PESO
  =============================== */

  function populatePeso(){

    selPeso.innerHTML = `<option value="">Categoria peso</option>`;

    const comp = selComp.value;
    const sesso = selSesso.value;

    if(!comp || !sesso) return;

    const list = WEIGHT_CLASSES[comp]?.[sesso] || [];

    list.forEach((c,i)=>{

      const o = document.createElement("option");
      o.value = i;
      o.textContent = c.label;

      selPeso.appendChild(o);

    });

  }

  selComp.addEventListener("change",populatePeso);
  selSesso.addEventListener("change",populatePeso);


  selPeso.addEventListener("change",()=>{

    const comp = selComp.value;
    const sesso = selSesso.value;

    const list = WEIGHT_CLASSES[comp]?.[sesso] || [];

    const idx = selPeso.value;

    if(list[idx]){

      inpMin.value = list[idx].min;
      inpMax.value = list[idx].max;

    }

  });


  /* ===============================
     BRACKET HELPERS
  =============================== */

  function nextPow2(n){

    let p=1;

    while(p<n) p*=2;

    return p;

  }

  function rounds(n){

    let r=0;

    while(n>1){
      n/=2;
      r++;
    }

    return r;

  }


  /* ===============================
     COSTRUZIONE TABELLONE
  =============================== */

  function buildBracket(players){

    bracket.innerHTML="";

    const n = players.length;

    const size = nextPow2(n);

    const r = rounds(size);

    bracket.style.setProperty("--rounds",r);

    for(let round=0; round<r; round++){

      const col = document.createElement("div");
      col.className="round";

      const title = document.createElement("div");
      title.className="round-title";

      if(round===0) title.textContent="Turno iniziale";
      else if(round===r-1) title.textContent="Finale";
      else title.textContent="Round "+(round+1);

      col.appendChild(title);


      const matches = size / Math.pow(2,round+1);

      for(let m=0; m<matches; m++){

        const match = document.createElement("div");
        match.className="match";

        const seed1 = document.createElement("div");
        seed1.className="seed";

        const seed2 = document.createElement("div");
        seed2.className="seed";

        if(round===0){

          const a = players[m*2];
          const b = players[m*2+1];

          seed1.textContent = a ? a.nome+" "+a.cognome : "— bye —";
          seed2.textContent = b ? b.nome+" "+b.cognome : "— bye —";

        }

        match.appendChild(seed1);
        match.appendChild(seed2);

        col.appendChild(match);

      }

      bracket.appendChild(col);

    }

    bracket.style.display="grid";
    toolbar.style.display="flex";

  }


  /* ===============================
     GENERA TABELLONE
  =============================== */

  form.addEventListener("submit",function(e){

    e.preventDefault();

    msg.textContent="";
    bracket.innerHTML="";

    const comp = selComp.value;

    if(!NON_WEIGHT[comp] && !selPeso.value){

      msg.textContent="Seleziona categoria peso";

      return;

    }

    const fd = new FormData(form);

    fetch("https://generatore-tabellone-gare.infinityfree.me/atleti_match.php",{

      method:"POST",
      body:fd

    })

    .then(r=>r.json())
    .then(data=>{

      if(data.error) throw new Error(data.error);

      if(!data.length){

        msg.textContent="Nessun atleta trovato";

        return;

      }

      buildBracket(data);

    })

    .catch(err=>{

      msg.textContent = err.message;

    });

  });


  /* ===============================
     STAMPA
  =============================== */

  btnPrint.addEventListener("click",()=>{

    if(!bracket.querySelector(".match")){

      alert("Genera prima il tabellone");

      return;

    }

    window.print();

  });

});
