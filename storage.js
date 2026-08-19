
/* =========================================================
   STORAGE CONDIVISO
   Planner Strutture + Planner Pedane
========================================================= */

const STORAGE_KEY =
  "plannerTecnicoSharedStorage_v1";


/* =========================================================
   INVENTARIO COMPLETO
========================================================= */

export const SHARED_ITEMS = [


  /* =========================
     STRUTTURE
  ========================= */

  {
    group:"Strutture",
    key:"high3",
    label:"Traversa alta 3 m"
  },

  {
    group:"Strutture",
    key:"low3",
    label:"Traversa bassa 3 m"
  },

  {
    group:"Strutture",
    key:"high4",
    label:"Traversa alta 4 m"
  },

  {
    group:"Strutture",
    key:"low4",
    label:"Traversa bassa 4 m"
  },

  {
    group:"Strutture",
    key:"tel1",
    label:"Telescopica 1 m"
  },

  {
    group:"Strutture",
    key:"tel15",
    label:"Telescopica 1,5 m"
  },

  {
    group:"Strutture",
    key:"tel3",
    label:"Telescopica 3 → 5,5 m"
  },

  {
    group:"Strutture",
    key:"tel4",
    label:"Telescopica 4 → 7,5 m"
  },

  {
    group:"Strutture",
    key:"arch",
    label:"Arco"
  },

  {
    group:"Strutture",
    key:"pole",
    label:"Palo 2,5 m"
  },

  {
    group:"Strutture",
    key:"base",
    label:"Base palo"
  },

  {
    group:"Strutture",
    key:"fairy100",
    label:"Cesta fairy 100 m"
  },

  {
    group:"Strutture",
    key:"fairy200",
    label:"Cesta fairy 200 m"
  },


  /* =========================
     PEDANE
  ========================= */

  {
    group:"Pedane",
    key:"deckBlack",
    label:"Quadrotto nero 1 × 1 m"
  },

  {
    group:"Pedane",
    key:"deckWhite",
    label:"Quadrotto bianco 1 × 1 m"
  },

  {
    group:"Pedane",
    key:"deckWood",
    label:"Quadrotto legno 1 × 1 m"
  },

  {
    group:"Pedane",
    key:"yellowNormal4",
    label:"Pannello giallo normale 4 m"
  },

  {
    group:"Pedane",
    key:"yellowNormal2",
    label:"Pannello giallo normale 2 m"
  },

  {
    group:"Pedane",
    key:"yellowNormal1",
    label:"Pannello giallo normale 1 m"
  },

  {
    group:"Pedane",
    key:"yellowSide4",
    label:"Pannello giallo laterale 4 m"
  },

  {
    group:"Pedane",
    key:"yellowSide2",
    label:"Pannello giallo laterale 2 m"
  },

  {
    group:"Pedane",
    key:"yellowSide1",
    label:"Pannello giallo laterale 1 m"
  }

];



/* =========================================================
   CREA MAGAZZINO VUOTO
========================================================= */

function blankStock(){

  const result = {};


  SHARED_ITEMS.forEach(item=>{

    result[item.key] = 0;

  });


  return result;

}



/* =========================================================
   NORMALIZZA QUANTITÀ
========================================================= */

function normalizeStock(
  source = {}
){

  const result =
    blankStock();


  SHARED_ITEMS.forEach(item=>{

    result[item.key] =

      Math.max(

        0,

        Math.floor(

          Number(
            source[item.key]
          )

          ||

          0

        )

      );

  });


  return result;

}



/* =========================================================
   COPIA SICURA
========================================================= */

function cloneState(
  state
){

  return JSON.parse(
    JSON.stringify(state)
  );

}



/* =========================================================
   STATO INIZIALE
========================================================= */

function defaultState(){

  return {

    version:1,

    configured:false,

    warehouse:
      blankStock(),

    remaining:
      blankStock(),

    allocations:[]

  };

}



/* =========================================================
   MIGRAZIONE VECCHIO MAGAZZINO

   Prova a recuperare eventuali quantità
   già salvate nelle versioni precedenti.
========================================================= */

function migrateOldStorage(){

  const state =
    defaultState();


  let foundSomething =
    false;



  /* =======================================================
     VECCHIO PLANNER STRUTTURE
  ======================================================= */

  try{

    const oldFairy =
      localStorage.getItem(
        "fairyWarehouse"
      );


    if(oldFairy){

      const data =
        JSON.parse(
          oldFairy
        );


      Object.entries(data)
      .forEach(
        ([key,value])=>{

          if(
            key in
            state.warehouse
          ){

            const quantity =

              Math.max(

                0,

                Math.floor(
                  Number(value) || 0
                )

              );


            state.warehouse[key] =
              quantity;


            state.remaining[key] =
              quantity;


            foundSomething =
              true;

          }

        }
      );

    }

  }

  catch(error){

    console.warn(
      "Migrazione vecchio magazzino strutture non riuscita.",
      error
    );

  }



  /* =======================================================
     VECCHIO PLANNER PEDANE
  ======================================================= */

  try{

    const oldDeck =
      localStorage.getItem(
        "pedanePlannerState_v1"
      );


    if(oldDeck){

      const data =
        JSON.parse(
          oldDeck
        );


      if(data.warehouse){

        Object.entries(
          data.warehouse
        )
        .forEach(
          ([key,value])=>{

            if(
              key in
              state.warehouse
            ){

              const quantity =

                Math.max(

                  0,

                  Math.floor(
                    Number(value) || 0
                  )

                );


              state.warehouse[key] =
                quantity;


              /*
                Se non esiste un residuo
                specifico useremo lo stock iniziale.
              */

              state.remaining[key] =
                quantity;


              foundSomething =
                true;

            }

          }
        );

      }



      if(data.remaining){

        Object.entries(
          data.remaining
        )
        .forEach(
          ([key,value])=>{

            if(
              key in
              state.remaining
            ){

              state.remaining[key] =

                Math.max(

                  0,

                  Math.floor(
                    Number(value) || 0
                  )

                );

            }

          }
        );

      }



      if(
        Array.isArray(
          data.allocations
        )
      ){

        data.allocations
        .forEach(allocation=>{

          state.allocations.push({

            ...allocation,

            source:
              allocation.source
              ||
              "pedane"

          });

        });

      }


      foundSomething =
        true;

    }

  }

  catch(error){

    console.warn(
      "Migrazione vecchio magazzino pedane non riuscita.",
      error
    );

  }



  if(foundSomething){

    state.configured =
      true;

  }


  return state;

}



/* =========================================================
   LEGGI STATO CONDIVISO
========================================================= */

export function getSharedState(){

  const saved =
    localStorage.getItem(
      STORAGE_KEY
    );


  if(saved){

    try{

      const parsed =
        JSON.parse(
          saved
        );


      const state = {

        version:1,

        configured:
          Boolean(
            parsed.configured
          ),

        warehouse:
          normalizeStock(
            parsed.warehouse
          ),

        remaining:
          normalizeStock(
            parsed.remaining
          ),

        allocations:

          Array.isArray(
            parsed.allocations
          )

          ?

          parsed.allocations

          :

          []

      };


      return cloneState(
        state
      );

    }

    catch(error){

      console.warn(
        "Magazzino condiviso non leggibile.",
        error
      );

    }

  }



  /*
    Se è la prima volta che usiamo
    storage.js tenta di recuperare
    i vecchi dati.
  */

  const migrated =
    migrateOldStorage();


  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(
      migrated
    )

  );


  return cloneState(
    migrated
  );

}



/* =========================================================
   SALVA STATO
========================================================= */

function saveState(
  state
){

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(
      state
    )

  );


  return cloneState(
    state
  );

}



/* =========================================================
   NUOVA GIORNATA / IMPOSTA MAGAZZINO

   Il pulsante:
   "Salva / nuova giornata"

   fa questo:
   - salva quantità iniziali
   - residuo = quantità iniziali
   - cancella i carichi precedenti
========================================================= */

export function startSharedDay(
  stock
){

  const normalized =
    normalizeStock(
      stock
    );


  const state = {

    version:1,

    configured:true,

    warehouse:{
      ...normalized
    },

    remaining:{
      ...normalized
    },

    allocations:[]

  };


  return saveState(
    state
  );

}



/* =========================================================
   CALCOLA MANCANZE
========================================================= */

export function getSharedDeficits(
  requirements
){

  const state =
    getSharedState();


  if(
    !state.configured
  ){

    return [];

  }


  const deficits = [];


  Object.entries(
    requirements
  )
  .forEach(
    ([key,needed])=>{


      needed =
        Number(needed)
        ||
        0;


      if(
        needed<=0
      ){

        return;

      }


      const available =

        state.remaining[key]

        ??

        0;


      if(
        needed >
        available
      ){

        deficits.push({

          key,

          needed,

          available,

          missing:
            needed-
            available

        });

      }

    }
  );


  return deficits;

}



/* =========================================================
   CONFERMA CARICO

   Pedane e Strutture scaricheranno
   dallo STESSO residuo.
========================================================= */

export function commitSharedLoad({

  source,

  name,

  length,

  width,

  requirements,

  signature = ""

}){

  const state =
    getSharedState();


  if(
    !state.configured
  ){

    return {

      ok:false,

      reason:"not-configured",

      state

    };

  }



  const deficits =
    [];


  Object.entries(
    requirements
  )
  .forEach(
    ([key,needed])=>{


      needed =
        Number(needed)
        ||
        0;


      if(
        needed<=0
      ){

        return;

      }


      const available =

        state.remaining[key]

        ??

        0;


      if(
        needed >
        available
      ){

        deficits.push({

          key,

          needed,

          available,

          missing:
            needed-
            available

        });

      }

    }
  );



  if(
    deficits.length
  ){

    return {

      ok:false,

      reason:"insufficient",

      deficits,

      state

    };

  }



  /*
    Evita di confermare due volte
    esattamente lo stesso progetto.
  */

  if(
    signature

    &&

    state.allocations.some(
      allocation=>

        allocation.source ===
        source

        &&

        allocation.signature ===
        signature

    )
  ){

    return {

      ok:false,

      reason:"duplicate",

      state

    };

  }



  /*
    SCARICA IL MATERIALE
  */

  Object.entries(
    requirements
  )
  .forEach(
    ([key,quantity])=>{


      quantity =
        Number(quantity)
        ||
        0;


      if(
        quantity<=0
      ){

        return;

      }


      if(
        !(key in state.remaining)
      ){

        state.remaining[key] =
          0;

      }


      state.remaining[key] -=
        quantity;

    }
  );



  /*
    SALVA IL CARICO
  */

  state.allocations.push({

    id:
      `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2,8)}`,

    source,

    name,

    length,

    width,

    requirements:{
      ...requirements
    },

    signature,

    confirmedAt:
      new Date()
        .toISOString()

  });



  const saved =
    saveState(
      state
    );


  return {

    ok:true,

    state:saved

  };

}
