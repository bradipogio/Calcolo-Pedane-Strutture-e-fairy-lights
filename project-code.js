/* =========================================================
   CODICI STRUTTURA COMPATTI

   S2 non contiene identificativi casuali: lo stesso progetto
   produce sempre lo stesso codice. I valori numerici, la
   matrice e gli interruttori vengono salvati in forma binaria
   per usare il minor numero possibile di caratteri.
========================================================= */

const CURRENT_PREFIX="S2";

const LEGACY_PREFIX="STR1";

const METHODS=[
  "auto","fixed3","fixed4","tel1","tel15","tel3","tel4"
];

const REQUIREMENT_KEYS=[
  "high3","low3","high4","low4",
  "tel1","tel15","tel3","tel4",
  "arch","pole","base"
];


function checksumBytes(bytes){

  let hash=0x811c9dc5;

  bytes.forEach(byte=>{
    hash^=byte;
    hash=Math.imul(hash,0x01000193);
  });

  return (hash>>>0)
    .toString(36)
    .padStart(7,"0");

}


function checksumText(text){
  return checksumBytes(
    new TextEncoder().encode(text)
  );
}


function bytesToBase64Url(bytes){

  let binary="";

  bytes.forEach(byte=>{
    binary+=String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+","-")
    .replaceAll("/","_")
    .replace(/=+$/g,"");

}


function base64UrlToBytes(value){

  const normalized=value
    .replaceAll("-","+")
    .replaceAll("_","/");

  const padded=normalized+"=".repeat(
    (4-normalized.length%4)%4
  );

  const binary=atob(padded);

  return Uint8Array.from(
    binary,
    character=>character.charCodeAt(0)
  );

}


class ByteWriter{

  constructor(){
    this.bytes=[];
  }

  uint(value){

    value=Math.max(0,Math.round(Number(value)||0));

    do{
      let byte=value&0x7f;
      value=Math.floor(value/128);
      if(value>0)
        byte|=0x80;
      this.bytes.push(byte);
    }
    while(value>0);

  }

  byte(value){
    this.bytes.push(Number(value)&0xff);
  }

  bits(values){

    for(let start=0; start<values.length; start+=8){

      let byte=0;

      for(let bit=0; bit<8 && start+bit<values.length; bit++){
        if(values[start+bit])
          byte|=1<<bit;
      }

      this.byte(byte);

    }

  }

  result(){
    return Uint8Array.from(this.bytes);
  }

}


class ByteReader{

  constructor(bytes){
    this.bytes=bytes;
    this.offset=0;
  }

  byte(){

    if(this.offset>=this.bytes.length)
      throw new Error("Codice incompleto.");

    return this.bytes[this.offset++];

  }

  uint(){

    let value=0;
    let factor=1;

    for(let count=0; count<8; count++){

      const byte=this.byte();
      value+=(byte&0x7f)*factor;

      if(!(byte&0x80))
        return value;

      factor*=128;

    }

    throw new Error("Numero non valido nel codice.");

  }

  bits(count){

    const values=[];

    for(let start=0; start<count; start+=8){

      const byte=this.byte();

      for(let bit=0; bit<8 && start+bit<count; bit++){
        values.push(Boolean(byte&(1<<bit)));
      }

    }

    return values;

  }

  finished(){
    return this.offset===this.bytes.length;
  }

}


function layoutRows(payload){

  const rows=String(payload.n??"").split(".");

  if(
    rows.length<2
    || rows.length>102
    || !rows[0]
    || rows[0].length>102
    || rows.some(row=>
      row.length!==rows[0].length
      || !/^[01]+$/.test(row)
    )
  ){
    throw new Error("Schema struttura non valido.");
  }

  return rows;

}


function edgeBits(keys,rows,cols,vertical){

  const count=vertical
    ? (rows-1)*cols
    : rows*(cols-1);

  const bits=Array(count).fill(false);

  (Array.isArray(keys)?keys:[]).forEach(key=>{

    const match=String(key).match(/^(\d+),(\d+)$/);

    if(!match)
      return;

    const row=Number(match[1]);
    const column=Number(match[2]);

    const valid=vertical
      ? row<rows-1 && column<cols
      : row<rows && column<cols-1;

    if(valid){
      const index=vertical
        ? row*cols+column
        : row*(cols-1)+column;
      bits[index]=true;
    }

  });

  return bits;

}


function bitsToEdges(bits,rows,cols,vertical){

  const result=[];

  bits.forEach((active,index)=>{

    if(!active)
      return;

    const divisor=vertical?cols:cols-1;
    const row=Math.floor(index/divisor);
    const column=index%divisor;

    result.push(`${row},${column}`);

  });

  return result;

}


function encodeCurrent(payload){

  const rows=layoutRows(payload);
  const rowCount=rows.length;
  const columnCount=rows[0].length;

  const writer=new ByteWriter();

  writer.uint(Math.round(Number(payload.l)*1000));
  writer.uint(Math.round(Number(payload.w)*1000));
  writer.uint(payload.s);

  let flags=0;
  if(payload.sm) flags|=1;
  if(payload.c) flags|=2;
  if(payload.e) flags|=4;
  if(payload.o==="B") flags|=8;
  if(Number(payload.ab)===1.5) flags|=16;
  if(payload.q) flags|=32;

  writer.byte(flags);

  const side=Math.max(0,METHODS.indexOf(payload.so));
  const top=Math.max(0,METHODS.indexOf(payload.to));

  writer.byte(side|(top<<3));
  writer.uint(payload.d);
  writer.uint(payload.m);
  writer.uint(rowCount);
  writer.uint(columnCount);

  writer.bits(
    rows.flatMap(row=>[...row].map(value=>value==="1"))
  );

  writer.bits(edgeBits(payload.a,rowCount,columnCount,true));
  writer.bits(edgeBits(payload.lo,rowCount,columnCount,false));
  writer.bits(edgeBits(payload.ff,rowCount,columnCount,false));

  REQUIREMENT_KEYS.forEach(key=>{
    writer.uint(payload.r?.[key]??0);
  });

  writer.uint(payload.f??0);

  const bytes=writer.result();

  return `${CURRENT_PREFIX}-${bytesToBase64Url(bytes)}-${checksumBytes(bytes)}`;

}


function decodeCurrent(code){

  const match=code.match(
    /^S2-([0-9a-z_-]+)-([0-9a-z]{7})$/i
  );

  if(!match)
    throw new Error("Formato del codice non riconosciuto.");

  let bytes;

  try{
    bytes=base64UrlToBytes(match[1]);
  }
  catch(error){
    throw new Error("Il codice e incompleto o danneggiato.");
  }

  if(checksumBytes(bytes).toLowerCase()!==match[2].toLowerCase()){
    throw new Error("Il codice e incompleto o danneggiato.");
  }

  const reader=new ByteReader(bytes);

  const length=reader.uint()/1000;
  const width=reader.uint()/1000;
  const sections=reader.uint();
  const flags=reader.byte();
  const methods=reader.byte();
  const spacing=reader.uint();
  const margin=reader.uint();
  const rows=reader.uint();
  const cols=reader.uint();

  if(rows<2 || rows>102 || cols<1 || cols>102){
    throw new Error("Lo schema contenuto nel codice non e valido.");
  }

  const nodes=reader.bits(rows*cols);
  const arches=reader.bits((rows-1)*cols);
  const lower=reader.bits(rows*(cols-1));
  const fairyOff=reader.bits(rows*(cols-1));

  const requirements={};

  REQUIREMENT_KEYS.forEach(key=>{
    const quantity=reader.uint();
    if(quantity>0)
      requirements[key]=quantity;
  });

  const fairyCentimeters=reader.uint();

  if(!reader.finished())
    throw new Error("Il codice contiene dati non riconosciuti.");

  const nodeRows=[];

  for(let row=0; row<rows; row++){
    nodeRows.push(
      nodes
        .slice(row*cols,(row+1)*cols)
        .map(Number)
        .join("")
    );
  }

  const payload={
    v:2,
    k:"struttura",
    l:length,
    w:width,
    s:sections,
    sm:flags&1?1:0,
    c:flags&2?1:0,
    e:flags&4?1:0,
    o:flags&8?"B":"A",
    ab:flags&16?1.5:3,
    so:METHODS[methods&7]??"auto",
    to:METHODS[(methods>>3)&7]??"auto",
    d:spacing,
    m:margin,
    n:nodeRows.join("."),
    a:bitsToEdges(arches,rows,cols,true),
    lo:bitsToEdges(lower,rows,cols,false),
    ff:bitsToEdges(fairyOff,rows,cols,false),
    r:requirements,
    f:fairyCentimeters,
    q:flags&32?1:0
  };

  return {
    code,
    payload,
    shortId:match[2].toUpperCase()
  };

}


/* I codici STR1 gia copiati restano apribili. */
function decodeLegacy(code){

  const match=code.match(
    /^STR1-([0-9a-z]{7})-([0-9a-z_-]+)$/i
  );

  if(!match)
    throw new Error("Formato del codice non riconosciuto.");

  const bytes=base64UrlToBytes(match[2]);
  const json=new TextDecoder().decode(bytes);

  if(checksumText(json).toLowerCase()!==match[1].toLowerCase()){
    throw new Error("Il codice e incompleto o danneggiato.");
  }

  const payload=JSON.parse(json);

  if(payload?.v!==1 || payload?.k!=="struttura"){
    throw new Error("Questo codice non appartiene a una struttura compatibile.");
  }

  return {
    code,
    payload,
    shortId:match[1].toUpperCase()
  };

}


export function encodeStructureCode(payload){
  return encodeCurrent(payload);
}


export function decodeStructureCode(rawCode){

  const code=String(rawCode??"")
    .trim()
    .replace(/\s+/g,"");

  if(code.toUpperCase().startsWith(`${CURRENT_PREFIX}-`))
    return decodeCurrent(code);

  if(code.toUpperCase().startsWith(`${LEGACY_PREFIX}-`))
    return decodeLegacy(code);

  throw new Error("Formato del codice non riconosciuto.");

}
