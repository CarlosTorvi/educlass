/* EduClass NFC v16.8 - Selección previa de motivos en el modo individual.
   Complemento sobre v16.7; el modo masivo permanece sin cambios. */
'use strict';
const edu168={view:'individual',selected:new Set(),waiting:false,busy:false,locked:null,last:'',classId:null};
const edu168PrevRender=render,edu168PrevScan=scanStudent,edu168PrevGo=go;
function edu168Num(v){return Number.isInteger(Number(v))?Number(v):NaN;}
function edu168Reasons(){return(db.reason_templates||[]).filter(r=>r.kind!=='negative'&&edu168Valid(r));}
function edu168Valid(r){const p=edu168Num(r.amount),x=edu168Num(r.xp_amount||0);return p>=0&&x>=0&&p<=500&&x<=500&&p+x>0;}
function edu168Selections(){return edu168Reasons().filter(r=>edu168.selected.has(r.id));}
function edu168Totals(){let points=0,xp=0;for(const r of edu168Selections()){points+=Number(r.amount);xp+=Number(r.xp_amount||0);}return{points,xp};}
function edu168Cancel(){edu168.waiting=false;edu168.locked=null;if(reading&&!edu167.active)stopReader();}
go=function(to){if(to!=='puntos'&&edu168.waiting)edu168Cancel();edu168PrevGo(to);};
render=function(){edu168PrevRender();if(page==='puntos')edu168Panel();};
function edu168ChooseView(view){
 if(!['individual','masiva'].includes(view)||edu168.busy)return;
 if(view==='individual'&&edu167.active){if(!confirm('Finalizar la ronda masiva activa y pasar a individual?'))return;edu167End(false);}
 if(view!==edu168.view){edu168Cancel();edu168.view=view;render();}
}
function edu168Panel(){
 const nfc=document.querySelector('.nfc');if(!nfc)return;
 if(edu168.classId!==currentClassId){edu168Cancel();edu168.selected.clear();edu168.last='';edu168.classId=currentClassId;}
 const card=nfc.closest('.card');if(!card)return;
 let sw=document.getElementById('edu168Switch');
 if(!sw){sw=document.createElement('div');sw.id='edu168Switch';sw.className='section';const tab=card.querySelector('.tabs');(tab||nfc).insertAdjacentElement('afterend',sw);}
 sw.innerHTML=`<div class="tabs" role="group" aria-label="Modalidad de puntos"><button class="${edu168.view==='individual'?'sel':''}" onclick="edu168ChooseView('individual')">👤 Individual</button><button class="${edu168.view==='masiva'?'sel':''}" onclick="edu168ChooseView('masiva')">👥 Masiva</button></div>`;
 const mass=document.getElementById('edu167Panel');
 if(mass)mass.style.display=edu168.view==='masiva'?'':'none';
 const manual=nfc.nextElementSibling;
 if(edu168.view==='masiva'){nfc.style.display='';if(manual)manual.style.display='';return;}
 if(manual)manual.style.display='none';
 nfc.style.display='';nfc.style.textAlign='left';nfc.style.padding='18px';
 const reasons=edu168Reasons(),chosen=edu168Selections(),tot=edu168Totals();
 const options=reasons.map(r=>`<label style="display:flex;align-items:center;gap:9px;padding:10px;border:1px solid #ddd6ea;border-radius:10px;background:white;font-size:13px;cursor:pointer"><input type="checkbox" style="width:18px;height:18px;flex-shrink:0" ${edu168.selected.has(r.id)?'checked':''} ${edu168.waiting||edu168.busy?'disabled':''} onchange="edu168Select('${esc(r.id)}',this.checked)"><span style="flex:1"><strong>${esc(r.name)}</strong><br><small>+${Number(r.amount)} puntos · +${Number(r.xp_amount||0)} XP</small></span></label>`).join('');
 nfc.innerHTML=`<h2 style="margin:0 0 8px">👤 Puntos individuales por NFC</h2><p class="muted">Primero selecciona los motivos. Después pulsa el botón y acerca la tarjeta del alumno: se aplicará todo lo seleccionado con una única lectura.</p>
 <p style="font-weight:700;margin:12px 0 8px">1. Elige uno o varios motivos</p><div style="display:grid;gap:7px;max-height:245px;overflow:auto">${options||'<p>No hay motivos positivos configurados. Crea uno en «Motivos».</p>'}</div>
 <div style="margin:15px 0;padding:12px;border-radius:11px;background:#fff"><strong>2. Lista de puntos seleccionados</strong>${chosen.length?`<ul style="padding-left:20px;margin:9px 0">${chosen.map(r=>`<li>${esc(r.name)} — +${Number(r.amount)} puntos · +${Number(r.xp_amount||0)} XP</li>`).join('')}</ul>`:'<p class="muted" style="margin:7px 0">Todavía no has seleccionado ninguno.</p>'}<strong>Total: +${tot.points} puntos · +${tot.xp} XP</strong></div>
 <button class="button ${edu168.waiting?'danger':'green'}" style="width:100%" ${edu168.busy||(!edu168.waiting&&!chosen.length)?'disabled':''} onclick="${edu168.waiting?'edu168CancelAndRender()':'edu168Start()'}">${edu168.busy?'Guardando…':edu168.waiting?'■ Cancelar lectura':'📡 3. Leer tarjeta y conceder puntos'}</button>
 <p aria-live="polite" style="margin:10px 0 0;font-weight:650">${esc(edu168.busy?'Guardando la recompensa…':edu168.waiting?'Lector NFC activo. Acerca una tarjeta una sola vez.':edu168.last||'Selecciona los puntos y pulsa Leer tarjeta.')}</p>
 <p class="muted" style="margin-top:9px"><small>Una lectura por operación; no tienes que abrir la ficha ni volver a seleccionar los motivos. Para otro alumno, pulsa de nuevo el botón. Las penalizaciones siguen disponibles desde la ficha individual.</small></p>`;
}
function edu168Select(uid,checked){if(edu168.waiting||edu168.busy)return;if(checked)edu168.selected.add(uid);else edu168.selected.delete(uid);edu168.last='';edu168Panel();}
function edu168CancelAndRender(){edu168Cancel();edu168.last='Lectura cancelada. No se han asignado puntos.';render();}
async function edu168Start(){
 if(edu168.busy||edu168.waiting||edu168.view!=='individual')return;
 const chosen=edu168Selections(),tot=edu168Totals();
 if(!chosen.length)return toast('Selecciona al menos un motivo.',true);
 if(!currentClassId)return toast('Selecciona primero un módulo.',true);
 if(tot.points>500||tot.xp>500)return toast('La suma supera 500 puntos o 500 XP. Reduce la selección.',true);
 if(!('NDEFReader' in window))return toast('La lectura NFC necesita Chrome para Android con HTTPS.',true);
 if(reading)stopReader();
 edu168.last='Activando lector…';edu168.waiting=true;render();
 try{await toggleReader();if(!reading)throw new Error('No se ha activado el lector NFC.');edu168.last='Lector NFC activo. Acerca una tarjeta.';render();}
 catch(e){edu168.waiting=false;edu168.last='Error al activar NFC: '+e.message;render();}
}
scanStudent=function(uid){
 if(mode==='puntos'&&edu168.view==='individual'&&edu168.waiting){
  if(edu168.busy||edu168.locked)return;
  edu168.locked=uid;edu168.waiting=false;stopReader();edu168Give(uid);return;
 }
 return edu168PrevScan(uid);
};
async function edu168Give(uid){
 const student=db.students.find(s=>s.id===uid),chosen=edu168Selections(),tot=edu168Totals();
 if(!student||student.class_id!==currentClassId){edu168.last='Tarjeta de otro módulo o alumno no reconocido. No se asignaron puntos.';edu168.locked=null;render();return;}
 if(!chosen.length||tot.points>500||tot.xp>500){edu168.last='Selección no válida. No se asignaron puntos.';edu168.locked=null;render();return;}
 edu168.busy=true;render();
 const reason=chosen.map(r=>r.name).join(' + '),awardId=id(),created=now();
 try{
  if(cloud){const result=await api.rpc('magic_award_points_xp',{p_student:uid,p_points:tot.points,p_xp:tot.xp,p_reason:reason,p_award:awardId});if(result.error)throw new Error(result.error.message);}
  if(tot.points)db.movements.push({id:id(),student_id:uid,amount:tot.points,reason,created_at:created,teacher_id:cloud?session.user.id:undefined});
  db.magic_manual_awards=db.magic_manual_awards||[];
  db.magic_manual_awards.push({id:awardId,student_id:uid,teacher_id:cloud?session.user.id:undefined,xp:tot.xp,points:tot.points,reason,created_at:created});
  if(!cloud)save();
  selected=uid;
  edu168.last='✓ '+student.name+': +'+tot.points+' puntos y +'+tot.xp+' XP. Guardado correctamente.';
  toast(edu168.last);
 }catch(err){edu168.last='No se han confirmado puntos para '+student.name+': '+err.message;toast(edu168.last,true);}
 finally{edu168.locked=null;edu168.busy=false;render();}
}
