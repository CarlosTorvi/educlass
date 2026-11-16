'use strict';
/* EduClass v16 · Extension incremental sobre v15; requiere educlass-v16.sql. */
let edu16StudentData=null,edu16Token='',edu16IncidentOpen=null,edu16TeacherIncident=null,edu16ReportStudent='',edu16ReportFilter='';
const edu16Date=t=>t?new Date(t).toLocaleString('es-ES'):'—';
const edu16Esc=s=>esc(s);
const edu16Msg=e=>alert(e?.message||String(e));
async function edu16Rpc(fn,params){const {data,error}=await api.rpc(fn,params);if(error)throw error;return data;}
async function edu16RefreshStudent(){
 if(!cloud||!portalToken)return;
 const token=portalToken;
 const data=await edu16Rpc('educlass_v16_student_data',{p_token:token});
 if(token!==portalToken||!data)return;
 edu16Token=token;edu16StudentData=data;edu16StudentInterface();if(magicState.portal && document.getElementById('magicPortalTab'))magicRenderStudentExtras();
}
function edu16StudentInterface(){
 if(!edu16StudentData||!document.querySelector('.portalWrap'))return;
 const data=edu16StudentData;
 let holder=document.getElementById('edu16StudentWidgets');
 if(!holder){holder=document.createElement('section');holder.id='edu16StudentWidgets';holder.className='section';document.querySelector('.portalWrap').appendChild(holder);}
 const saldo=Number(document.querySelector('.portalWrap .statGrid .stat strong')?.textContent||0);
 const requested=(data.requests||[]).filter(x=>x.status==='pendiente');
 const replies=(data.incidents||[]).reduce((n,i)=>n+(i.messages||[]).filter(m=>m.sender==='teacher').length,0);
 holder.innerHTML=`<div class="card edu16-student-section"><h2>🎁 Mi Tienda Mágica</h2><p>Mis puntos disponibles: <b>${saldo}</b> · Los puntos se descontarán únicamente cuando el docente apruebe el premio.</p><div class="edu16-rewards">${(data.rewards||[]).map(r=>`<div class="edu16-small-card"><b>🎁 ${edu16Esc(r.name)}</b><p>${r.cost} puntos</p><button class="button" ${saldo<r.cost||requested.some(x=>x.name===r.name)?'disabled':''} onclick="edu16AskReward('${r.id}')">${requested.some(x=>x.name===r.name)?'Solicitado':saldo<r.cost?'Puntos insuficientes':'Solicitar premio'}</button></div>`).join('')||'<p>Tu docente aún no ha creado premios.</p>'}</div><h3>Mis solicitudes</h3>${(data.requests||[]).map(x=>`<div class="eventLine"><span>${edu16Esc(x.name)} · ${edu16Date(x.created_at)}</span><b>${edu16Esc(x.status)} · ${x.cost} puntos</b></div>`).join('')||'<p>Sin solicitudes todavía.</p>'}</div>
 <div class="card section edu16-student-section"><h2>📩 Mis incidencias y respuestas ${replies?'· '+replies+' respuestas del docente':''}</h2><p>Abre una incidencia para leer la conversación y responder.</p>${(data.incidents||[]).map(i=>`<div class="edu16-incident"><button class="edu16-ticket-head" onclick="edu16StudentToggleIncident('${i.id}')"><strong>${edu16Esc(i.subject)}</strong><small>${edu16Esc(i.status)} · ${edu16Date(i.created_at)}</small></button>${edu16IncidentOpen===i.id?`<div class="edu16-chat">${(i.messages||[]).map(m=>`<div class="bubble ${m.sender==='teacher'?'teacherBubble':'studentBubble'}"><small>${m.sender==='teacher'?'Profesor':'Yo'} · ${edu16Date(m.created_at)}</small><p>${edu16Esc(m.body)}</p></div>`).join('')}<textarea id="edu16Reply_${i.id}" rows="3" placeholder="Escribe tu respuesta…"></textarea><button class="button secondary" onclick="edu16StudentReply('${i.id}')">Enviar respuesta</button></div>`:''}</div>`).join('')||'<p>No hay incidencias enviadas.</p>'}</div>`;
 // Evitar dos conversaciones distintas. El formulario original para crear incidencias permanece activo.
 const legacy=document.querySelector('.portalWrap > .card.section');
 if(legacy&&legacy.querySelector('h2')?.textContent==='Mis conversaciones')legacy.hidden=true;
}
async function edu16AskReward(rewardId){
 if(!confirm('¿Solicitar este premio al profesor? Los puntos no se descontarán hasta que lo apruebe.'))return;
 try{await edu16Rpc('educlass_v16_request_reward',{p_token:portalToken,p_reward:rewardId});await edu16RefreshStudent();alert('Solicitud enviada. Tu profesor decidirá si la aprueba.');}catch(e){edu16Msg(e);}
}
function edu16StudentToggleIncident(id){edu16IncidentOpen=edu16IncidentOpen===id?null:id;edu16StudentInterface();}
async function edu16StudentReply(id){const body=document.getElementById('edu16Reply_'+id)?.value.trim();if(!body)return;
 try{await edu16Rpc('student_reply_incident',{p_token:portalToken,p_incident:id,p_body:body});await edu16RefreshStudent();}catch(e){edu16Msg(e);}
}
const edu16OldPublicCard=publicCard;
publicCard=function(d){edu16OldPublicCard(d);edu16StudentData=null;edu16IncidentOpen=null;edu16RefreshStudent().catch(e=>console.warn('EduClass v16 · Espacio del alumno',e));};
const edu16OldSubmitIncident=submitIncident;
submitIncident=async function(){await edu16OldSubmitIncident();};

/* Guardián como avatar de la cabecera y XP siempre visibles. */
const edu16OldRenderStudentExtras=magicRenderStudentExtras;
magicRenderStudentExtras=function(){
 edu16OldRenderStudentExtras();
 if(!magicState.portal)return;
 const p=magicState.portal,g=magicGuardian(p.student_id,Number(p.xp||0));
 const portal=document.querySelector('.portalWrap');if(portal&&!portal.querySelector('#edu16HomeTop')){const home=document.createElement('div');home.className='edu16-home-top';home.innerHTML=`<button id="edu16HomeTop" class="button secondary" onclick="location.hash='#/inicio'">← Inicio EduClass</button>`;portal.insertBefore(home,portal.querySelector('.portalHero')||portal.firstChild);}
 const hero=document.querySelector('.portalWrap .portalHero');
 if(hero){hero.classList.add('edu16-hero');let avatar=hero.querySelector('.edu16-guardian');if(!avatar){avatar=document.createElement('div');avatar.className='edu16-guardian';hero.appendChild(avatar);}avatar.innerHTML=`<button type="button" onclick="magicZoomGuardian('${edu16Esc(g.image)}','${edu16Esc(magicGuardianLabel(g))}')" aria-label="Ampliar mi guardián"><img src="${edu16Esc(g.image)}" alt="${edu16Esc(magicGuardianLabel(g))}"></button><div><strong>${edu16Esc(magicGuardianLabel(g))}</strong><div>${edu16Esc(g.stage)} · ${Number(p.xp||0)} XP</div><div class="edu16-xpbar"><span style="width:${g.next?Math.min(100,100*Number(p.xp||0)/g.next):100}%"></span></div><small>${g.next?'Siguiente evolución: '+g.next+' XP':'¡Nivel máximo!'}</small></div>`;}
 const inner=document.querySelector('#magicStudentExtras .magic-head');if(inner)inner.classList.add('edu16-hide-guardian');
 edu16StudentMissionArchiveUI();
};
function edu16StudentMissionArchiveUI(){
 const root=document.getElementById('magicStudentExtras'),p=magicState.portal;
 if(!root||!p)return;
 const nav=root.querySelector('.magic-tabs');if(!nav)return;
 if(!nav.querySelector('#edu16ArchivedTab'))nav.insertAdjacentHTML('beforeend',`<button id="edu16ArchivedTab" class="${magicState.portalTab==='archive'?'active':''}" onclick="magicState.portalTab='archive';magicRenderStudentExtras()">📦 Misiones archivadas</button>`);
 const target=document.getElementById('magicPortalTab');if(!target)return;
 const archived=new Set(edu16StudentData?.archived_missions||[]);
 // El contador refleja solamente las misiones pendientes y visibles en la bandeja principal.
 const missionButton=nav.querySelector('button[onclick*="portalTab=\'missions\'"]');
 if(missionButton){const now=Date.now(),count=p.missions.filter(m=>!archived.has(m.id)&&m.published!==false&&!m.deleted_at&&(!m.publish_at||new Date(m.publish_at).getTime()<=now)&&(!m.due_at||new Date(m.due_at).getTime()>=now)&&!p.submissions.some(x=>x.mission_id===m.id)).length;missionButton.textContent=`📜 Misiones (${count} nuevas)`;}
 if(magicState.portalTab==='archive'){
  target.innerHTML=`<div class="magic-grid">${p.missions.filter(m=>archived.has(m.id)).map(m=>{const s=p.submissions.find(x=>x.mission_id===m.id);return `<div class="magic-tile"><h3>${edu16Esc(m.title)}</h3><p>${edu16Esc(m.instructions).slice(0,180)}</p>${magicStatusBadge(m,s)}<div class="toolbar"><button class="button secondary" onclick="edu16ArchiveMission('${m.id}',false)">↩ Volver a misiones</button></div></div>`}).join('')||'<p>No has archivado ninguna misión.</p>'}</div>`;
 } else if(magicState.portalTab==='missions'){
  const cards=[...target.querySelectorAll('.magic-mission-card')];p.missions.forEach((m,i)=>{
   const card=cards[i];if(!card)return;
   if(archived.has(m.id)){card.remove();return;}
   const btn=document.createElement('button');btn.className='button secondary edu16-archive-btn';btn.textContent='📦 Archivar';btn.onclick=()=>edu16ArchiveMission(m.id,true);card.appendChild(btn);
  });
 }
}
async function edu16ArchiveMission(id,arch){
 try{await edu16Rpc('educlass_v16_archive_mission',{p_token:portalToken,p_mission:id,p_archive:arch});await edu16RefreshStudent();magicRenderStudentExtras();}catch(e){edu16Msg(e);}
}

/* Misiones eliminadas: solo ocultación lógica, nunca DELETE sobre las entregas. */
const edu16OldTeacherMissions=magicTeacherMissions;
magicTeacherMissions=function(){const all=db.magic_missions;db.magic_missions=all.filter(x=>!x.deleted_at);try{return edu16OldTeacherMissions();}finally{db.magic_missions=all;}};
magicDeleteMission=async function(mid){const m=db.magic_missions.find(x=>x.id===mid);if(!m)return;
 if(!confirm('¿Retirar «'+m.title+'»? Desaparecerá de las misiones activas, pero conservará entregas, puntos, XP y datos para los informes.'))return;
 try{if(cloud){await edu16Rpc('archive_deleted_mission',{p_mission_id:mid});await loadRemote();}
 else{m.deleted_at=now();m.published=false;save();}toast('Misión retirada. El historial se conserva.');go('magic-missions');}catch(e){edu16Msg(e);}
};

/* Docente: bandeja compacta y solicitudes con aprobación. */
const edu16OldInbox=renderInbox;
renderInbox=function(){
 const rows=(db.incidents||[]).filter(i=>classStudentIds().has(i.student_id)).slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
 const open=rows.filter(i=>i.status==='abierta').length;
 return header('📩 Bandeja de incidencias',`${open} abiertas · ${rows.length} conversaciones`)+`<div class="card"><h2>Mensajes del alumnado</h2><p>Selecciona una incidencia para abrir la conversación completa.</p><div class="edu16-inbox">${rows.map(i=>{const messages=(db.messages||[]).filter(m=>m.incident_id===i.id).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));const last=messages[messages.length-1];return `<div class="edu16-incident"><button class="edu16-ticket-head" onclick="edu16OpenTeacherIncident('${i.id}')"><strong>${edu16Esc(nameOf(i.student_id))} · ${edu16Esc(i.subject)} ${i.status==='abierta'?'🔔':''}</strong><small>${edu16Esc(i.status)} · ${edu16Date(i.created_at)}</small><span>${edu16Esc(last?.body||'').slice(0,130)}</span></button>${edu16TeacherIncident===i.id?`<div class="edu16-chat">${messages.map(m=>`<div class="bubble ${m.sender==='teacher'?'teacherBubble':'studentBubble'}"><small>${m.sender==='teacher'?'Tú':'Alumno'} · ${edu16Date(m.created_at)}</small><p>${edu16Esc(m.body)}</p></div>`).join('')}<div class="row"><input id="tr_${i.id}" maxlength="2000" placeholder="Tu respuesta…" style="flex:1"><button class="button" onclick="teacherReply('${i.id}')">Responder</button><button class="button secondary" onclick="toggleTicket('${i.id}')">${i.status==='cerrada'?'Reabrir':'Cerrar'}</button></div></div>`:''}</div>`}).join('')||'<p>No hay incidencias.</p>'}</div></div>`;
};
function edu16OpenTeacherIncident(id){edu16TeacherIncident=edu16TeacherIncident===id?null:id;render();}
async function edu16DecideReward(id,approve){if(!confirm(approve?'¿Aprobar este premio y descontar sus puntos?':'¿Rechazar esta solicitud sin descontar puntos?'))return;
 try{await edu16Rpc('educlass_v16_decide_reward',{p_request:id,p_approve:approve});await loadRemote();render();toast(approve?'Premio aprobado y puntos descontados.':'Solicitud rechazada.');}catch(e){edu16Msg(e);}
}
function edu16RewardsTeacher(){const rows=db.edu16_requests||[],current=rows.filter(x=>classStudentIds().has(x.student_id));const pending=current.filter(x=>x.status==='pendiente');return `<div class="card section"><h2>🛎 Solicitudes de premios ${pending.length?'('+pending.length+' pendientes)':''}</h2><p>Los puntos se descuentan únicamente después de aprobar la solicitud.</p>${current.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).map(r=>`<div class="edu16-small-card"><div class="row between"><div><b>${edu16Esc(nameOf(r.student_id))}</b> · ${edu16Esc(r.reward_name)} · ${r.cost} puntos<br><small>${edu16Date(r.created_at)} · ${edu16Esc(r.status)}</small></div>${r.status==='pendiente'?`<div class="toolbar"><button class="button" onclick="edu16DecideReward('${r.id}',true)">Aprobar</button><button class="button secondary" onclick="edu16DecideReward('${r.id}',false)">Rechazar</button></div>`:''}</div></div>`).join('')||'<p>Sin solicitudes todavía.</p>'}</div>`;}
async function edu16FetchTeacherRequests(){if(!cloud||!session?.user?.id)return;const {data,error}=await api.from('educlass_reward_requests').select('*').eq('teacher_id',session.user.id);if(error){console.warn('Solicitudes v16:',error.message);return;}db.edu16_requests=data||[];}

/* Informes: expediente integral del alumno seleccionado, sin alterar el historial contable. */
function edu16StudentReport(){const s=db.students.find(x=>x.id===edu16ReportStudent&&x.class_id===currentClassId)||classStudents()[0];if(!s)return '<p>Sin alumnos en este módulo.</p>';edu16ReportStudent=s.id;
 const rows=(name)=>(db[name]||[]).filter(x=>x.student_id===s.id).slice().sort((a,b)=>String(b.created_at||b.day||'').localeCompare(String(a.created_at||a.day||'')));
 const moves=rows('movements'),redeems=rows('redemptions'),attendance=rows('attendance'),awards=rows('magic_manual_awards'),attempts=rows('magic_attempts'),subs=rows('magic_submissions'),requests=rows('edu16_requests');
 const totalXP=magicStudentXp(s.id),xpMovements=rows('magic_xp');
 return `<div class="card section"><h2>📊 Expediente individual · ${edu16Esc(s.name)}</h2><label>Seleccionar alumno<select onchange="edu16ReportStudent=this.value;render()">${classStudents().map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${edu16Esc(x.name)}</option>`).join('')}</select></label><div class="edu16-report-stats"><div><strong>${balance(s.id)}</strong><small>Saldo de puntos</small></div><div><strong>${totalXP}</strong><small>XP acumulados</small></div><div><strong>${attendance.filter(x=>x.state==='presente').length}</strong><small>Asistencias</small></div><div><strong>${redeems.length}</strong><small>Canjes</small></div></div><button class="button secondary" onclick="edu16PrintReport()">🖨 Imprimir / Guardar PDF</button><div id="edu16PrintableReport"><h2>EduClass · Informe individual de ${edu16Esc(s.name)}</h2><p>${edu16Date(new Date())} · ${edu16Esc(currentClass()?.name||'')}</p><h3>⭐ Historial de puntos y motivos</h3>${moves.map(x=>`<div class="eventLine"><span>${edu16Esc(x.reason)}<br><small>${edu16Date(x.created_at)}</small></span><b>${x.amount>0?'+':''}${x.amount}</b></div>`).join('')||'<p>Sin movimientos.</p>'}<h3>🎁 Premios canjeados</h3>${redeems.map(x=>`<div class="eventLine"><span>${edu16Esc(x.reward_name)} · ${edu16Esc(x.delivery_status)}<br><small>${edu16Date(x.created_at)}</small></span><b>-${x.cost} puntos</b></div>`).join('')||'<p>Sin canjes.</p>'}<h3>🛎 Solicitudes de premios</h3>${requests.map(x=>`<div class="eventLine"><span>${edu16Esc(x.reward_name)}<br><small>${edu16Date(x.created_at)}</small></span>${edu16Esc(x.status)}</div>`).join('')||'<p>Sin solicitudes.</p>'}<h3>📅 Asistencia y puntualidad</h3>${attendance.map(x=>`<div class="eventLine"><span>${edu16Esc(x.day)}</span><b>${edu16Esc(x.state)}</b></div>`).join('')||'<p>Sin registros.</p>'}<h3>🎮 Juegos</h3>${attempts.map(x=>{const g=db.magic_games.find(y=>y.id===x.game_id);return `<div class="eventLine"><span>${edu16Esc(g?.title||'Juego anterior')}<br><small>${edu16Date(x.created_at)}</small></span><b>${x.score}% · ${x.rewarded?'Premiado':'Sin premio'}</b></div>`}).join('')||'<p>Sin partidas.</p>'}<h3>📜 Misiones y correcciones (incluidas las retiradas)</h3>${subs.map(x=>{const m=db.magic_missions.find(y=>y.id===x.mission_id);return `<div class="eventLine"><span>${edu16Esc(m?.title||'Misión anterior')} ${m?.deleted_at?'· Retirada':''}<br><small>${edu16Date(x.created_at)} · ${edu16Esc(x.status)} · ${edu16Esc(x.feedback||'')}</small></span><b>+${x.points_awarded||0} puntos · +${x.xp_awarded||0} XP</b></div>`}).join('')||'<p>Sin entregas.</p>'}<h3>🐉 XP por misiones y juegos</h3>${xpMovements.map(x=>{const m=db.magic_missions.find(y=>y.id===x.mission_id),g=db.magic_games.find(y=>y.id===x.game_id);return `<div class="eventLine"><span>${edu16Esc(m?.title||g?.title||'Experiencia registrada')}<br><small>${edu16Date(x.created_at)}</small></span><b>+${x.amount} XP</b></div>`}).join('')||'<p>Sin movimientos XP.</p>'}<h3>🐉 Concesiones manuales y XP</h3>${awards.map(x=>`<div class="eventLine"><span>${edu16Esc(x.reason||'Concesión manual')}<br><small>${edu16Date(x.created_at)}</small></span><b>+${x.xp||0} XP</b></div>`).join('')||'<p>Sin concesiones manuales.</p>'}</div></div>`;
}
function edu16PrintReport(){const css=document.createElement('style');css.id='edu16PrintStyle';css.textContent='@media print{body *{visibility:hidden!important}#edu16PrintableReport,#edu16PrintableReport *{visibility:visible!important}#edu16PrintableReport{position:absolute;left:0;top:0;width:100%;padding:14mm}.eventLine{break-inside:avoid}}';document.head.appendChild(css);window.print();setTimeout(()=>css.remove(),1500);}

function edu16DecorateTeacher(){if(!session?.user?.id||!document.querySelector('.side'))return;
 const pending=(db.edu16_requests||[]).filter(x=>x.status==='pendiente').length;
 const incidents=(db.incidents||[]).filter(x=>x.status==='abierta').length;
 const navButtons=document.querySelectorAll('.side button');for(const b of navButtons){const click=b.getAttribute('onclick')||'';b.querySelector('.edu16-counter')?.remove();let count=click.includes("go('premios')")?pending:click.includes("go('incidencias')")?incidents:0;if(count)b.insertAdjacentHTML('beforeend',`<span class="edu16-counter">${count}</span>`);}
 const main=document.querySelector('.main');if(!main)return;
 if(page==='premios')main.insertAdjacentHTML('beforeend',edu16RewardsTeacher());
 if(page==='informes')main.insertAdjacentHTML('beforeend',edu16StudentReport());
}
const edu16OldRender=render;
render=function(){edu16OldRender();edu16DecorateTeacher();};
const edu16OldLoadRemote=loadRemote;
loadRemote=async function(){await edu16OldLoadRemote();await edu16FetchTeacherRequests();};
// Cargar solicitudes después de la primera apertura sin duplicar la carga general.
if(cloud&&session?.user?.id)edu16FetchTeacherRequests().then(()=>render()).catch(console.warn);
