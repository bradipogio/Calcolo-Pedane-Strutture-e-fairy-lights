const fs=require("node:fs");
const path=require("node:path");

const storageSource=fs.readFileSync(
  path.join(__dirname,"..","storage.js"),
  "utf8"
);

function storageMock(){
  const values=new Map();
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key)
  };
}

async function loadModule(suffix){
  const encoded=Buffer.from(storageSource).toString("base64");
  return import("data:text/javascript;base64,"+encoded+"#"+suffix);
}

(async()=>{
  globalThis.location={
    protocol:"https:",
    href:"https://example.test/planner/pedane.html"
  };
  globalThis.localStorage=storageMock();

  let remote={configured:false,warehouse:{high3:90}};
  globalThis.fetch=async()=>({
    ok:true,
    json:async()=>remote
  });

  const storage=await loadModule(Date.now());
  let result=await storage.loadSharedWarehouseDefaults();

  if(result.available||result.loaded||storage.getSharedState().configured){
    throw new Error("Un file non configurato non deve azzerare il magazzino locale.");
  }

  remote={configured:true,warehouse:{high3:90,yellowNormal4:16}};
  result=await storage.loadSharedWarehouseDefaults();

  if(!result.available||!result.loaded){
    throw new Error("La prima lista online configurata non è stata caricata.");
  }

  let state=storage.getSharedState();
  if(state.warehouse.high3!==90||state.warehouse.yellowNormal4!==16){
    throw new Error("Quantità online non caricate correttamente.");
  }

  state.warehouse.high3=75;
  localStorage.setItem("plannerTecnicoSharedStorage_v1",JSON.stringify(state));
  result=await storage.loadSharedWarehouseDefaults();

  if(!result.available||result.loaded||storage.getSharedState().warehouse.high3!==90){
    throw new Error("La lista online deve restare l'unica fonte anche se non è cambiata.");
  }

  remote={configured:true,warehouse:{high3:100,yellowNormal4:18}};
  result=await storage.loadSharedWarehouseDefaults();
  state=storage.getSharedState();

  if(!result.available||!result.loaded||state.warehouse.high3!==100||state.warehouse.yellowNormal4!==18){
    throw new Error("Una nuova lista online deve aggiornare tutti i dispositivi.");
  }

  globalThis.fetch=async()=>{
    throw new Error("offline");
  };
  const originalWarn=console.warn;
  console.warn=()=>{};
  result=await storage.loadSharedWarehouseDefaults();
  console.warn=originalWarn;

  if(result.available){
    throw new Error("Senza GitHub il magazzino non deve risultare verificato.");
  }

  console.log("Magazzino online OK: GitHub è l'unica fonte e in sua assenza si blocca.");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
