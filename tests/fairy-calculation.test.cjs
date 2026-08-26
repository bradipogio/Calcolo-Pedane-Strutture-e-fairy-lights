const fs=require("node:fs");
const path=require("node:path");

const html=fs.readFileSync(
  path.join(__dirname,"..","strutture.html"),
  "utf8"
);

const start=html.indexOf("function cellExists(");
const end=html.indexOf(
  "/* =========================================================\n   CESTE",
  start
);

if(start<0||end<0){
  throw new Error("Blocco di calcolo fairy non trovato.");
}

const calculationSource=html.slice(start,end);

const dependencies=String.raw`
const HEIGHT=2.5;
const DEFAULT_FAIRY_SPACING=.3;
const FAIRY_VISUAL_SAG=.17;
const ARCH_RISE=3/(Math.PI/2);
const ARCH_SPAN=ARCH_RISE*2;
let fairyMarginMeters=.2;

function vKey(r,c){return r+","+c;}
function hKey(r,c){return r+","+c;}
function parseKey(key){
  const [r,c]=key.split(",").map(Number);
  return {r,c};
}
function closeEnough(a,b){return Math.abs(a-b)<.001;}
function activeBounds(target){
  let minR=Infinity,maxR=-Infinity,minC=Infinity,maxC=-Infinity;
  for(let r=0;r<target.rows;r++){
    for(let c=0;c<target.cols;c++){
      if(!target.nodes[r][c]) continue;
      minR=Math.min(minR,r); maxR=Math.max(maxR,r);
      minC=Math.min(minC,c); maxC=Math.max(maxC,c);
    }
  }
  return minR===Infinity?null:{minR,maxR,minC,maxC};
}
function transverseGeometry(target,arches,normalWidth){
  const bounds=activeBounds(target);
  if(!bounds){
    return {bounds:null,totalWidth:0,position:()=>0,width:()=>normalWidth};
  }
  const archRows=new Set([...arches].map(key=>parseKey(key).r));
  const positions=new Map(),rowWidths=new Map();
  let cursor=0;
  positions.set(bounds.minR,0);
  for(let r=bounds.minR;r<bounds.maxR;r++){
    const width=archRows.has(r)?ARCH_SPAN:normalWidth;
    rowWidths.set(r,width);
    cursor+=width;
    positions.set(r+1,cursor);
  }
  return {
    bounds,
    totalWidth:cursor,
    position:r=>positions.get(r)??0,
    width:r=>rowWidths.get(r)??normalWidth
  };
}
`;

const checks=String.raw`
function rectangle(rows,cols){
  return {
    rows:rows+1,
    cols:cols+1,
    nodes:Array.from({length:rows+1},()=>Array(cols+1).fill(true))
  };
}

function near(actual,expected,label,tolerance=1e-8){
  if(Math.abs(actual-expected)>tolerance){
    throw new Error(label+": "+actual+" != "+expected);
  }
}

function validate(result,label){
  for(const key of ["baseTotal","marginTotal","total","paths"]){
    if(!Number.isFinite(result[key])||result[key]<0){
      throw new Error(label+": "+key+" non valido");
    }
  }
  near(result.total,result.baseTotal+result.marginTotal,label+" totale");
  near(result.marginTotal,result.paths*fairyMarginMeters,label+" margine");
  near(
    result.samples.reduce((sum,sample)=>sum+sample.baseLength,0),
    result.baseTotal,
    label+" campioni"
  );
}

let target=rectangle(1,1);
let arches=new Set();
let result=calculateFairy(target,1,5,arches,new Set(),"A",1.1);
near(result.baseTotal,10,"Trasversale 1 x 5 base");
near(result.total,10.2,"Trasversale 1 x 5 totale");
near(
  calculateFairy(target,1,5,arches,new Set(["0,0"]),"A",1.1).total,
  7.7,
  "Trasversale: una calata spenta"
);
near(
  calculateFairy(target,1,5,arches,new Set(["0,0","1,0"]),"A",1.1).total,
  5.2,
  "Trasversale: due calate spente"
);

result=calculateFairy(target,1,5,arches,new Set(),"B",1.1);
near(result.baseTotal,30,"Longitudinale 1 x 5 base");
near(result.marginTotal,1,"Longitudinale margine per percorso");
near(result.total,31,"Longitudinale 1 x 5 totale");

target=rectangle(2,1);
near(
  calculateFairy(target,1,3,arches,new Set(),"A",1.1).baseTotal,
  16,
  "Trasversale: cascata interna"
);
near(
  calculateFairy(target,1,3,arches,new Set(["1,0"]),"A",1.1).baseTotal,
  11,
  "Trasversale: cascata interna spenta"
);

target=rectangle(1,2);
near(
  calculateFairy(target,3,5,arches,new Set(),"B",1.1).total,
  81,
  "Longitudinale: due campate"
);
near(
  calculateFairy(target,3,5,arches,new Set(["0,1"]),"B",1.1).baseTotal,
  55,
  "Longitudinale: cascata interna spenta"
);

target=rectangle(1,1);
arches=new Set(["0,0","0,1"]);
near(
  calculateFairy(target,1,5,arches,new Set(),"A",1.1).baseTotal,
  11,
  "Arco: 6 m di curva e 5 m di calate"
);

function randomGenerator(seed){
  return ()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
}

const random=randomGenerator(260826);
let togglesChecked=0;

for(let trial=0;trial<300;trial++){
  const rows=2+Math.floor(random()*4);
  const cols=2+Math.floor(random()*5);
  const nodes=Array.from(
    {length:rows},
    ()=>Array.from({length:cols},()=>random()>.28)
  );
  const forcedRow=Math.floor(random()*(rows-1));
  const forcedCol=Math.floor(random()*(cols-1));
  nodes[forcedRow][forcedCol]=true;
  nodes[forcedRow+1][forcedCol]=true;
  nodes[forcedRow][forcedCol+1]=true;
  nodes[forcedRow+1][forcedCol+1]=true;
  target={rows,cols,nodes};
  arches=new Set();
  for(let r=0;r<rows-1;r++){
    if(random()<=.7) continue;
    for(let c=0;c<cols;c++){
      if(nodes[r][c]&&nodes[r+1][c]) arches.add(vKey(r,c));
    }
  }

  for(const orientation of ["A","B"]){
    const baseline=calculateFairy(
      target,3,1.5,arches,new Set(),orientation,1.1
    );
    validate(baseline,"Matrice "+trial+" "+orientation);

    const relevant=[];
    if(orientation==="A"){
      for(let r=0;r<rows;r++) for(let c=0;c<cols-1;c++){
        if(fairyHorizontalEdgeExists(target,r,c)) relevant.push(hKey(r,c));
      }
    }
    else{
      for(let r=0;r<rows-1;r++) for(let c=0;c<cols;c++){
        if(fairyVerticalEdgeExists(target,r,c)) relevant.push(vKey(r,c));
      }
    }

    for(const key of relevant){
      const changed=calculateFairy(
        target,3,1.5,arches,new Set([key]),orientation,1.1
      );
      validate(changed,"Spegnimento "+trial+" "+orientation+" "+key);
      if(!(changed.total<baseline.total-1e-8)){
        throw new Error("Spegnimento senza effetto: "+orientation+" "+key);
      }
      togglesChecked++;
    }

    const dense=calculateFairy(
      target,3,1.5,arches,new Set(),orientation,.3
    );
    if(dense.paths<baseline.paths){
      throw new Error("Riducendo la dima diminuiscono i percorsi.");
    }

    const previousMargin=fairyMarginMeters;
    fairyMarginMeters=.73;
    const changedMargin=calculateFairy(
      target,3,1.5,arches,new Set(),orientation,1.1
    );
    near(
      changedMargin.total-baseline.total,
      baseline.paths*(.73-previousMargin),
      "Margine per ogni percorso"
    );
    fairyMarginMeters=previousMargin;
  }
}

console.log(
  "Fairy test OK: 300 matrici e "+togglesChecked+" spegnimenti singoli."
);
`;

new Function(
  dependencies+calculationSource+checks
)();
