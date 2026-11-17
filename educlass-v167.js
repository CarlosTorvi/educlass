/* EduClass NFC v16.7 - modo individual + rondas NFC; complemento incremental */
'use strict';
const edu167={active:false,reasonId:'',done:new Set(),working:new Set(),busy:false,queue:[],events:[],lastStatus:'',round:0};
const edu167OldRender=render,edu167OldScan=scanStudent,edu167OldGo=go;
const edu167Safe=v=>esc(String(v??''));
function edu167Reason(){return (db.reason_templates||[]).find(r=>r.id===edu167.reasonId&&r.kind!=='negative');}
function edu167End(announce=true){
  const count=edu167.done.size;
  edu167.active=false;edu167.queue.length=0;edu167.round++;
  if(reading)stopReader();
  if(announce)toast('Ronda finalizada: '+count+' estudiantes registrados.');
  render();
}
go=function(to){if(edu167.active&&to!=='puntos')edu167End(false);edu167OldGo(to)};
render=function(){edu167OldRender();if(page==='puntos')edu167Panel();};
function edu167Panel(){
 const target=document.querySelector('.nfc');if(!target)return;
 let panel=document.getElementById('edu167Panel');
 if(!panel){panel=document.createElement('div');panel.id='edu167Panel';panel.className='card section';target.parentElement.insertAdjacentElement('afterend',panel);}
 const available=(db.reason_templates||[]).filter(r=>r.kind!=='negative');
 const chosen=edu167Reason();
 const opts=available.map(r=>`<option value="${edu167Safe(r.id)}" ${r.id===edu167.reasonId?'selected':''}>${edu167Safe(r.name)} · +${Number(r.amount)} puntos · +${Number(r.xp_amount||0)} XP</option>`).join('');
 panel.innerHTML=`<div class="row between"><h2>📡 Puntos masivos por NFC</h2><span class="pill ${edu167.active?'green':''}">${edu167.active?'Ronda activa':'Modo individual disponible'}</span></div>
 <p class="muted">El modo individual de siempre permanece intacto. En una ronda, eliges un motivo y todos los alumnos del módulo pasan su tarjeta uno detrás de otro.</p>
 <label>Motivo para toda la ronda<select id="edu167Reason" ${edu167.active?'disabled':''} onchange="edu167Choose(this.value)"><option value="">Selecciona un motivo…</option>${opts}</select></label>
 ${chosen?`<p class="help">Se aplicarán <strong>+${Number(chosen.amount)} puntos y +${Number(chosen.xp_amount||0)} XP</strong> por alumno, una sola vez por ronda.</p>`:''}
 <div class="toolbar section"><button class="button ${edu167.active?'danger':'green'}" onclick="${edu167.active?'edu167End()':'edu167Start()'}">${edu167.active?'■ Finalizar ronda':'▶ Iniciar ronda NFC'}</button>${edu167.active?'<button class="button secondary" onclick="edu167Manual()">Seleccionar alumno de prueba</button>':''}</div>
 <p id="edu167Status" aria-live="polite">${edu167Safe(edu167.lastStatus||(edu167.active?'Lector preparado. Acerca las tarjetas consecutivamente.':'Selecciona motivo e inicia una ronda.'))}</p>
 <p><strong>${edu167.done.size} alumno(s) registrados</strong> en esta ronda</p>
 <div id="edu167History">${edu167.events.slice(-15).reverse().map(e=>`<p style="margin:5px 0">${e.ok?'✅':'⚠️'} ${edu167Safe(e.name)} — ${edu167Safe(e.info)}</p>`).join('')}</div>
 <p class="muted"><small>La ronda solo admite tarjetas del módulo seleccionado. Una tarjeta repetida no genera una segunda recompensa. No salgas de la pantalla durante una lectura.</small></p>`;
}
function edu167Choose(id){if(edu167.active)return;edu167.reasonId=id;edu167.lastStatus='';edu167Panel();}
async function edu167Start(){
 if(edu167.active)return;
 const reason=edu167Reason();if(!reason)return toast('Selecciona primero un motivo positivo.',true);
 const points=Number(reason.amount),xp=Number(reason.xp_amount||0);
 if(!Number.isInteger(points)||!Number.isInteger(xp)||points<0||xp<0||points>500||xp>500||points+xp===0)return toast('Motivo no válido: comprueba puntos y XP.',true);
 if(!currentClassId)return toast('Selecciona un módulo antes de empezar.',true);
 if(!('NDEFReader' in window))return toast('La lectura NFC requiere Chrome para Android y HTTPS.',true);
 edu167.done.clear();edu167.working.clear();edu167.queue=[];edu167.events=[];edu167.lastStatus='Preparando lector NFC…';edu167.active=true;edu167.round++;
 try{if(!reading)await toggleReader();if(!reading)throw Error('No se ha activado el lector.');edu167.lastStatus='Lector activo: acerca la primera tarjeta.';edu167Panel();}
 catch(err){edu167.active=false;edu167.lastStatus='No se activó la ronda: '+err.message;edu167Panel();}
}
scanStudent=function(uid){if(mode==='puntos'&&edu167.active){edu167Enqueue(uid);return;}return edu167OldScan(uid);};
function edu167Manual(){const studentId=document.getElementById('manualStudent')?.value;if(!studentId)return toast('Selecciona una persona en el desplegable de la izquierda.',true);edu167Enqueue(studentId);}
function edu167Log(name,info,ok){edu167.events.push({name,info,ok});edu167.lastStatus=(ok?'✓ ':'⚠ ')+name+' — '+info;edu167Panel();}
function edu167Enqueue(uid){
 const s=db.students.find(x=>x.id===uid);if(!s){edu167Log('Tarjeta','No reconocida',false);return;}
 if(s.class_id!==currentClassId){edu167Log(s.name,'Pertenece a otro módulo; no se concedieron puntos.',false);return;}
 if(edu167.done.has(uid)||edu167.working.has(uid)||edu167.queue.includes(uid)){edu167Log(s.name,'Ya registrado en esta ronda; sin duplicados.',false);return;}
 edu167.queue.push(uid);edu167Drain();
}
async function edu167Drain(){
 if(edu167.busy||!edu167.active)return;edu167.busy=true;const round=edu167.round;
 try{while(edu167.queue.length&&edu167.active&&round===edu167.round){
  const uid=edu167.queue.shift(),s=db.students.find(x=>x.id===uid),reason=edu167Reason();if(!s||!reason)continue;
  if(edu167.done.has(uid))continue;
  edu167.working.add(uid);edu167.lastStatus='Guardando recompensa de '+s.name+'…';edu167Panel();
  const points=Number(reason.amount),xp=Number(reason.xp_amount||0),awardId=id(),created=now();
  try{
   if(cloud){const result=await api.rpc('magic_award_points_xp',{p_student:uid,p_points:points,p_xp:xp,p_reason:reason.name,p_award:awardId});if(result.error)throw Error(result.error.message);}
   if(points)db.movements.push({id:id(),student_id:uid,amount:points,reason:reason.name,created_at:created,teacher_id:cloud?session.user.id:undefined});
   db.magic_manual_awards=db.magic_manual_awards||[];
   db.magic_manual_awards.push({id:awardId,student_id:uid,teacher_id:cloud?session.user.id:undefined,xp,points,reason:reason.name,created_at:created});
   if(!cloud)save();
   edu167.done.add(uid);
   edu167Log(s.name,'+'+points+' puntos · +'+xp+' XP',true);
  }catch(err){edu167Log(s.name,'No se guardó: '+err.message,false);}
  finally{edu167.working.delete(uid);}
 }}finally{edu167.busy=false;}
}
/* Reintento de grabación sin rotar/revocar el enlace, para cuando Chrome devuelve IO error.
   Importante: no garantiza superar limitaciones del sistema NFC/etiqueta. */
async function edu167RetryWrite(uid){
 const s=db.students.find(x=>x.id===uid);
 if(!s||!s.card_token)return toast('No existe todavía una credencial NFC activa.',true);
 const url=location.href.split('#')[0]+'#/ver/'+s.card_token;
 if(!confirm('Grabar de nuevo la credencial ACTUAL de '+s.name+' sin cambiar su enlace. Acerca una etiqueta regrabable al móvil.'))return;
 if(!('NDEFReader' in window)){prompt('Chrome no permite grabar aquí. Copia la dirección y grábala como URL en NFC Tools:',url);return;}
 try{
  await (new NDEFReader()).write({records:[{recordType:'url',data:url}]});
  toast('Etiqueta escrita con la credencial actual de '+s.name+'.');
 }catch(err){
  prompt('No se pudo grabar desde Chrome ('+err.message+'). La credencial NO ha cambiado. Copia esta URL para grabarla con NFC Tools:',url);
  toast('Grabación física pendiente; la credencial anterior permanece activa.',true);
 }
}
const edu167OriginalPanel=edu167Panel;
/* Botón independiente para reintentar sin activar un token nuevo. */
const edu167OriginalRender=render;
render=function(){edu167OriginalRender();if(page==='tarjetas'){
 document.querySelectorAll('.edu-print-card').forEach(card=>{
  const btn=card.querySelector('button[onclick^="eduLinkNfc("]');
  if(!btn)return;
  const match=btn.getAttribute('onclick').match(/eduLinkNfc\('([^']+)'\)/);if(!match)return;
  if(card.querySelector('.edu167Retry'))return;
  const retry=document.createElement('button');retry.className='button secondary edu167Retry';retry.textContent='↻ Reintentar grabación actual';
  retry.onclick=()=>edu167RetryWrite(match[1]);btn.parentElement.appendChild(retry);
 });
}};
