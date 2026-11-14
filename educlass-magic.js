'use strict';
/* EduClass NFC v8 · Extensions for teacher and student. No external libraries. */
const MAGIC_KINDS={pasapalabra:'Pasapalabra',quiz:'Quiz mágico',parejas:'Parejas',escalera:'La Escalera del Saber',sopa:'Sopa de letras',clasifica:'Clasifica y conquista',ordena:'Ordena el hechizo',crucigrama:'Crucigrama'};
const MAGIC_ANIMALS=['Petauro aurora','Ratón chispa','León solar','Iguana jade','Zorro lunar','Fénix ámbar','Tortuga sabia','Pantera sombra','Camaleón prisma','Dragón de cristal','Serval del rayo','Pulpo abisal','Rana de cristal','Mantis orquídea','Caracal del ocaso','Ajolote coral','Pangolín dorado','Lémur nocturno','Fénec del desierto','Okapi del bosque','Búho estelar','Ciervo de luz','Gato astral','Dragón del bosque','Dragón de hielo','Grifo de las nubes','Dragón amatista','Cuervo obsidiana','Orca etérea','Tucán esmeralda'];
const MAGIC_STAGES=['Huevo misterioso','Despertar','Guardián joven','Guardián adulto','Guardián legendario'];
/* v11: Biografías breves; la identidad permanece secreta hasta la eclosión. */
const MAGIC_DESCRIPTIONS=[
'Un viajero del cielo nocturno que despliega sus alas con los colores de la aurora.',
'Pequeño guardián de la energía, capaz de iluminar los caminos con sus chispas.',
'Su melena guarda el resplandor del sol y da valor a quienes aprenden.',
'Protector de las raíces antiguas, cubierto por escamas de jade.',
'Explorador silencioso que encuentra senderos iluminados por la luna.',
'Renace de sus brasas y transforma el fuego en luz azul legendaria.',
'Sabia viajera de las aguas, con un caparazón que conserva historias.',
'Custodia secretos en la penumbra y se mueve entre sombras violetas.',
'Refleja todos los colores del conocimiento con sus escamas cambiantes.',
'Sus alas de cristal dispersan destellos como pequeñas constelaciones.',
'Veloz felino de tormenta que deja relámpagos a su paso.',
'Habitante del océano profundo, guía con destellos bioluminiscentes.',
'Criatura transparente que protege la armonía de los bosques húmedos.',
'Guardián floral cuyas alas recuerdan los pétalos de una orquídea.',
'Su mirada acompaña el último rayo de sol antes del anochecer.',
'Protector de los arrecifes que transforma las corrientes en luces suaves.',
'Sus escamas doradas forman una armadura de paciencia y fortaleza.',
'Acrobático explorador de la noche con una cola de anillos mágicos.',
'Pequeño zorro del desierto, amigo de los vientos y de las dunas.',
'Guardián del bosque secreto que luce rayas encantadas entre los árboles.',
'Observa las estrellas desde las alturas y descifra sus mensajes.',
'Sus astas iluminadas despiertan la vida en los claros del bosque.',
'Su pelaje astral brilla con nebulosas y diminutas estrellas.',
'Entre ramas y musgo, este dragón cuida los antiguos senderos verdes.',
'Guarda los copos de nieve en sus alas y respira aire cristalino.',
'Vuela sobre las nubes y protege los caminos del cielo.',
'Una criatura de gemas violetas que hace florecer cristales de amatista.',
'Sus plumas oscuras reflejan la luz como fragmentos de obsidiana.',
'Espíritu oceánico que deja estelas luminosas bajo las olas.',
'Mensajero de la selva, con un pico brillante como las esmeraldas.'
];
function magicGuardianLabel(g){return g.stageNumber===1?'Guardián misterioso':g.name;}
function magicGuardianDescription(g){return g.stageNumber===1?'Dentro de este huevo duerme un guardián mágico. Su identidad seguirá siendo un secreto hasta que alcance los 50 XP y nazca.':MAGIC_DESCRIPTIONS[g.idx]+' Cada nueva etapa revela más de su magia.';}
function magicGuessMime(name){const x=String(name||'').toLowerCase();return x.endsWith('.mov')?'video/quicktime':x.endsWith('.m4a')?'audio/mp4':x.endsWith('.mp4')?'video/mp4':x.endsWith('.webm')?'video/webm':'application/octet-stream';}
function magicAttachmentSize(bytes){return (bytes/1048576).toFixed(1)+' MB';}


/* v12: almacenamiento privado Supabase Storage, accesible a través de una función
   que comprueba la identidad y limita las transferencias. Sin bucket público. */
const MAGIC_V12_MB=1048576;
function magicLimitFor(mime){return mime.startsWith('video/')?50:mime.startsWith('image/')?20:mime.startsWith('audio/')?30:30;}
function magicNewFileSize(a){return a.file?.size||a.size||Math.floor(String(a.data||'').length*3/4);}
function magicStorageReady(){return cloud&&Boolean(CONFIG.url)&&Boolean(CONFIG.anonKey);}
async function magicMediaRequest(action,props={},file){
 if(!magicStorageReady())throw Error('Para archivos grandes hay que activar Supabase Storage y la función educlass-media.');
 const headers={apikey:CONFIG.anonKey};
 const student=Boolean(props.student_token);
 if(!student&&session?.access_token)headers.authorization='Bearer '+session.access_token;
 else headers.authorization='Bearer '+CONFIG.anonKey;
 if(!student&&!session?.access_token)throw Error('Accede como docente antes de gestionar archivos.');
 const body=file?new FormData():JSON.stringify({action,...props});
 if(file){body.append('action',action);for(let [k,v] of Object.entries(props))body.append(k,String(v));body.append('file',file);}
 else headers['Content-Type']='application/json';
 let res;try{res=await fetch(CONFIG.url.replace(/\/$/,'')+'/functions/v1/educlass-media',{method:'POST',headers,body});}catch(e){throw Error('No se pudo conectar con el almacenamiento: '+e.message);}
 let payload=await res.json().catch(()=>({error:'Respuesta de almacenamiento no válida'}));
 if(!res.ok)throw Error(payload.error||'Fallo en Storage ('+res.status+')');return payload;
}
async function magicMediaUpload(file,missionId,student=false){return magicMediaRequest('upload',{mission_id:missionId,...(student?{student_token:portalToken}:{})},file);}
async function magicMediaSigned(a,missionId,download=false,student=false){return (await magicMediaRequest('signed',{mission_id:missionId,path:a.storage_path,...(student?{student_token:portalToken}:{}),...(download?{download:true,name:a.name}: {})})).url;}
async function magicMediaDelete(a,missionId){return magicMediaRequest('delete',{mission_id:missionId,path:a.storage_path});}
async function magicMediaStats(){let target=document.querySelector('#magic-storage-stats');if(!target||!magicStorageReady())return;
 try{let s=await magicMediaRequest('stats');target.textContent='Almacenamiento del docente: '+(s.bytes/MAGIC_V12_MB).toFixed(1)+' MB / '+(s.quota/MAGIC_V12_MB).toFixed(0)+' MB ('+s.files+' archivos). Puedes liberar espacio quitando materiales antiguos de misiones que no tengan entregas.';}
 catch(e){target.textContent='No se pudo consultar el espacio: '+e.message;}}
async function magicAttachmentUrl(a,missionId,student=false){if(a.storage_path)return magicMediaSigned(a,missionId,false,student);const url=URL.createObjectURL(a.file||magicBlobFromAttachment(a));magicPreviewUrls.push(url);return url;}

const magicState={portal:null,selectedGame:null,answers:[],current:0,letters:{},pairs:[],matches:[],selectedPair:null,placements:{},drag:null,order:[],found:[],files:[],recorder:null,recordChunks:[],attemptDone:false,correctMessage:'',teacherEdit:null,missionEdit:null,portalTab:'games'};
function magicEnsure(){for(const k of ['magic_games','magic_attempts','magic_missions','magic_submissions','magic_xp','magic_manual_awards'])if(!Array.isArray(db[k]))db[k]=[];}
magicEnsure();
function magicNumber(v,min,max){const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:null;}
function magicSafe(s){return esc(String(s??''));}
function magicGuardian(studentId,xp){let h=0;for(const c of String(studentId||''))h=((h*31)+c.charCodeAt(0))>>>0;let idx=h%30;let stage=xp>=700?4:xp>=350?3:xp>=150?2:xp>=50?1:0;return {name:MAGIC_ANIMALS[idx],stage:MAGIC_STAGES[stage],stageNumber:stage+1,next:[50,150,350,700,null][stage],idx,image:'guardianes/avatars/'+idx+'-'+(stage+1)+'.jpg'};}
function magicStudentXp(studentId){return db.magic_xp.filter(x=>x.student_id===studentId).reduce((v,x)=>v+Number(x.amount||0),0)+(db.magic_manual_awards||[]).filter(x=>x.student_id===studentId).reduce((v,x)=>v+Number(x.xp||0),0);}
function magicTeacherTitle(title,sub){return `<div class="magic-head"><div><small class="eyebrow">✦ EDUCLASS · ACADEMIA MÁGICA</small><h1>${magicSafe(title)}</h1><p class="muted">${magicSafe(sub||'')}</p></div><span class="magic-chip">${magicSafe(currentClass()?.name||'Mi módulo')}</span></div>`;}
function magicTeacherOptions(selected){return db.classes.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${magicSafe(c.name)}</option>`).join('');}
function magicTeacherNav(){const nav=document.querySelector('.side .navItems');if(!nav)return;
 const added=[['magicNavMissions','magic-missions','📜','Misiones'],['magicNavGuardians','magic-guardians','🐉','Guardianes'],['magicNavGames','magic-games','🎮','Juegos Mágicos']];
 for(const [id,route,icon,label] of added){if(!document.getElementById(id))nav.insertAdjacentHTML('beforeend',`<button id="${id}" onclick="go('${route}')"><span class="navIcon">${icon}</span> ${label}</button>`);}
 const order=['inicio','clases','asistencia','magic-missions','magic-guardians','magic-games','puntos','motivos','alumnos','premios','informes','tarjetas','incidencias','ajustes'];
 const buttons=Array.from(nav.querySelectorAll('button'));for(const key of order){const found=buttons.find(b=>b.getAttribute('onclick')?.includes("go('"+key+"')"));if(found)nav.appendChild(found);}
 for(const [id,route] of added){let b=document.getElementById(id);if(b)b.classList.toggle('active',page===route);}
}
function magicTeacherPages(){magicEnsure();let out='';if(page==='magic-games'){out=magicTeacherGames();}else if(page==='magic-missions'){out=magicTeacherMissions();setTimeout(magicMediaStats,0);}else if(page==='magic-guardians'){out=magicTeacherGuardians();}shell(out);magicTeacherNav();}
let magicRemoteReady=false,magicRemotePending=false;
async function magicFetchRemote(){const tables=['magic_games','magic_missions','magic_attempts','magic_submissions','magic_xp','magic_manual_awards'];let requests=await Promise.all(tables.map(t=>api.from(t).select('*')));for(let i=0;i<tables.length;i++){if(requests[i].error){console.warn('EduClass v8: ejecuta juegos_misiones_guardianes_v8.sql',requests[i].error.message);db[tables[i]]=[];}else db[tables[i]]=requests[i].data;}magicEnsure();magicRemoteReady=true;}
const magicOriginalRender=render;
render=function(){if(cloud&&session&&!magicRemoteReady&&!magicRemotePending){magicRemotePending=true;magicFetchRemote().catch(console.warn).finally(()=>{magicRemotePending=false;magicRemoteReady=true;render();});}if(['magic-games','magic-missions','magic-guardians'].includes(page) && !location.hash.startsWith('#/ver/') && !(!session&&(cloud||!demoTeacher))){magicTeacherPages();return;}magicOriginalRender();magicTeacherNav();magicPendingNotice();};
function magicPendingNotice(){
 const n=db.magic_submissions?.filter(x=>x.status==='entregada'&&classStudentIds().has(x.student_id)).length||0;
 const bar=document.querySelector('.workspaceBar');
 if(n&&bar&&!document.getElementById('magicPendingNotice'))bar.insertAdjacentHTML('beforeend',`<button id="magicPendingNotice" class="magic-smallbutton" onclick="go('magic-missions')">📜 ${n} entrega${n===1?'':'s'} por corregir</button>`);
}
const magicOriginalLoad=loadRemote;
loadRemote=async function(){await magicOriginalLoad();await magicFetchRemote();};
function magicTeacherGames(){let gs=db.magic_games.filter(x=>x.class_id===currentClassId);let submissions=db.magic_attempts.filter(x=>gs.some(g=>g.id===x.game_id));return magicTeacherTitle('Juegos Mágicos','Crea desafíos, modifica preguntas y revisa las partidas.')+`<div class="toolbar"><button class="button" onclick="magicEditGame()">✦ Crear juego</button><span class="magic-chip">${gs.length} juegos · ${submissions.length} partidas</span></div><div class="magic-grid section">${gs.map(g=>{let a=submissions.filter(x=>x.game_id===g.id),rewarded=a.filter(x=>x.rewarded).length;return `<div class="magic-tile"><span class="magic-chip">${magicSafe(MAGIC_KINDS[g.kind]||g.kind)}</span><h3 style="margin-top:10px">${magicSafe(g.title)}</h3><p>${g.items.length} elementos · +${g.points} puntos · +${g.xp} XP · mínimo ${g.threshold}%</p><p><b>${a.length}</b> partidas · <b>${rewarded}</b> premios otorgados</p><div class="toolbar"><button class="button secondary" onclick="magicEditGame('${g.id}')">Editar</button><button class="button secondary" onclick="magicGameResults('${g.id}')">Resultados</button><button class="button ghost" onclick="magicPublishGame('${g.id}')">${g.published?'Ocultar':'Publicar'}</button></div></div>`}).join('')||'<div class="card empty">Todavía no hay juegos en este módulo.</div>'}</div>`;}
function magicItemTemplate(kind){return {q:'',answer:'',choices:kind==='quiz'||kind==='escalera'?['','','','']:[],letter:kind==='pasapalabra'?'A':''};}
function magicEditGame(gameId){magicEnsure();const g=db.magic_games.find(x=>x.id===gameId);magicState.teacherEdit={id:g?.id||null, title:g?.title||'',kind:g?.kind||'quiz',class_id:g?.class_id||currentClassId,points:g?.points??10,xp:g?.xp??20,threshold:g?.threshold??70,items:g?structuredClone(g.items):[magicItemTemplate('quiz')]};magicDrawGameEditor();}
function magicDrawGameEditor(){let g=magicState.teacherEdit;const options=Object.entries(MAGIC_KINDS).map(([k,v])=>`<option value="${k}" ${g.kind===k?'selected':''}>${magicSafe(v)}</option>`).join('');openModal(`<div class="magic-form"><label>Título<input id="mgTitle" maxlength="120" value="${magicSafe(g.title)}" placeholder="Ej. Repaso de SAAC"></label><label>Plantilla<select id="mgKind" onchange="magicKindChanged(this.value)">${options}</select></label><label>Módulo<select id="mgClass">${magicTeacherOptions(g.class_id)}</select></label><div class="magic-two"><label>Puntos máximos<input id="mgPoints" type="number" min="0" max="500" value="${g.points}"></label><label>XP máximos<input id="mgXp" type="number" min="0" max="500" value="${g.xp}"></label></div><label>Porcentaje mínimo de aciertos<input id="mgThreshold" type="number" min="1" max="100" value="${g.threshold}"></label><p class="magic-mini">Los premios se entregan una única vez. Las modificaciones importantes de un juego publicado con intentos crearán una nueva versión del desafío para preservar el historial.</p><h3>Preguntas y elementos</h3><div id="magicEditorItems" class="magic-questions"></div><button class="button secondary width" onclick="magicAddItem()">+ Añadir elemento</button><button class="button width" onclick="magicSaveGame()">Guardar juego</button></div>`);const box=document.querySelector('#modal .modal');if(box)box.style.maxWidth='730px';magicDrawItems();}
function magicKeepEditor(){let g=magicState.teacherEdit;for(const [prop,id] of [['title','mgTitle'],['kind','mgKind'],['class_id','mgClass'],['points','mgPoints'],['xp','mgXp'],['threshold','mgThreshold']]){const node=document.getElementById(id);if(node)g[prop]=node.value;}g.items.forEach((it,i)=>{for(const [p,suff] of [['q','q'],['answer','a'],['letter','l']]){const e=document.getElementById(`mg_${suff}_${i}`);if(e)it[p]=e.value;}let ch=document.getElementById(`mg_c_${i}`);if(ch)it.choices=ch.value.split('\n').map(v=>v.trim()).filter(Boolean);});}
function magicKindChanged(k){magicKeepEditor();let g=magicState.teacherEdit;g.kind=k;g.items=[magicItemTemplate(k)];magicDrawItems();}
function magicDrawItems(){let g=magicState.teacherEdit;const node=document.getElementById('magicEditorItems');if(!node)return;node.innerHTML=g.items.map((it,i)=>{let kind=g.kind;let qlabel=kind==='sopa'?'Palabra a encontrar':kind==='clasifica'?'Palabra o frase a clasificar':kind==='parejas'?'Primera ficha':kind==='ordena'?'Paso en el orden correcto':kind==='crucigrama'?'Pista':kind==='pasapalabra'?'Definición':'Pregunta';let alabel=kind==='clasifica'?'Categoría correcta':kind==='parejas'?'Ficha correspondiente':kind==='sopa'?'Palabra (escríbela también como respuesta)':kind==='ordena'?'Repite exactamente el texto del paso':kind==='crucigrama'?'Solución':'Respuesta correcta';return `<div class="magic-question"><div class="row between"><strong>${i+1}. ${magicSafe(qlabel)}</strong><button class="magic-smallbutton" onclick="magicRemoveItem(${i})">Eliminar</button></div>${kind==='pasapalabra'?`<label>Letra<input id="mg_l_${i}" maxlength="2" value="${magicSafe(it.letter||'')}" placeholder="A"></label>`:''}<label>${magicSafe(qlabel)}<input id="mg_q_${i}" maxlength="500" value="${magicSafe(it.q||'')}"></label><label>${magicSafe(alabel)}<input id="mg_a_${i}" maxlength="500" value="${magicSafe(it.answer||'')}"></label>${['quiz','escalera'].includes(kind)?`<label>Opciones visibles (una por línea; incluye la correcta)<textarea id="mg_c_${i}" rows="4">${magicSafe((it.choices||[]).join('\n'))}</textarea></label>`:''}</div>`}).join('');}
function magicAddItem(){magicKeepEditor();if(magicState.teacherEdit.items.length>=100)return alert('Máximo 100 elementos por juego.');magicState.teacherEdit.items.push(magicItemTemplate(magicState.teacherEdit.kind));magicDrawItems();}
function magicRemoveItem(i){magicKeepEditor();if(magicState.teacherEdit.items.length<=1)return alert('Debe quedar al menos un elemento.');magicState.teacherEdit.items.splice(i,1);magicDrawItems();}
async function magicSaveGame(){magicKeepEditor();let g=magicState.teacherEdit;let p=magicNumber(g.points,0,500),xp=magicNumber(g.xp,0,500),th=magicNumber(g.threshold,1,100);if(!g.title.trim()||p===null||xp===null||th===null||!g.items.length||g.items.some(it=>!it.q.trim()||!it.answer.trim()))return alert('Completa título, puntuaciones y todas las preguntas y respuestas.');if(['quiz','escalera'].includes(g.kind)&&g.items.some(it=>!(it.choices||[]).includes(it.answer)))return alert('La respuesta correcta debe aparecer entre las opciones.');if(g.kind==='pasapalabra'&&g.items.some(it=>!it.letter))return alert('Indica la letra de cada pista.');if(g.kind==='sopa'&&(g.items.length>12||g.items.some(it=>it.answer.trim().toUpperCase().replace(/[^A-ZÑ]/g,'').length>12||it.q.trim().toUpperCase().replace(/[^A-ZÑ]/g,'')!==it.answer.trim().toUpperCase().replace(/[^A-ZÑ]/g,''))))return alert('Sopa de letras: máximo 12 palabras, de hasta 12 letras, y la respuesta debe coincidir con la palabra.');if(g.kind==='parejas'&&new Set(g.items.map(it=>it.answer.trim().toLowerCase())).size!==g.items.length)return alert('Cada pareja debe tener una ficha de respuesta distinta.');let old=db.magic_games.find(x=>x.id===g.id),hasAttempts=old&&db.magic_attempts.some(a=>a.game_id===old.id);let newVersion=!!(old&&old.published&&hasAttempts);if(newVersion&&!confirm('Este juego tiene partidas registradas. Se creará una copia nueva para preservar los resultados anteriores. ¿Continuar?'))return;let record={id:newVersion||!g.id?id():g.id,teacher_id:cloud?session.user.id:undefined,class_id:g.class_id,title:g.title.trim(),kind:g.kind,items:g.items,points:p,xp,threshold:th,published:newVersion?false:old?.published||false,version:newVersion?(old.version||1)+1:old?.version||1,created_at:newVersion||!old?now():old.created_at};try{await mutate('magic_games',record,old&&!newVersion?'update':'insert');closeModal();toast(newVersion?'Nueva versión creada sin alterar las partidas.':'Juego guardado.');go('magic-games');}catch(e){alert(e.message)}}
async function magicPublishGame(idValue){let g=db.magic_games.find(x=>x.id===idValue);if(!g)return;try{await mutate('magic_games',{...g,published:!g.published},'update');toast(!g.published?'Juego publicado.':'Juego ocultado.');go('magic-games');}catch(e){alert(e.message)}}
function magicGameResults(idValue){let g=db.magic_games.find(x=>x.id===idValue);let rows=db.magic_attempts.filter(a=>a.game_id===idValue).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));openModal(`<h3>${magicSafe(g?.title||'Resultados')}</h3><p>${rows.length} partidas · ${new Set(rows.map(a=>a.student_id)).size} participantes</p><p class="magic-mini">Sin jugar: ${db.students.filter(s=>s.class_id===g.class_id&&!rows.some(a=>a.student_id===s.id)).map(s=>magicSafe(s.name)).join(', ')||'Nadie'}</p><div class="tablewrap"><table class="tbl"><thead><tr><th>Estudiante</th><th>Aciertos</th><th>Puntuación</th><th>Premio</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${magicSafe(nameOf(a.student_id))}</td><td>${a.correct_count}/${a.total_count}</td><td>${a.score}%</td><td>${a.rewarded?'Sí':'No'}</td></tr>`).join('')||'<tr><td colspan="4">Sin partidas todavía</td></tr>'}</tbody></table></div>`);}
function magicTeacherMissions(){let ms=db.magic_missions.filter(m=>m.class_id===currentClassId);let sb=db.magic_submissions.filter(x=>ms.some(m=>m.id===x.mission_id));return magicTeacherTitle('Misiones y tareas','Actividades sencillas con entrega, aviso y corrección.')+`<div class="toolbar"><button class="button" onclick="magicEditMission()">+ Crear misión</button><span class="magic-chip">${ms.length} misiones · ${sb.filter(s=>s.status==='entregada').length} pendientes de corregir</span></div><p class="magic-mini" id="magic-storage-stats">${cloud?'Consultando espacio disponible…':'Demo local: archivos pequeños solamente'}</p><div class="magic-grid section">${ms.map(m=>{let ss=sb.filter(s=>s.mission_id===m.id);return `<div class="magic-tile"><h3>${magicSafe(m.title)}</h3><p>${magicSafe(m.instructions).slice(0,160)}</p><p>${ss.length} entregas · ${ss.filter(s=>s.status==='entregada').length} pendientes</p><p>+${m.points} puntos · +${m.xp} XP</p><div class="toolbar"><button class="button secondary" onclick="magicEditMission('${m.id}')">Editar</button><button class="button secondary" onclick="magicMissionResults('${m.id}')">Entregas</button><button class="button ghost" onclick="magicPublishMission('${m.id}')">${m.published?'Ocultar':'Publicar'}</button></div></div>`}).join('')||'<div class="card empty">Todavía no hay misiones.</div>'}</div>`;}
function magicEditMission(mid){let m=db.magic_missions.find(x=>x.id===mid),hasSubmit=m&&db.magic_submissions.some(x=>x.mission_id===mid);if(m&&hasSubmit){alert('Esta misión ya tiene entregas. Para conservar el historial, crea una nueva misión si necesitas cambiar su contenido.');return;}magicState.missionEdit=m?.id||null;magicState.teacherFiles=structuredClone(m?.materials||[]);openModal(`<div class="magic-form"><label>Título<input id="msTitle" value="${magicSafe(m?.title||'')}" maxlength="120"></label><label>Instrucciones<textarea id="msInstructions" maxlength="10000">${magicSafe(m?.instructions||'')}</textarea></label><label>Módulo<select id="msClass">${magicTeacherOptions(m?.class_id||currentClassId)}</select></label><label>Fecha límite (opcional)<input id="msDue" type="datetime-local" value="${m?.due_at?magicSafe(m.due_at.slice(0,16)):''}"></label><div class="magic-two"><label>Puntos máximos<input id="msPoints" type="number" min="0" max="500" value="${m?.points??10}"></label><label>XP máximos<input id="msXp" type="number" min="0" max="500" value="${m?.xp??20}"></label></div><label>Material de apoyo para el alumnado (imágenes, vídeos, audio, PDF, documentos)<input type="file" accept="image/*,video/*,audio/*,.pdf,.txt" multiple onchange="magicAddTeacherMaterials(this)"></label><div id="magicTeacherMaterials" class="magic-upload-list"></div><p class="magic-mini">Con Supabase Storage: hasta 50 MB por vídeo, 20 MB por imagen, 30 MB por audio o documento y 200 MB por misión. Máximo 3 archivos. Los materiales quedan en un espacio privado. La demo local solo admite archivos pequeños.</p><p class="magic-mini">El alumnado puede enviar hasta 3 archivos. Los archivos se subirán a Storage antes de confirmar la entrega. Solo aparecerá Entregada cuando el servidor guarde la misión.</p><button class="button" onclick="magicSaveMission()">Guardar misión</button></div>`);magicDrawTeacherMaterials();}
async function magicAddTeacherMaterials(input){
 magicState.teacherFiles ||= [];
 for(const f of Array.from(input.files||[])){
  if(magicState.teacherFiles.length>=3){alert('Máximo tres materiales.');break;}
  let mime=(f.type||magicGuessMime(f.name)).split(';')[0];
  if(!magicMediaAllowed(mime)){alert('Formato no permitido: '+f.name);continue;}
  if(f.size>magicLimitFor(mime)*MAGIC_V12_MB){alert(f.name+' supera '+magicLimitFor(mime)+' MB');continue;}
  const total=magicState.teacherFiles.reduce((n,x)=>n+magicNewFileSize(x),0)+f.size;
  if(total>200*MAGIC_V12_MB){alert('Máximo 200 MB por misión');continue;}
  if(!cloud&&total>2*MAGIC_V12_MB){alert('La demo local admite hasta 2 MB de materiales en total. Activa Supabase Storage para archivos grandes.');continue;}
  magicState.teacherFiles.push(cloud?{name:f.name.slice(0,150),mime,size:f.size,file:f}:{name:f.name.slice(0,150),mime,data:await magicToBase64(f)});
 }
 input.value='';magicDrawTeacherMaterials();
}
function magicMediaAllowed(t){return ['image/png','image/jpeg','image/webp','image/gif','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/x-m4a','video/webm','video/mp4','video/quicktime','application/pdf','text/plain'].includes(t);}

function magicDrawTeacherMaterials(){
 let box=document.getElementById('magicTeacherMaterials');if(!box)return;
 box.innerHTML=(magicState.teacherFiles||[]).map((f,i)=>`<div class="magic-file-row">📎 ${magicSafe(f.name)} <button class="magic-smallbutton" onclick="magicState.teacherFiles.splice(${i},1);magicDrawTeacherMaterials()">Quitar</button></div>`).join('')||'<p class="magic-mini">Todavía no has añadido materiales.</p>';
}
async function magicSaveMission(){
 const title=$('#msTitle').value.trim(),instructions=$('#msInstructions').value,pts=magicNumber($('#msPoints').value,0,500),xp=magicNumber($('#msXp').value,0,500),class_id=$('#msClass').value,due=$('#msDue').value;
 if(!title||pts===null||xp===null)return alert('Completa título y puntuaciones válidas.');
 const old=db.magic_missions.find(m=>m.id===magicState.missionEdit);
 const mid=old?.id||id();const files=[...(magicState.teacherFiles||[])];
 const oldFiles=old?.materials||[];
 const payload={id:mid,teacher_id:cloud?session.user.id:undefined,class_id,title,instructions,materials:cloud?files.filter(f=>!f.file):files,points:pts,xp,due_at:due?new Date(due).toISOString():null,published:old?.published||false,created_at:old?.created_at||now()};
 const button=document.querySelector('#msTitle')?.closest('.magic-form')?.querySelector('.button:last-child');if(button){button.disabled=true;button.textContent='Guardando materiales…';}
 try{
  if(cloud){
   await mutate('magic_missions',payload,old?'update':'insert');
   for(const f of files.filter(x=>x.file)){const ref=await magicMediaUpload(f.file,mid);payload.materials.push(ref);}
   if(files.some(x=>x.file))await mutate('magic_missions',payload,'update');
   const kept=new Set(payload.materials.filter(x=>x.storage_path).map(x=>x.storage_path));
   for(const removed of oldFiles.filter(x=>x.storage_path&&!kept.has(x.storage_path))){try{await magicMediaDelete(removed,mid);}catch(e){console.warn('Archivo antiguo pendiente de limpieza',e);}}
  }else await mutate('magic_missions',payload,old?'update':'insert');
  closeModal();toast('Misión guardada y materiales confirmados.');go('magic-missions');
 }catch(e){alert('No se pudo completar el guardado: '+e.message+'. Si ya se creó una misión vacía, puedes editarla e intentar la subida de nuevo.');if(button){button.disabled=false;button.textContent='Guardar misión';}}
}

async function magicPublishMission(mid){let m=db.magic_missions.find(x=>x.id===mid);try{await mutate('magic_missions',{...m,published:!m.published},'update');toast('Publicación actualizada.');go('magic-missions');}catch(e){alert(e.message)}}
/* Reproductor de adjuntos v10: blobs nativos, sin data: URL gigantes en la etiqueta video. */
let magicPreviewUrls=[];
function magicClosePreviewUrls(){magicPreviewUrls.forEach(u=>URL.revokeObjectURL(u));magicPreviewUrls=[];}
function magicBlobFromAttachment(a){
 const mime=String(a?.mime||'application/octet-stream').split(';')[0];
 const b64=String(a?.data||'').replace(/[^A-Za-z0-9+/=]/g,'');
 if(!b64)throw Error('Este adjunto no contiene datos de vídeo/audio.');
 const bytes=[];const step=32768;
 for(let i=0;i<b64.length;i+=step){let part=atob(b64.slice(i,i+step));let arr=new Uint8Array(part.length);for(let j=0;j<part.length;j++)arr[j]=part.charCodeAt(j);bytes.push(arr);}
 return new Blob(bytes,{type:mime});
}
function magicAttachmentPreview(a,i){
 const mime=String(a.mime||''),name=magicSafe(a.name);
 let player=mime.startsWith('video/')?`<video class="magic-media" data-magic-player="${i}" controls playsinline preload="metadata"></video>`:
   mime.startsWith('audio/')?`<audio class="magic-media" data-magic-player="${i}" controls preload="metadata"></audio>`:
   mime.startsWith('image/')?`<img class="magic-media" data-magic-player="${i}" alt="${name}" loading="lazy">`:'';
 return `<div class="magic-tile"><b>📎 ${name}</b><br><small>${magicSafe(mime)}</small>${player}<p class="magic-mini" id="magicMediaError${i}" role="status"></p><div class="toolbar"><a class="button secondary" data-magic-download="${i}" download="${name}">⬇ Descargar archivo</a> <button class="button secondary" onclick="magicPlayAttachment(${i})">▶ Reproducir / abrir</button></div></div>`;
}
async function magicMountAttachmentPlayers(attachments,mid){
 magicClosePreviewUrls();
 for(const [i,a] of (attachments||[]).entries()){
  let media=document.querySelector(`[data-magic-player="${i}"]`);
  let err=document.getElementById('magicMediaError'+i);
  try{
   const url=await magicAttachmentUrl(a,mid);
   if(media){media.src=url;media.load?.();}const download=document.querySelector(`[data-magic-download="${i}"]`);if(download){download.href=a.storage_path?await magicMediaSigned(a,mid,true):url;download.download=a.name||"adjunto";}
   if(media&&(media.tagName==='VIDEO'||media.tagName==='AUDIO')){
    media.addEventListener('error',()=>{if(err)err.textContent='No se puede reproducir aquí. Puede deberse al formato/códec del vídeo, al navegador o a un archivo incompleto. Descárgalo para probar con un reproductor compatible.';});
   }
  }catch(e){if(err)err.textContent='No se pudo preparar el adjunto: '+e.message;}
 }
}
let magicMaterialsUrls=[];
function magicMaterialHtml(items,prefix){
 if(!items.length)return '<p class="magic-mini">Sin material adjunto.</p>';
 return items.map((a,i)=>{let t=String(a.mime||'');let media=t.startsWith('video/')?`<video class="magic-media" controls playsinline preload="metadata" data-material="${prefix}-${i}"></video>`:t.startsWith('audio/')?`<audio class="magic-media" controls data-material="${prefix}-${i}"></audio>`:t.startsWith('image/')?`<img class="magic-media" alt="${magicSafe(a.name)}" data-material="${prefix}-${i}">`:'';
 return `<div class="magic-tile"><b>📎 ${magicSafe(a.name)}</b>${media}<p class="magic-mini" data-material-error="${prefix}-${i}"></p><button class="button secondary" onclick="magicDownloadMaterial('${prefix}',${i})">⬇ Descargar</button></div>`;}).join('');
}
async function magicMountMaterials(items,prefix,mid){
 magicMaterialsUrls.forEach(u=>URL.revokeObjectURL(u));magicMaterialsUrls=[];
 window.magicCurrentMaterials=items||[];window.magicCurrentMissionId=mid;
 for(const [i,a] of (items||[]).entries()){let el=document.querySelector(`[data-material="${prefix}-${i}"]`);if(!el)continue;try{let u=await magicAttachmentUrl(a,mid,prefix==='mission');el.src=u;if(el.tagName==='VIDEO'||el.tagName==='AUDIO'){el.load();el.addEventListener('error',()=>{const err=document.querySelector(`[data-material-error="${prefix}-${i}"]`);if(err)err.textContent='Formato o códec no compatible en este navegador. Descarga el archivo o usa MP4 H.264/AAC.';});}}catch(e){let err=document.querySelector(`[data-material-error="${prefix}-${i}"]`);if(err)err.textContent=e.message;}}
}
async function magicDownloadMaterial(prefix,index){
 let a=window.magicCurrentMaterials?.[index];if(!a)return;
 try{const mid=window.magicCurrentMissionId;if(!mid)throw Error('Misión no seleccionada');
  const u=a.storage_path?await magicMediaSigned(a,mid,true,prefix==='mission'):URL.createObjectURL(magicBlobFromAttachment(a));
  const link=document.createElement('a');link.href=u;link.download=a.name||'material';link.target='_blank';link.rel='noopener';document.body.append(link);link.click();link.remove();if(!a.storage_path)setTimeout(()=>URL.revokeObjectURL(u),60000);
 }catch(e){alert('No se pudo descargar: '+e.message);}
}

function magicMissionStatus(m,submission){
 if(submission?.status==='corregida')return {label:'Corregida',cls:'magic-status-corrected'};
 if(submission)return {label: m?.due_at&&submission.created_at>m.due_at?'Entregada fuera de plazo':'Entregada',cls:'magic-status-delivered'};
 if(m?.due_at&&new Date(m.due_at).getTime()<Date.now())return {label:'No entregada · plazo vencido',cls:'magic-status-missing'};
 return {label:'Pendiente / en proceso',cls:'magic-status-pending'};
}
function magicStatusBadge(m,submission){let x=magicMissionStatus(m,submission);return `<span class="magic-state ${x.cls}">${magicSafe(x.label)}</span>`;}
function magicMissionResults(mid){let m=db.magic_missions.find(x=>x.id===mid);let rows=db.magic_submissions.filter(s=>s.mission_id===mid).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));let absent=db.students.filter(s=>s.class_id===m.class_id&&!rows.some(x=>x.student_id===s.id));openModal(`<h3>${magicSafe(m.title)} · Entregas</h3><h4>Material proporcionado</h4><div class="magic-grid" id="magicTeacherMaterialsPreview">${magicMaterialHtml(m.materials||[],'teacher')}</div><p><b>${rows.length}</b> entregadas · <b>${absent.length}</b> pendientes · <b>${rows.filter(x=>m.due_at&&x.created_at>m.due_at).length}</b> fuera de plazo</p>${rows.map(s=>`<div class="magic-question"><b>${magicSafe(nameOf(s.student_id))}</b> ${magicStatusBadge(m,s)}<div class="magic-mini">${magicSafe(fmt(s.created_at))}${m.due_at&&s.created_at>m.due_at?' · Fuera de plazo':''}</div><p style="white-space:pre-wrap">${magicSafe(s.answer)}</p><p>${(s.attachments||[]).length} adjuntos</p><button class="button secondary" onclick="magicReviewOpen('${s.id}')">${s.status==='corregida'?'Ver corrección':'Revisar y corregir'}</button></div>`).join('')||'<p>Sin entregas todavía.</p>'}<h3>Sin entregar</h3><div class="magic-status-list">${absent.map(s=>`<div class="magic-question">${magicSafe(s.name)} ${magicStatusBadge(m,null)}</div>`).join('')||'Nadie pendiente'}</div>`);const box=document.querySelector('#modal .modal');if(box)box.style.maxWidth='760px';magicMountMaterials(m.materials||[],'teacher',m.id);}
function magicReviewOpen(sid){let s=db.magic_submissions.find(x=>x.id===sid),m=db.magic_missions.find(x=>x.id===s.mission_id);closeModal();openModal(`<h3>${magicSafe(nameOf(s.student_id))} · ${magicSafe(m.title)}</h3><p style="white-space:pre-wrap">${magicSafe(s.answer)}</p><div class="magic-grid">${(s.attachments||[]).map(magicAttachmentPreview).join('')}</div>${s.status==='corregida'?`<div class="magic-result">Corregida · ${magicSafe(s.feedback)} · +${s.points_awarded} puntos · +${s.xp_awarded} XP</div>`:`<div class="magic-form section"><label>Comentario para el alumno<textarea id="mrFeedback"></textarea></label><div class="magic-two"><label>Puntos (máx. ${m.points})<input id="mrPoints" type="number" value="${m.points}" min="0" max="${m.points}"></label><label>XP (máx. ${m.xp})<input id="mrXp" type="number" value="${m.xp}" min="0" max="${m.xp}"></label></div><button class="button" onclick="magicReviewSave('${sid}')">Corregir y enviar valoración</button></div>`}`);window.magicReviewFileSid=sid;magicMountAttachmentPlayers(s.attachments||[],m.id);}
function magicPlayAttachment(i){
 const el=document.querySelector(`[data-magic-player="${i}"]`);
 if(!el)return magicViewFile(i);
 if(el.tagName==='AUDIO'||el.tagName==='VIDEO'){el.play().catch(()=>{alert('Este navegador no puede reproducir el formato. Utiliza el enlace Descargar archivo para abrirlo con otra aplicación.');});}
 else if(el.src)window.open(el.src,'_blank','noopener');
}
function magicViewFile(i){
 let s=db.magic_submissions.find(x=>x.id===window.magicReviewFileSid);let a=s?.attachments?.[Number(i)];if(!a)return;
 try{const saved=document.querySelector(`[data-magic-download=\"${Number(i)}\"]`);if(saved?.href){saved.click();return;}const url=a.storage_path?null:URL.createObjectURL(magicBlobFromAttachment(a)),link=document.createElement('a');if(a.storage_path){alert('El archivo está preparándose. Pulsa Descargar archivo cuando esté disponible.');return;}link.href=url;link.download=a.name||'archivo';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){alert('No se pudo descargar el archivo: '+e.message);}
}
async function magicReviewSave(sid){let s=db.magic_submissions.find(x=>x.id===sid),m=db.magic_missions.find(x=>x.id===s.mission_id),pts=magicNumber($('#mrPoints').value,0,m.points),xp=magicNumber($('#mrXp').value,0,m.xp),feedback=$('#mrFeedback').value;if(pts===null||xp===null)return alert('Puntuaciones no válidas.');try{if(cloud){let {error}=await api.rpc('magic_review_submission',{p_submission:sid,p_feedback:feedback,p_points:pts,p_xp:xp});if(error)throw Error(error.message);await loadRemote();}else{if(s.status==='corregida')throw Error('Esta entrega ya está corregida.');Object.assign(s,{status:'corregida',feedback,points_awarded:pts,xp_awarded:xp,reviewed_at:now()});if(pts)db.movements.push({id:id(),student_id:s.student_id,amount:pts,reason:'Misión: '+m.title,created_at:now()});db.magic_xp.push({id:id(),student_id:s.student_id,mission_id:m.id,amount:xp,created_at:now()});save();}closeModal();toast('Corrección registrada y disponible para el alumno.');go('magic-missions');}catch(e){alert(e.message)}}
function magicTeacherGuardians(){let s=classStudents();return magicTeacherTitle('Guardianes Mágicos','XP acumulativo: los canjes no hacen retroceder las evoluciones.')+`<div class="magic-grid">${s.map(st=>{let xp=magicStudentXp(st.id),g=magicGuardian(st.id,xp);return `<div class="magic-tile"><h3>${magicSafe(st.name)}</h3><button class="magic-guardian-zoom" onclick="magicZoomGuardian('${magicSafe(g.image)}','${magicSafe(magicGuardianLabel(g))}')" title="Ampliar guardián"><img class="magic-avatar" src="${magicSafe(g.image)}" alt="${magicSafe(magicGuardianLabel(g))}" loading="lazy"><span>🔎 Ampliar</span></button><p>✦ ${magicSafe(magicGuardianLabel(g))}</p><div class="magic-guardian-stage">${magicSafe(g.stage)}</div><p>${xp} XP ${g.next?'· Próximo nivel: '+g.next+' XP':'· Nivel máximo'}</p></div>`}).join('')||'<p>Sin estudiantes en el módulo.</p>'}</div><div class="magic-panel section"><h2>Galería de Guardianes aprobada</h2>${magicGallery()}</div>`;}
function magicGallery(){return `<p class="magic-mini">Las seis láminas aprobadas se han recortado en 150 imágenes individuales (30 guardianes × 5 etapas) para mostrarlas en los perfiles. Revisa la selección antes de publicar la versión definitiva.</p><div class="magic-gallery">${[1,2,3,4,5,6].map(n=>`<a href="guardianes/lamina-${n}.png" target="_blank" rel="noopener"><img src="guardianes/lamina-${n}.png" alt="Lámina ${n} de guardianes mágicos" loading="lazy"></a>`).join('')}</div>`;}
/* STUDENT PORTAL: append authenticated-by-NFC-token activities to original public profile. */
const magicOriginalPublicCard=publicCard;
publicCard=function(d){magicOriginalPublicCard(d);magicShowStudent(d).catch(e=>{let el=document.getElementById('magicStudentExtras');if(el)el.innerHTML=`<div class="magic-notice">No se pudieron cargar juegos y misiones. ${magicSafe(e.message)}. Comprueba la migración SQL v8.</div>`;});};
async function magicShowStudent(d){const root=document.querySelector('.portalWrap');if(!root)return;root.querySelector('#magicStudentExtras')?.remove();(root.querySelector('.portalHero')||root).insertAdjacentHTML(root.querySelector('.portalHero')?'afterend':'beforeend','<section id="magicStudentExtras" class="section"><div class="magic-panel">Cargando Juegos Mágicos y misiones…</div></section>');let ex;
 if(cloud){const {data,error}=await api.rpc('magic_student_space',{p_token:portalToken});if(error)throw Error(error.message);if(!data)throw Error('Tarjeta no reconocida');ex=data;}
 else {const st=db.students.find(s=>s.card_token===portalToken);if(!st)throw Error('Estudiante no encontrado');magicEnsure();const games=db.magic_games.filter(g=>g.published&&g.class_id===st.class_id).map(g=>({id:g.id,kind:g.kind,title:g.title,points:g.points,xp:g.xp,threshold:g.threshold,version:g.version,items:g.items.map(it=>({q:it.q,letter:it.letter,choices:it.choices||[]})),options:['parejas','clasifica'].includes(g.kind)?[...new Set(g.items.map(it=>it.answer))]:[]}));ex={student_id:st.id,games,attempts:db.magic_attempts.filter(a=>a.student_id===st.id),missions:db.magic_missions.filter(m=>m.class_id===st.class_id&&m.published),submissions:db.magic_submissions.filter(x=>x.student_id===st.id).map(s=>({id:s.id,mission_id:s.mission_id,status:s.status,feedback:s.feedback,points_awarded:s.points_awarded,xp_awarded:s.xp_awarded,created_at:s.created_at})),xp:magicStudentXp(st.id)};}
 magicState.portal=ex;magicRenderStudentExtras();}
function magicRenderStudentExtras(){let el=document.getElementById('magicStudentExtras'),p=magicState.portal;if(!el||!p)return;const g=magicGuardian(p.student_id,Number(p.xp||0));let newTasks=p.missions.filter(m=>!p.submissions.some(s=>s.mission_id===m.id)).length;el.innerHTML=`<div class="magic-panel"><div class="magic-head"><div><span class="eyebrow">✦ MI AVENTURA MÁGICA</span><h2 style="color:#7c2840;font-family:Georgia,serif;margin:6px 0">Mi Guardián: ${magicSafe(magicGuardianLabel(g))}</h2><div class="magic-guardian-stage">${magicSafe(g.stage)} · ${p.xp||0} XP</div><p class="magic-mini">${g.next?'Próxima evolución a los '+g.next+' XP':'¡Has alcanzado la etapa legendaria!'}</p></div><button class="magic-guardian-zoom" onclick="magicZoomGuardian('${magicSafe(g.image)}','${magicSafe(magicGuardianLabel(g))}')" title="Ampliar guardián"><img class="magic-avatar" style="width:130px" src="${magicSafe(g.image)}" alt="${magicSafe(magicGuardianLabel(g))}"><span>🔎 Ampliar imagen</span></button></div><div class="magic-tabs"><button class="${magicState.portalTab==='games'?'active':''}" onclick="magicState.portalTab='games';magicRenderStudentExtras()">🎮 Juegos (${p.games.length})</button><button class="${magicState.portalTab==='missions'?'active':''}" onclick="magicState.portalTab='missions';magicRenderStudentExtras()">📜 Misiones (${newTasks} nuevas)</button><button class="${magicState.portalTab==='history'?'active':''}" onclick="magicState.portalTab='history';magicRenderStudentExtras()">✦ Mi progreso</button></div><div id="magicPortalTab"></div></div>`;
const target=document.getElementById('magicPortalTab');if(magicState.portalTab==='games')target.innerHTML=`<div class="magic-library">${p.games.map(x=>{let attempts=p.attempts.filter(a=>a.game_id===x.id);return `<button onclick="magicOpenStudentGame('${x.id}')"><strong>${magicSafe(MAGIC_KINDS[x.kind])}</strong>${magicSafe(x.title)}<br><small>${attempts.length?'Mejor resultado: '+Math.max(...attempts.map(a=>a.score))+'%':'Sin jugar'} · +${x.points} pts / +${x.xp} XP ${attempts.some(a=>a.rewarded)?'· Premio recibido':''}</small></button>`}).join('')||'<p>No hay juegos publicados para tu clase todavía.</p>'}</div>`;
else if(magicState.portalTab==='missions')target.innerHTML=`<div class="magic-grid">${p.missions.map(m=>{let s=p.submissions.find(x=>x.mission_id===m.id);return `<div class="magic-tile magic-mission-card ${magicMissionStatus(m,s).cls}"><h3>${magicSafe(m.title)}</h3><p>${magicSafe(m.instructions).slice(0,200)}</p><p class="magic-mini">${m.due_at?'Plazo: '+magicSafe(fmt(m.due_at)):'Sin fecha límite'} · +${m.points} pts · +${m.xp} XP</p>${s?`${magicStatusBadge(m,s)}${s.status==='corregida'?`<p><b>Valoración:</b> ${magicSafe(s.feedback)}<br>+${s.points_awarded} puntos · +${s.xp_awarded} XP</p>`:''}`:`${magicStatusBadge(m,null)}<div><button class="button" onclick="magicOpenStudentMission('${m.id}')">${m.due_at&&new Date(m.due_at).getTime()<Date.now()?'Entregar fuera de plazo':'Realizar misión'}</button></div>`}</div>`}).join('')||'<p>No hay misiones publicadas todavía.</p>'}</div>`;
else target.innerHTML=`<h3>Historial de Juegos Mágicos</h3>${p.attempts.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).map(a=>{let g=p.games.find(g=>g.id===a.game_id);return `<div class="eventLine"><span>${magicSafe(g?.title||'Juego anterior')}<br><small>${magicSafe(fmt(a.created_at))}</small></span><strong>${a.score}% ${a.rewarded?'✦ Recompensa':'· Práctica'}</strong></div>`}).join('')||'<p>Sin partidas todavía.</p>'}<h3>Entregas y correcciones</h3>${p.submissions.map(s=>{let m=p.missions.find(m=>m.id===s.mission_id);return `<div class="eventLine"><span>${magicSafe(m?.title||'Misión anterior')}<br><small>${magicSafe(fmt(s.created_at))}</small></span><strong>${magicSafe(s.status)} · +${s.xp_awarded||0} XP</strong></div>`}).join('')||'<p>Sin entregas todavía.</p>'}`;
}
function magicBackToPortal(){magicState.selectedGame=null;magicState.attemptDone=false;magicState.portalTab='games';magicRenderStudentExtras();}
function magicOpenStudentGame(gameId){const g=magicState.portal.games.find(x=>x.id===gameId);if(!g)return;magicState.selectedGame=g;magicState.answers=Array(g.items.length).fill('');magicState.current=0;magicState.letters={};magicState.selectedPair=null;magicState.matches=[];magicState.placements={};magicState.found=[];magicState.correctMessage='';magicState.attemptDone=false;magicState.wordGrid=null;delete magicState.wordStart;magicState.order=g.items.map(x=>x.q).sort(()=>Math.random()-.5);magicDrawStudentGame();}
function magicDrawStudentGame(){const g=magicState.selectedGame,root=document.getElementById('magicStudentExtras');if(!g||!root)return;root.innerHTML=`<div class="magic-student"><div class="row between"><div><small>✦ DESAFÍO INDIVIDUAL</small><h2>${magicSafe(g.title)}</h2><p style="color:#d9cbe1">${magicSafe(MAGIC_KINDS[g.kind])} · Objetivo ${g.threshold}% · +${g.points} pts y +${g.xp} XP</p></div><button class="magic-smallbutton" onclick="magicBackToPortal()">← Volver</button></div><div id="magicGameBody"></div></div>`;magicDrawGameBody();}
function magicDrawGameBody(){const g=magicState.selectedGame;const el=document.getElementById('magicGameBody');if(!el||!g)return;let html='';const n=g.items.length,i=magicState.current,it=g.items[i],kind=g.kind;
if(magicState.attemptDone){el.innerHTML=`<div class="magic-result"><h2>¡Partida registrada!</h2><p>${magicSafe(magicState.correctMessage)}</p><button class="button secondary" onclick="magicBackToPortal()">Volver a mis juegos</button><button class="button secondary" onclick="magicOpenStudentGame('${g.id}')">Volver a practicar</button></div>`;return;}
if(kind==='pasapalabra'){let letters='ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');html=`<div class="magic-rosco"><div class="magic-rosco-core">✦ ROSCO<br>${i+1} / ${n}</div>${letters.map((l,j)=>{let angle=j*2*Math.PI/27;return `<span class="${magicSafe(magicState.letters[l]||'')}" style="left:${50+45*Math.sin(angle)}%;top:${50-45*Math.cos(angle)}%">${l}</span>`}).join('')}</div><div class="magic-question"><b style="color:#4c3444">Letra ${magicSafe(it.letter||'?')}: ${magicSafe(it.q)}</b><input id="magicAnswer" value="${magicSafe(magicState.answers[i])}" placeholder="Escribe la palabra o expresión"></div><div class="toolbar"><button class="button" onclick="magicAnswerAndNext()">Responder</button><button class="button secondary" onclick="magicNextGameQuestion(true)">Pasapalabra</button><button class="button secondary" onclick="magicFinishGame()">Finalizar rosco</button></div>`;}
else if(kind==='quiz'||kind==='escalera'){let opts=it.choices||[];if(kind==='escalera'){html+=`<div class="magic-level">${g.items.map((_,j)=>`<span class="${j===i?'current':''}">Nivel ${j+1}</span>`).join('')}</div>`;}html+=`<p><b>${i+1} / ${n}</b> · ${magicSafe(it.q)}</p>${opts.map(c=>`<button class="magic-option ${magicState.answers[i]===c?'active':''}" onclick="magicPickAnswer(${JSON.stringify(c).replace(/"/g,'&quot;')})">${magicSafe(c)}</button>`).join('')}<button class="button" onclick="magicNextGameQuestion()">${i===n-1?'Terminar':'Siguiente pregunta'}</button>`;}
else if(kind==='parejas'){let a=g.items.map((it,j)=>({id:'q'+j,text:it.q,src:j}));let b=(g.options||[]).map((x,j)=>({id:'a'+j,text:x,src:'a'+j}));let all=[...a,...b];html=`<p>Relaciona las fichas de conceptos y respuestas. Selecciona dos fichas que formen una pareja.</p><div class="magic-pair-grid">${all.map(t=>`<button class="magic-match ${magicState.matches.includes(t.id)?'matched':''} ${magicState.selectedPair===t.id?'selected':''}" onclick="magicSelectPair('${t.id}')" ${magicState.matches.includes(t.id)?'disabled':''}>${magicSafe(t.text)}</button>`).join('')}</div><p>${magicState.matches.length/2} parejas encontradas de ${n}</p><button class="button" onclick="magicFinishGame()">Finalizar partida</button>`;}
else if(kind==='clasifica'){let cats=g.options||[];let items=g.items.map((it,j)=>({idx:j,text:it.q}));html=`<p>Arrastra cada ficha desde abajo hasta el cajón correspondiente. En móvil también puedes tocar una ficha y después el cajón.</p><div class="magic-two">${cats.map(c=>`<div class="magic-dropzone" data-cat="${magicSafe(c)}" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="magicDrop(event,${JSON.stringify(c).replace(/"/g,'&quot;')})" onclick="magicPutSelected(${JSON.stringify(c).replace(/"/g,'&quot;')})"><h4>📦 ${magicSafe(c)}</h4>${items.filter(x=>magicState.placements[x.idx]===c).map(x=>`<span class="magic-draggable" onclick="event.stopPropagation();magicUnplace(${x.idx})">${magicSafe(x.text)} ×</span>`).join('')}</div>`).join('')}</div><h3>Fichas por clasificar</h3><div>${items.filter(x=>!(x.idx in magicState.placements)).map(x=>`<span class="magic-draggable ${magicState.drag===x.idx?'selected':''}" draggable="true" ondragstart="magicDrag(event,${x.idx})" ontouchstart="magicTouchStart(event,${x.idx})" ontouchend="magicTouchDrop(event,${x.idx})" onclick="magicSelectDrag(${x.idx})">☰ ${magicSafe(x.text)}</span>`).join('')}</div><p>${Object.keys(magicState.placements).length} de ${n} clasificadas</p><button class="button" onclick="magicFinishGame()">Comprobar clasificación</button>`;}
else if(kind==='ordena'){html=`<p>Ordena los pasos con las flechas.</p>${magicState.order.map((x,j)=>`<div class="magic-order-row"><span>${j+1}. ${magicSafe(x)}</span><span><button onclick="magicMoveOrder(${j},-1)" ${j===0?'disabled':''}>↑</button> <button onclick="magicMoveOrder(${j},1)" ${j===n-1?'disabled':''}>↓</button></span></div>`).join('')}<button class="button" onclick="magicFinishGame()">Comprobar orden</button>`;}
else if(kind==='sopa'){const words=g.items.map(x=>x.q.toUpperCase().replace(/[^A-ZÑ]/g,''));let grid=magicMakeWordGrid(words);html=`<p>Busca las palabras en la sopa. Selecciona su primera y última letra siguiendo una línea horizontal.</p><div class="magic-word-grid" style="grid-template-columns:repeat(12,24px)">${grid.flat().map((c,j)=>`<button class="magic-letter ${magicState.found.includes(j)?'hit':''}" onclick="magicTapLetter(${j})">${magicSafe(c)}</button>`).join('')}</div><p>Palabras: ${words.map(w=>`<span class="magic-chip">${magicSafe(w)}</span>`).join(' ')}</p><button class="button" onclick="magicFinishGame()">Terminar sopa</button>`;}
else if(kind==='crucigrama'){html=`<p>Completa las palabras a partir de sus pistas. Las letras aparecen en las casillas al escribir.</p>${g.items.map((it,j)=>`<div class="magic-question"><p><b>${j+1}.</b> ${magicSafe(it.q)}</p><input maxlength="40" value="${magicSafe(magicState.answers[j])}" oninput="magicSetInput(${j},this.value)" placeholder="Solución"><div class="magic-mini">${magicSafe((magicState.answers[j]||'').toUpperCase().split('').join('  ·  '))}</div></div>`).join('')}<button class="button" onclick="magicFinishGame()">Comprobar crucigrama</button>`;}
el.innerHTML=html;}
function magicPickAnswer(value){magicState.answers[magicState.current]=value;magicDrawGameBody();}
function magicAnswerAndNext(){let input=document.getElementById('magicAnswer');if(!input||!input.value.trim())return alert('Escribe una respuesta o pulsa Pasapalabra.');magicState.answers[magicState.current]=input.value.trim();magicNextGameQuestion(false);}
async function magicNextGameQuestion(skip=false){
 let g=magicState.selectedGame;if(!g)return;
 if(!skip&&['quiz','escalera'].includes(g.kind)&&!magicState.answers[magicState.current])return alert('Selecciona una respuesta.');
 const current=magicState.current;
 if(g.kind==='pasapalabra'&&!skip){
   const answer=magicState.answers[current]||'',letter=g.items[current].letter;
   try{
     let ok;
     if(cloud){const result=await api.rpc('magic_check_letter',{p_token:portalToken,p_game:g.id,p_index:current,p_answer:answer});if(result.error)throw Error(result.error.message);ok=result.data===true;}
     else{let raw=db.magic_games.find(x=>x.id===g.id);ok=String(raw.items[current].answer).trim().toLowerCase()===answer.trim().toLowerCase();}
     magicState.letters[letter]=ok?'ok':'bad';
   }catch(e){alert('No se pudo comprobar la respuesta: '+e.message);return;}
 }
 let next=current+1;
 if(next>=g.items.length){next=magicState.answers.findIndex((v,i)=>!v&&i!==current);if(next<0){if(skip&&!magicState.answers[current])next=current;else return magicFinishGame();}}
 if(next===current&&skip){alert('Queda esta letra pendiente. Puedes contestarla o pulsar Finalizar rosco.');return;}
 magicState.current=next;magicDrawGameBody();
}
function magicTouchStart(e,i){magicState.drag=i;}
function magicTouchDrop(e,i){e.preventDefault();const touch=e.changedTouches[0];if(!touch)return;const target=document.elementFromPoint(touch.clientX,touch.clientY)?.closest('.magic-dropzone');if(target){magicState.placements[i]=target.dataset.cat;magicState.drag=null;magicDrawGameBody();}}
function magicSelectPair(key){let g=magicState.selectedGame;if(magicState.matches.includes(key))return;if(magicState.selectedPair===null){magicState.selectedPair=key;magicDrawGameBody();return;}let one=magicState.selectedPair,two=key;magicState.selectedPair=null;if(one[0]===two[0]){magicDrawGameBody();return;}let q=one[0]==='q'?Number(one.slice(1)):Number(two.slice(1)),answerId=one[0]==='a'?Number(one.slice(1)):Number(two.slice(1));let value=g.options[answerId];if(!magicState.answers[q])magicState.answers[q]=value;magicState.matches.push(one,two);magicDrawGameBody();}
function magicSelectDrag(i){magicState.drag=i;magicDrawGameBody();}
function magicDrag(e,i){magicState.drag=i;e.dataTransfer.setData('text/plain',String(i));}
function magicDrop(e,c){e.preventDefault();const i=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(i))magicState.placements[i]=c;magicState.drag=null;magicDrawGameBody();}
function magicPutSelected(c){if(magicState.drag===null)return;magicState.placements[magicState.drag]=c;magicState.drag=null;magicDrawGameBody();}
function magicUnplace(i){delete magicState.placements[i];magicDrawGameBody();}
function magicMoveOrder(i,d){let a=magicState.order,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];magicDrawGameBody();}
function magicMakeWordGrid(words){if(magicState.wordGrid)return magicState.wordGrid;let grid=Array.from({length:12},()=>Array(12).fill(''));const alphabet='ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';words.forEach((w,j)=>{if(w.length>12)return;const row=j%12;const start=(j*5)%(13-w.length);for(let k=0;k<w.length;k++)grid[row][start+k]=w[k];});for(let r=0;r<12;r++)for(let c=0;c<12;c++)if(!grid[r][c])grid[r][c]=alphabet[(r*17+c*7)%alphabet.length];magicState.wordGrid=grid;return grid;}
function magicTapLetter(j){let start=magicState.wordStart;if(start===undefined){magicState.wordStart=j;return;}let r=Math.floor(j/12),r0=Math.floor(start/12),a=Math.min(j,start)%12,b=Math.max(j,start)%12;let word=r===r0?magicState.wordGrid[r].slice(a,b+1).join(''):'';let words=magicState.selectedGame.items.map(x=>x.q.toUpperCase().replace(/[^A-ZÑ]/g,''));let k=words.indexOf(word);if(k>=0){magicState.answers[k]=magicState.selectedGame.items[k].q;for(let c=a;c<=b;c++)magicState.found.push(r*12+c);}else alert('No coincide con una palabra. Intenta seleccionar las letras de principio a fin.');delete magicState.wordStart;magicDrawGameBody();}
function magicSetInput(i,value){magicState.answers[i]=value;}
async function magicFinishGame(){const g=magicState.selectedGame;if(!g)return;if(g.kind==='clasifica')g.items.forEach((_,i)=>{magicState.answers[i]=magicState.placements[i]||'';});if(g.kind==='ordena')magicState.answers=[...magicState.order];if(g.kind==='parejas'&&!magicState.matches.length)return alert('Relaciona primero las parejas.');let payload=magicState.answers.map(x=>String(x||'')),res;
try{if(cloud){let {data,error}=await api.rpc('magic_student_play',{p_token:portalToken,p_game:g.id,p_answers:payload});if(error)throw Error(error.message);res=data;}
 else{let st=db.students.find(s=>s.card_token===portalToken),raw=db.magic_games.find(x=>x.id===g.id);if(!raw)throw Error('Juego no encontrado');let correct=raw.items.reduce((n,item,i)=>n+(payload[i].trim().toLowerCase()===String(item.answer).trim().toLowerCase()?1:0),0),score=Math.round(correct*100/raw.items.length),prior=db.magic_xp.some(x=>x.student_id===st.id&&x.game_id===g.id),rewarded=score>=g.threshold&&!prior;let a={id:id(),student_id:st.id,game_id:g.id,teacher_id:undefined,score,correct_count:correct,total_count:raw.items.length,answers:payload,rewarded,created_at:now()};db.magic_attempts.push(a);let awardedPoints=g.kind==='escalera'?Math.round(g.points*correct/raw.items.length):g.points,awardedXp=g.kind==='escalera'?Math.round(g.xp*correct/raw.items.length):g.xp;if(rewarded){db.magic_xp.push({id:id(),student_id:st.id,game_id:g.id,amount:awardedXp,created_at:now()});if(awardedPoints)db.movements.push({id:id(),student_id:st.id,amount:awardedPoints,reason:'Juego mágico: '+g.title,created_at:now()});}save();res={score,correct,total:raw.items.length,rewarded,points:rewarded?awardedPoints:0,xp:rewarded?awardedXp:0};}
 magicState.correctMessage=`Resultado: ${res.correct} / ${res.total} (${res.score}%). ${res.rewarded?'¡Has ganado '+res.points+' puntos y '+res.xp+' XP!':'Sin nueva recompensa. Puedes volver a practicar.'}`;magicState.attemptDone=true;if(cloud){let {data,error}=await api.rpc('magic_student_space',{p_token:portalToken});if(!error&&data)magicState.portal=data;magicRefreshStudentBalance();}else{let p=magicState.portal;let st=db.students.find(s=>s.card_token===portalToken);p.attempts=db.magic_attempts.filter(x=>x.student_id===st.id);p.xp=magicStudentXp(st.id);magicRefreshStudentBalance();}magicDrawGameBody();}
 catch(e){alert('No se pudo registrar la partida: '+e.message);}}
function magicOpenStudentMission(mid){const m=magicState.portal?.missions.find(x=>x.id===mid);if(!m)return;magicState.files=[];document.getElementById('magicStudentExtras').innerHTML=`<div class="magic-student"><button class="magic-smallbutton" onclick="magicState.portalTab='missions';magicRenderStudentExtras()">← Mis misiones</button><h2>📜 ${magicSafe(m.title)}</h2><p>${magicSafe(m.instructions)}</p><h3>📚 Material del docente</h3><div class="magic-grid" id="magicStudentMaterials">${magicMaterialHtml(m.materials||[],'mission')}</div><p>${m.due_at?'Plazo: '+magicSafe(fmt(m.due_at)):'Sin fecha límite'} · +${m.points} pts · +${m.xp} XP máximos</p><label>Mi respuesta escrita<textarea id="magicMissionText" rows="5" maxlength="10000" placeholder="Escribe tu respuesta aquí…"></textarea></label><p>Adjuntos: hasta 3 archivos; vídeos hasta 50 MB, imágenes 20 MB, audios y documentos 30 MB; máximo 200 MB por entrega. En la demo local usa archivos pequeños. Puedes comprobar tus grabaciones antes de enviarlas.</p><input id="magicMissionFiles" type="file" accept="image/*,audio/*,video/*,.pdf,.txt" multiple onchange="magicAddFiles(this)"><div id="magicFileList" class="magic-upload-list"></div><div id="magicCaptureStage" class="magic-capture-stage" hidden><div class="magic-capture-head"><strong id="magicCaptureHeading">Grabación</strong><span class="magic-record-dot">● REC</span></div><video id="magicCameraPreview" autoplay muted playsinline hidden></video><div id="magicAudioPreview" class="magic-audio-indicator" hidden>🎙 Micrófono activo · grabando audio</div><p id="magicCaptureInfo" role="status">La grabación continúa hasta pulsar Detener.</p><button type="button" class="button" onclick="magicStopRecording()">■ Detener grabación</button></div><div class="toolbar"><button class="button secondary" id="magicRecordAudio" onclick="magicRecord('audio')">🎙 Grabar audio</button><button class="button secondary" id="magicRecordVideo" onclick="magicRecord('video')">📹 Grabar vídeo</button><button class="button" id="magicSendMission" onclick="magicSubmitMission('${m.id}')">Enviar misión</button></div><p class="magic-mini">Tu entrega se considerará enviada únicamente cuando el servidor confirme la recepción.</p></div>`;magicMountMaterials(m.materials||[],'mission',m.id);}
async function magicAddFiles(input){
 for(const f of Array.from(input.files||[])){
  if(magicState.files.length>=3){alert('Máximo tres adjuntos.');break;}
  const mime=(f.type||magicGuessMime(f.name)).split(';')[0];
  if(!magicMediaAllowed(mime)){alert('Formato no permitido: '+f.name);continue;}
  if(f.size>magicLimitFor(mime)*MAGIC_V12_MB){alert(f.name+' supera '+magicLimitFor(mime)+' MB');continue;}
  if(magicState.files.reduce((n,x)=>n+magicNewFileSize(x),0)+f.size>200*MAGIC_V12_MB){alert('Máximo 200 MB en la entrega');continue;}
  if(!cloud&&f.size>2*MAGIC_V12_MB){alert('La demo local admite archivos de 2 MB como máximo. Activa Storage para archivos grandes.');continue;}
  magicState.files.push(cloud?{name:f.name.slice(0,150),mime,size:f.size,file:f}:{name:f.name.slice(0,150),mime,data:await magicToBase64(f)});
 }
 magicDrawFileList();input.value='';
}

function magicToBase64(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(',')[1]);fr.onerror=()=>reject(new Error('No se pudo leer el archivo'));fr.readAsDataURL(file);});}
function magicDrawFileList(){
 let el=document.getElementById('magicFileList');if(!el)return;
 el.innerHTML=magicState.files.map((f,i)=>`<div class="magic-file-row">📎 ${magicSafe(f.name)} <button class="magic-smallbutton" onclick="magicState.files.splice(${i},1);magicDrawFileList()">Quitar</button><div class="magic-mini">${magicSafe(f.mime)}</div>${f.mime.startsWith('video/')?`<video data-magic-local="${i}" class="magic-media" controls playsinline preload="metadata"></video>`:f.mime.startsWith('audio/')?`<audio data-magic-local="${i}" class="magic-media" controls preload="metadata"></audio>`:''}</div>`).join('');
 if(magicState.localPreviewUrls)magicState.localPreviewUrls.forEach(u=>URL.revokeObjectURL(u));magicState.localPreviewUrls=[];
 magicState.files.forEach((f,i)=>{const el=document.querySelector(`[data-magic-local="${i}"]`);if(!el)return;try{let u=URL.createObjectURL(f.file||magicBlobFromAttachment(f));magicState.localPreviewUrls.push(u);el.src=u;el.addEventListener('error',()=>{el.insertAdjacentHTML('afterend','<p class="magic-error">Este navegador no puede reproducir este formato. Puedes enviar el archivo igualmente o convertirlo a MP4 (H.264/AAC).</p>')});}catch(e){console.warn(e)}});
}
function magicStopRecording(){if(magicState.recorder?.state==='recording')magicState.recorder.stop();}
function magicRecorderMime(kind){
 const choices=kind==='video'?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm']:
 ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
 return choices.find(m=>MediaRecorder.isTypeSupported?.(m))||'';
}
async function magicRecord(kind){
 if(magicState.recorder?.state==='recording'){magicStopRecording();return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return alert('Tu navegador no admite grabación aquí. Prueba en HTTPS y permite cámara/micrófono, o adjunta un archivo.');
 if(magicState.files.length>=3)return alert('Máximo tres archivos.');
 let stream;
 try{
  stream=await navigator.mediaDevices.getUserMedia(kind==='audio'?{audio:true}:{audio:true,video:{width:{ideal:640},height:{ideal:480},facingMode:'user'}});
  let pref=magicRecorderMime(kind),opts={audioBitsPerSecond:32000};if(kind==='video')opts.videoBitsPerSecond=350000;if(pref)opts.mimeType=pref;
  const rec=new MediaRecorder(stream,opts);magicState.recordChunks=[];magicState.recorder=rec;
  const stage=document.getElementById('magicCaptureStage'),camera=document.getElementById('magicCameraPreview'),audio=document.getElementById('magicAudioPreview'),heading=document.getElementById('magicCaptureHeading');
  if(!stage)throw Error('La pantalla de misión se ha cerrado; vuelve a abrirla.');
  stage.hidden=false;const stop=stage.querySelector('button');if(stop)stop.hidden=false;heading.textContent=kind==='video'?'Tu cámara en directo':'Grabando tu voz';
  camera.hidden=kind!=='video';audio.hidden=kind!=='audio';
  if(kind==='video'){camera.srcObject=stream;camera.play().catch(()=>{});}
  document.getElementById('magicSendMission').disabled=true;
  rec.ondataavailable=e=>{if(e.data.size)magicState.recordChunks.push(e.data);};
  rec.onerror=()=>{let info=document.getElementById('magicCaptureInfo');if(info)info.textContent='Error durante la grabación. Prueba a adjuntar un archivo.';};
  rec.onstop=async()=>{
   stream.getTracks().forEach(t=>t.stop());if(camera){camera.pause();camera.srcObject=null;}
   if(stage)stage.hidden=true;
   const send=document.getElementById('magicSendMission');if(send)send.disabled=false;
   const b=document.getElementById(kind==='audio'?'magicRecordAudio':'magicRecordVideo');if(b)b.textContent=kind==='audio'?'🎙 Grabar audio':'📹 Grabar vídeo';
   const mime=rec.mimeType||pref||(kind==='video'?'video/webm':'audio/webm'),blob=new Blob(magicState.recordChunks,{type:mime});
   if(!blob.size){alert('La grabación está vacía. Inténtalo otra vez.');return;}
   if(blob.size>(kind==='video'?50:30)*MAGIC_V12_MB||(!cloud&&blob.size>2*MAGIC_V12_MB)){alert(cloud?'La grabación supera el límite de '+(kind==='video'?50:30)+' MB. Haz una grabación más corta.':'La demo local limita las grabaciones a 2 MB. Para vídeos más grandes usa Supabase Storage.');return;}
   const ext=mime.startsWith('video/mp4')||mime.startsWith('audio/mp4')?'mp4':mime.includes('ogg')?'ogg':'webm';
   const file=new File([blob],kind+'-'+Date.now()+'.'+ext,{type:mime});
   if(magicState.files.reduce((n,x)=>n+magicNewFileSize(x),0)+file.size>200*MAGIC_V12_MB){alert('Máximo 200 MB por entrega.');return;}magicState.files.push(cloud?{name:file.name,mime:(file.type||magicGuessMime(file.name)).split(';')[0],size:file.size,file}:{name:file.name,mime:(file.type||magicGuessMime(file.name)).split(';')[0],data:await magicToBase64(file)});magicDrawFileList();
  };
  rec.start(1000);
  const btn=document.getElementById(kind==='audio'?'magicRecordAudio':'magicRecordVideo');if(btn)btn.textContent='■ Detener grabación';
 }catch(e){stream?.getTracks().forEach(t=>t.stop());let stage=document.getElementById('magicCaptureStage');if(stage)stage.hidden=true;let send=document.getElementById('magicSendMission');if(send)send.disabled=false;alert('No se pudo grabar: '+e.message);}
}
async function magicSubmitMission(mid){if(magicState.recorder?.state==='recording')return alert('Detén la grabación antes de enviar la misión.');let text=$('#magicMissionText')?.value.trim()||'';if(!text&&!magicState.files.length)return alert('Escribe una respuesta o adjunta un archivo.');if(!confirm('¿Enviar esta misión? Solo se puede entregar una vez.'))return;let btn=$('#magicSendMission');btn.disabled=true;btn.textContent='Enviando…';try{if(cloud){let uploaded=[];for(const file of magicState.files){if(!file.file)throw Error('Adjunto sin archivo original; vuelve a seleccionarlo');uploaded.push(await magicMediaUpload(file.file,mid,true));}let {data,error}=await api.rpc('magic_student_submit',{p_token:portalToken,p_mission:mid,p_answer:text,p_attachments:uploaded});if(error)throw Error(error.message);let state=await api.rpc('magic_student_space',{p_token:portalToken});if(state.error)throw Error('Entrega confirmada; no se pudo refrescar el historial: '+state.error.message);magicState.portal=state.data;}
else{const st=db.students.find(s=>s.card_token===portalToken),m=db.magic_missions.find(x=>x.id===mid);if(db.magic_submissions.some(s=>s.mission_id===mid&&s.student_id===st.id))throw Error('La misión ya ha sido entregada');let row={id:id(),student_id:st.id,teacher_id:undefined,mission_id:mid,answer:text,attachments:[...magicState.files],status:'entregada',feedback:'',points_awarded:0,xp_awarded:0,created_at:now()};db.magic_submissions.push(row);save();magicState.portal.submissions.push({...row,attachments:undefined});}
magicState.portalTab='missions';magicRenderStudentExtras();alert('¡Misión entregada! Ya figura en tu perfil y en la bandeja docente.');}catch(e){alert('No se ha marcado como entregada: '+e.message);btn.disabled=false;btn.textContent='Enviar misión';}}

async function magicRefreshStudentBalance(){
 try{if(cloud){let {data,error}=await api.rpc('student_portal',{p_token:portalToken});if(error||!data)return;const el=document.querySelector('.portalWrap .statGrid .stat strong');if(el)el.textContent=String(data.balance||0);}else{let st=db.students.find(s=>s.card_token===portalToken),el=document.querySelector('.portalWrap .statGrid .stat strong');if(el&&st)el.textContent=String(balance(st.id));}}catch(e){console.warn(e);}
}

/* v9: ampliación de guardián y concesión combinada de puntos/XP. */
function magicZoomGuardian(image,name){
  const match=String(image).match(/avatars\/(\d+)-(\d+)\.jpg/i);
  const idx=match?Number(match[1]):-1, stage=match?Number(match[2]):2;
  const secret=stage===1, display=secret?'Guardián misterioso':name;
  const bio=secret?'Dentro de este huevo duerme un guardián mágico. Su identidad se revelará cuando nazca, al llegar a 50 XP.':(MAGIC_DESCRIPTIONS[idx]||'Un guardián extraordinario de la Academia Mágica.')+' Su magia crece con la experiencia.';
  const enhanced=image.replace('guardianes/avatars/','guardianes/avatars-ampliados/');
  openModal(`<div class="magic-large-guardian"><h2>${magicSafe(display)}</h2><img src="${magicSafe(enhanced)}" onerror="this.onerror=null;this.src='${magicSafe(image)}'" alt="${magicSafe(display)}"><div class="magic-guardian-bio"><strong>${secret?'🥚 Aún no ha nacido':'✦ Conoce a tu guardián'}</strong><p>${magicSafe(bio)}</p></div></div>`);
}

let magicAwardBusy=false;
async function magicAwardManual(uid,sign){if(magicAwardBusy)return;
 const points=magicNumber(document.getElementById('amount')?.value,0,500),xp=magicNumber(document.getElementById('manualXp')?.value,0,500);
 const t=(db.reason_templates||[]).find(x=>x.id===document.getElementById('reason')?.value),reason=t?.name||document.getElementById('customReason')?.value.trim();
 if(points===null||xp===null||(!points&&!xp)||!reason)return alert('Indica un motivo y entre 0 y 500 puntos o XP (al menos uno distinto de cero).');
 if(sign<0&&points===0)return alert('Para descontar, indica los puntos a restar. El XP nunca se descuenta.');
 if(sign<0&&xp!==0&&!confirm('Esta penalización descontará puntos y concederá XP. ¿Confirmas?'))return;
 magicAwardBusy=true;const amount=points*sign,awardId=id();
 try{
  if(cloud){const {error}=await api.rpc('magic_award_points_xp',{p_student:uid,p_points:amount,p_xp:xp,p_reason:reason,p_award:awardId});if(error)throw Error(error.message);}
  if(points)db.movements.push({id:id(),student_id:uid,amount,reason,created_at:now(),teacher_id:cloud?session.user.id:undefined});
  db.magic_manual_awards.push({id:awardId,student_id:uid,teacher_id:cloud?session.user.id:undefined,xp,points:amount,reason,created_at:now()});
  if(!cloud)save();
  closeModal();selected=uid;toast('Registrados '+(amount>=0?'+':'')+amount+' puntos y +'+xp+' XP.');
  // Actualización inmediata de los contadores, sin esperar la recarga de todas las tablas.
  render();if(cloud){loadRemote().then(()=>{if(!document.getElementById('modal'))render();}).catch(e=>console.warn('No se pudo actualizar el panel',e));}
 }catch(e){alert('No se pudo registrar: '+e.message+'\nRevisa la migración SQL v9.');}
 finally{magicAwardBusy=false;}
}
