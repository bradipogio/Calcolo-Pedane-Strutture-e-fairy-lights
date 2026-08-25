/* =========================================================
   CODICI PROGETTO

   Il contenuto resta leggibile dal planner ma viene racchiuso
   in un codice compatto con controllo d'integrita. In questo
   modo un codice troncato o modificato non viene accettato.
========================================================= */

const STRUCTURE_PREFIX = "STR1";


function checksum(text){

  let hash = 0x811c9dc5;

  for(let index=0; index<text.length; index++){

    hash ^= text.charCodeAt(index);

    hash = Math.imul(hash, 0x01000193);

  }

  return (hash >>> 0)
    .toString(36)
    .padStart(7,"0");

}


function toBase64Url(text){

  const bytes = new TextEncoder().encode(text);

  let binary = "";

  bytes.forEach(byte=>{
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+","-")
    .replaceAll("/","_")
    .replace(/=+$/g,"");

}


function fromBase64Url(value){

  const normalized = value
    .replaceAll("-","+")
    .replaceAll("_","/");

  const padded = normalized + "=".repeat(
    (4-normalized.length%4)%4
  );

  const binary = atob(padded);

  const bytes = Uint8Array.from(
    binary,
    character=>character.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);

}


export function encodeStructureCode(payload){

  const json = JSON.stringify(payload);

  return [
    STRUCTURE_PREFIX,
    checksum(json),
    toBase64Url(json)
  ].join("-");

}


export function decodeStructureCode(rawCode){

  const code = String(rawCode ?? "")
    .trim()
    .replace(/\s+/g,"");

  const match = code.match(
    /^STR1-([0-9a-z]{7})-([0-9a-z_-]+)$/i
  );

  if(!match){
    throw new Error("Formato del codice non riconosciuto.");
  }

  let json;

  try{
    json = fromBase64Url(match[2]);
  }
  catch(error){
    throw new Error("Il codice e incompleto o danneggiato.");
  }

  if(checksum(json).toLowerCase() !== match[1].toLowerCase()){
    throw new Error("Il codice e incompleto o danneggiato.");
  }

  let payload;

  try{
    payload = JSON.parse(json);
  }
  catch(error){
    throw new Error("I dati contenuti nel codice non sono leggibili.");
  }

  if(
    !payload
    || payload.v !== 1
    || payload.k !== "struttura"
  ){
    throw new Error("Questo codice non appartiene a una struttura compatibile.");
  }

  return {
    code,
    payload,
    shortId:match[1].toUpperCase()
  };

}

