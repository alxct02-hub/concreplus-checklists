const MAX_PAGES=3;
const PROMPT=`Eres analista técnico de mantenimiento y seguridad de CONCREPLUS México. Examina imágenes de checklists escaneados. Extrae exclusivamente hallazgos visibles, en especial observaciones manuscritas y casillas NO inequívocas. Nunca interpretes trazos grandes, firmas o marcas diagonales como fallas. Separa cada falla en una observación. Identifica número económico RC/TV, planta, semana, archivo y página. Si un texto no es legible, anota "Por confirmar" y no inventes. Devuelve exclusivamente un objeto JSON con arrays observations y documents. Cada observation incluye file, page, plant, unit, observation, system, priority (Alta/Media/Baja/Por confirmar), confidence (Alta/Media/Por confirmar), source_type (Manuscrito/Casilla NO), evidence, status (Pendiente). Cada document incluye file, page, plant, unit, period, notes. Clasifica la prioridad como preliminar. No asumas que la ausencia de observaciones significa equipo sin fallas.`;
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim());
  const cors={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Access-Code','Vary':'Origin'};
  const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(!allowed.includes(origin))return json({error:'Origen no autorizado. Configura ALLOWED_ORIGIN.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/analyze')return json({error:'Ruta o método no permitido'},405);
  if(!env.OPENAI_API_KEY||!env.ACCESS_CODE)return json({error:'Faltan secretos OPENAI_API_KEY o ACCESS_CODE en Worker.'},503);
  if(request.headers.get('X-Access-Code')!==env.ACCESS_CODE)return json({error:'Código de acceso incorrecto'},401);
  const len=Number(request.headers.get('content-length')||0);if(len>12000000)return json({error:'Lote demasiado grande'},413);
  try{
   const body=await request.json();const pages=body.pages;
   if(!Array.isArray(pages)||!pages.length||pages.length>MAX_PAGES)return json({error:'Se admiten 1 a 3 páginas por lote'},400);
   if(pages.some(p=>!Number.isInteger(p.page)||typeof p.file!=='string'||p.file.length>180||typeof p.image!=='string'||!/^data:image\/(jpeg|png);base64,/.test(p.image)||p.image.length>5000000))return json({error:'Datos de página inválidos o demasiado grandes'},400);
   const content=[{type:'text',text:PROMPT+'\nContexto: '+JSON.stringify({plant:body.plant||'',period:body.period||''})}];
   for(const p of pages){content.push({type:'text',text:`Archivo ${p.file}; página ${p.page}. Conserva este archivo y página en resultados.`},{type:'image_url',image_url:{url:p.image,detail:'high'}})}
   const upstream=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-4.1',temperature:0,response_format:{type:'json_object'},messages:[{role:'user',content}]})});
   if(!upstream.ok)return json({error:`El proveedor IA devolvió HTTP ${upstream.status}. Revisa la clave, saldo o límites.`},502);
   const result=await upstream.json();const parsed=JSON.parse(result.choices?.[0]?.message?.content||'{}');
   return json({observations:Array.isArray(parsed.observations)?parsed.observations:[],documents:Array.isArray(parsed.documents)?parsed.documents:[]});
  }catch(e){return json({error:'No se pudo procesar el lote. Revisa formato y tamaño de los PDF.'},500)}
 }
};
