const fs=require("node:fs");
const path=require("node:path");

const html=fs.readFileSync(
  path.join(__dirname,"..","pedane.html"),
  "utf8"
);

const start=html.indexOf("function minimumPieceCount(");
const end=html.indexOf("function buildYellowSegments(",start);

if(start<0||end<0){
  throw new Error("Blocco di calcolo pannelli gialli non trovato.");
}

const calculationSource=html.slice(start,end);

const checks=String.raw`
const YELLOW_LENGTHS=[4,2,1];

function allPatterns(length){
  const minPieces=minimumPieceCount(length);
  const maxPieces=minPieces+1;
  const result=[];

  function visit(total,sequence){
    if(total===length){
      result.push([...sequence]);
      return;
    }
    if(total>length||sequence.length>=maxPieces)return;

    for(const piece of YELLOW_LENGTHS){
      if(total+piece<=length){
        sequence.push(piece);
        visit(total+piece,sequence);
        sequence.pop();
      }
    }
  }

  visit(0,[]);
  return result;
}

function preferredSequence(left,right,reverse){
  for(let index=0;index<Math.min(left.length,right.length);index++){
    if(left[index]===right[index])continue;
    return reverse
      ? left[index]-right[index]
      : right[index]-left[index];
  }
  return left.length-right.length;
}

function exhaustiveBest(length,offset,previousSegments,reverse){
  const previousJoints=globalJointSet(previousSegments);
  let best=null;

  for(const sequence of allPatterns(length)){
    const aligned=sequenceJoints(sequence)
      .filter(joint=>previousJoints.has(offset+joint))
      .length;
    const score=
      aligned*10000+
      sequence.length*100+
      new Set(sequence).size;

    if(
      !best
      || score<best.score
      || (
        score===best.score
        && preferredSequence(sequence,best.sequence,reverse)<0
      )
    ){
      best={sequence:[...sequence],aligned,score};
    }
  }

  return best;
}

function assertSame(actual,expected,label){
  if(actual.aligned!==expected.aligned){
    throw new Error(label+": giunti "+actual.aligned+" != "+expected.aligned);
  }
  if(actual.sequence.join(",")!==expected.sequence.join(",")){
    throw new Error(
      label+": "+actual.sequence.join("-")+" != "+expected.sequence.join("-")
    );
  }
}

for(let length=1;length<=14;length++){
  const priorPatterns=allPatterns(length).slice(0,18);
  const cases=[[],...priorPatterns.map(sequence=>[{offset:0,sequence}])];

  for(const previousSegments of cases){
    for(const reverse of [false,true]){
      assertSame(
        bestPanelPattern(length,0,previousSegments,reverse),
        exhaustiveBest(length,0,previousSegments,reverse),
        "Lunghezza "+length+", reverse "+reverse
      );
    }
  }
}

assertSame(
  bestPanelPattern(7,0,[],false),
  {sequence:[4,2,1],aligned:0},
  "Sequenza 7 m da sinistra"
);
assertSame(
  bestPanelPattern(7,0,[],true),
  {sequence:[1,2,4],aligned:0},
  "Sequenza 7 m da destra"
);

const started=Date.now();
let previous=[];

for(let length=20;length<=200;length+=5){
  const result=bestPanelPattern(length,0,previous,length%2===0);
  const total=result.sequence.reduce((sum,piece)=>sum+piece,0);

  if(total!==length){
    throw new Error("Copertura errata a "+length+" m.");
  }

  previous=[{offset:0,sequence:result.sequence}];
}

const elapsed=Date.now()-started;
if(elapsed>1500){
  throw new Error("Calcolo pannelli ancora troppo lento: "+elapsed+" ms.");
}

console.log(
  "Pannelli gialli OK: risultato esatto fino a 14 m; 20–200 m in "+elapsed+" ms."
);
`;

new Function(calculationSource+checks)();
