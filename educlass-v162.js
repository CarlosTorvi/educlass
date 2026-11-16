'use strict';
/* EduClass 16.2 · mejoras aisladas. Cargar después de educlass-v16.js. */
const edu162Safe= v=>esc(String(v??''));
let edu162Files=[],edu162Filter='',edu162Loaded=false,edu162Owner='';
const edu162MB=1048576;
const edu162Size=n=>Number(n||0)>=edu162MB?(Number(n||0)/edu162MB).toFixed(2)+' MB':(Number(n||0)/1024).toFixed(1)+' KB';

// 1. Un único botón inferior, siempre después de Tienda e Incidencias.
function edu162MoveHome(){
 const portal=document.querySelector('.portalWrap');if(!portal)return;
 const existing=[...portal.querySelectorAll('button')].filter(b=>b.textContent.trim().includes('Inicio EduClass')&&!b.closest('.edu16-home-top'));
 let bottom=document.getElementById('edu162HomeBottom');
 if(!bottom){bottom=document.createElement('div');bottom.id='edu162HomeBottom';bottom.className='edu162-home-bottom center section';bottom.innerHTML='<button type="button" class="button secondary" onclick="location.hash=\'#/inicio\'">← Inicio EduClass</button>';}
 for(const button of existing){if(!bottom.contains(button)){const parent=button.parentElement;button.remove();if(parent&&parent!==portal&&parent.children.length===0&&parent.textContent.trim()==='')parent.remove();}}
 // Añadir tras todos los componentes, incluso los que se cargan asíncronamente.
 portal.appendChild(bottom);
}

// 2. Solo los Juegos Mágicos aún no completados: repetir no suma pendientes.
// Se consideran completados los juegos con un intento válido registrado.
function edu162StudentTabs(){
 const nav=document.querySelector('#magicStudentExtras .magic-tabs');if(!nav||!magicState.portal)return;
 const p=magicState.portal;
 const games=[...nav.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("portalTab='games'"));
 const history=[...nav.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("portalTab='history'"));
 const missions=[...nav.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("portalTab='missions'"));
 const archive=document.getElementById('edu16ArchivedTab');
 if(games){const remaining=(p.games||[]).filter(g=>!(p.attempts||[]).some(a=>a.game_id===g.id&&a.rewarded===true)).length;games.textContent=remaining?'🎮 Juegos ('+remaining+')':'🎮 Juegos';}
 for(const el of [history,games,missions,archive])if(el)nav.appendChild(el);
}
const edu162PreviousPublicCard=publicCard;
publicCard=function(d){magicState.portalTab='history';edu162PreviousPublicCard(d);edu162MoveHome();};
const edu162PreviousRenderExtras=magicRenderStudentExtras;
magicRenderStudentExtras=function(){edu162PreviousRenderExtras();edu162StudentTabs();edu162MoveHome();};
const edu162PreviousStudentInterface=edu16StudentInterface;
edu16StudentInterface=function(){edu162PreviousStudentInterface();edu162MoveHome();};

// 3. Código personalizado: validación duplicada en servidor, nunca solo navegador.
const edu162PreviousModuleForm=moduleForm;
moduleForm=function(cid=''){
 edu162PreviousModuleForm(cid);if(!cid)return;
 const module=db.classes.find(c=>c.id===cid),form=document.querySelector('#modal form');if(!form)return;
 const label=document.createElement('label');label.innerHTML='🔐 Código de acceso para el alumnado <input id="edu162AccessCode" autocomplete="off" maxlength="40" minlength="4" value="'+edu162Safe(module?.access_code||'')+'" placeholder="Ej.: MAGIA2026"><small>4–40 caracteres: letras, números y guiones. Cambiarlo impedirá iniciar nuevas sesiones con el anterior.</small>';
 form.querySelector('button[type="submit"]')?.before(label);
};
const edu162PreviousSaveModule=saveModule;
saveModule=async function(e,cid){
 const field=document.getElementById('edu162AccessCode');if(!cid||!field)return edu162PreviousSaveModule(e,cid);
 e.preventDefault();const candidate=field.value.trim().toUpperCase();
 if(!/^[A-Z0-9_-]{4,40}$/.test(candidate))return alert('Código no válido: utiliza entre 4 y 40 letras, números, guiones o guiones bajos.');
 const previous=db.classes.find(c=>c.id===cid)?.access_code;
 if(candidate===previous)return edu162PreviousSaveModule(e,cid);
 if(!cloud)return alert('El cambio de código solo está disponible con Supabase conectado.');
 const name=document.getElementById('moduleName')?.value.trim(),card_theme=document.getElementById('moduleTheme')?.value;
 if(!name)return alert('Escribe el nombre del módulo.');
 if(db.classes.some(c=>c.id!==cid&&c.name.toLowerCase()===name.toLowerCase()))return alert('Ya existe un módulo con ese nombre.');
 try{
  await edu16Rpc('educlass_v162_change_code',{p_class:cid,p_new_code:candidate});
  // La modificación del nombre es opcional y conserva el flujo original.
  const {error}=await api.from('classes').update({name,card_theme}).eq('id',cid).eq('teacher_id',session.user.id);
  if(error)throw error;
  if(name!==db.classes.find(c=>c.id===cid)?.name){const r=await api.from('students').update({group_name:name}).eq('class_id',cid).eq('teacher_id',session.user.id);if(r.error)throw r.error;}
  await loadRemote();closeModal();page='clases';toast('Módulo y nuevo código guardados. El anterior ya no permite iniciar nuevas sesiones.');
 }catch(err){alert('No se pudo completar el cambio: '+err.message+'; revisa el módulo antes de repetir.');}
};

// 4. Gestión del alumnado: desactivar o eliminar sin botón de archivar.
const edu162OldEditStudent=editStudent;
editStudent=function(uid){edu162OldEditStudent(uid);const modal=document.querySelector('#modal .stack');if(!modal)return;
 const wrap=document.createElement('div');wrap.className='edu162-student-actions';
 wrap.innerHTML='<hr><h3>Gestión del alumno</h3><p class="muted">Desactivar bloquea el acceso sin borrar datos. Eliminar suprime la ficha y los registros relacionados.</p><button class="button secondary" onclick="edu162DeactivateStudent(\''+uid+'\')" type="button">⏸ Desactivar acceso</button><button class="button danger" type="button" onclick="edu162ConfirmDeleteStudent(\''+uid+'\')">🗑 Eliminar definitivamente</button>';
 modal.appendChild(wrap);
};
async function edu162DeactivateStudent(uid){const s=db.students.find(x=>x.id===uid);if(!s||!confirm('¿Desactivar el acceso de '+s.name+'? Se conservarán todos sus datos.'))return;
 try{if(cloud){const r=await api.from('students').update({student_active:false}).eq('id',uid).eq('teacher_id',session.user.id).select('id').maybeSingle();if(r.error||!r.data)throw Error(r.error?.message||'No autorizado');}
 else {s.student_active=false;save();}
 await (cloud?loadRemote():Promise.resolve());closeModal();toast('Acceso desactivado. Puedes reactivarlo desde la ficha del alumno.');}catch(e){alert(e.message);}
}
function edu162ConfirmDeleteStudent(uid){const s=db.students.find(x=>x.id===uid);if(!s)return;
 closeModal();openModal('<div class="stack"><h3>Eliminar definitivamente a '+edu162Safe(s.name)+'</h3><p class="edu162-warning">Se borrarán ficha, acceso, sesiones, asistencia, puntos, XP, partidas, entregas, canjes e incidencias. La eliminación no se puede deshacer. Los archivos del alumno también se eliminarán de Storage. Haz antes una copia de seguridad y comprueba las obligaciones legales de conservación.</p><label>Para confirmar escribe ELIMINAR<input id="edu162ConfirmWord" autocomplete="off" placeholder="ELIMINAR"></label><button class="button danger" onclick="edu162DeleteStudent(\''+uid+'\')">Eliminar definitivamente</button></div>');
}
async function edu162DeleteStudent(uid){if(document.getElementById('edu162ConfirmWord')?.value!=='ELIMINAR')return alert('Debes escribir exactamente ELIMINAR.');if(!cloud)return alert('La eliminación definitiva requiere conexión a Supabase.');
 const button=document.querySelector('#modal .button.danger');if(button)button.disabled=true;
 try{const result=await magicMediaRequest('purge_student',{student_id:uid});await loadRemote();closeModal();toast('Alumno eliminado definitivamente. '+(result.deleted_files||0)+' archivos eliminados.');render();if(result.remaining_files)alert('Atención: quedan '+result.remaining_files+' archivos huérfanos en Storage. Ve a Almacenamiento para revisarlos.');}
 catch(e){if(button)button.disabled=false;alert('No se completó la eliminación: '+e.message+'. Verifica el estado antes de reintentar.');}
}

// 5. Inventario de almacenamiento privado: el servidor determina permisos y referencias.
async function edu162LoadFiles(){if(!cloud)return;const data=await magicMediaRequest('inventory');edu162Files=data.files||[];edu162Owner=session?.user?.id||'';edu162Quota=data.quota||700*edu162MB;edu162Used=data.bytes||0;edu162Loaded=true;render();}
let edu162Quota=700*edu162MB,edu162Used=0;
function edu162StoragePage(){
 if(edu162Owner!==(session?.user?.id||'')){edu162Files=[];edu162Used=0;edu162Loaded=false;edu162Owner=session?.user?.id||'';}
 const ratio=edu162Quota?Math.min(100,Math.round(100*edu162Used/edu162Quota)):0;
 const options=['Todos','Material docente','Entrega del alumnado'];
 const filtered=edu162Files.filter(f=>{const hay=(f.name+' '+f.mission_title+' '+f.student_name+' '+f.location).toLocaleLowerCase('es').includes(edu162Filter.toLocaleLowerCase('es'));return hay;});
 return header('💾 Almacenamiento','Archivos privados de tus misiones y de las entregas del alumnado.')+
 `<div class="card section"><h2>Espacio ocupado</h2><p><b>${edu162Size(edu162Used)}</b> de ${edu162Size(edu162Quota)} · cuota interna de EduClass (el límite general de Supabase se consulta aparte)</p><div class="progress"><div style="width:${ratio}%"></div></div><p>${ratio>=95?'🔴 Espacio casi agotado':ratio>=85?'🟠 Almacenamiento elevado':ratio>=70?'🟡 Conviene revisar archivos antiguos':'🟢 Espacio bajo control'}</p><div class="toolbar"><button class="button" onclick="edu162LoadFiles().catch(edu16Msg)">🔄 Actualizar inventario</button></div>${!edu162Loaded?'<p>Haz clic en Actualizar inventario para consultar los archivos reales.</p>':`<label>Buscar por nombre, misión o alumno<input placeholder="Buscar archivos" value="${edu162Safe(edu162Filter)}" oninput="edu162Filter=this.value;edu162UpdateInventory()"></label><div id="edu162FileList">${edu162Rows(filtered)}</div>`}</div>`;
}
function edu162Rows(files){if(!files.length)return '<p>No hay archivos con ese criterio.</p>';
 return '<div class="edu162-file-list">'+files.slice().sort((a,b)=>b.size-a.size).map(f=>{
 const path=encodeURIComponent(f.path);
 const owner=f.student_name?edu162Safe(f.student_name):'Docente';
 const badge=f.protected?'⚠️ Entrega corregida: borrado definitivo disponible con confirmación reforzada':'Archivo descargable';
 return `<div class="edu162-file"><div><b>${edu162Safe(f.name)}</b><small>${edu162Size(f.size)} · ${edu162Safe(f.type)} · ${edu162Safe(f.created_at||'')}</small><small>📜 ${edu162Safe(f.mission_title||'Misión antigua')} · ${owner}</small><small>${badge}</small></div><div class="toolbar"><button class="button secondary" onclick="edu162Download('${path}')">⬇ Descargar</button><button class="button danger"  onclick="edu162DeleteFile('${path}')">Eliminar</button></div></div>`;
 }).join('')+'</div>';
}
function edu162UpdateInventory(){const root=document.getElementById('edu162FileList');if(root)root.innerHTML=edu162Rows(edu162Files.filter(f=>(f.name+' '+f.mission_title+' '+f.student_name+' '+f.location).toLocaleLowerCase('es').includes(edu162Filter.toLocaleLowerCase('es'))));}
async function edu162Download(encoded){const path=decodeURIComponent(encoded),f=edu162Files.find(x=>x.path===path);if(!f)return;
 try{const out=await magicMediaRequest('signed',{mission_id:f.mission_id,path,download:true,name:f.name});const link=document.createElement('a');link.href=out.url;link.rel='noopener';link.download=f.name;document.body.appendChild(link);link.click();link.remove();}catch(e){edu16Msg(e);}
}
async function edu162DeleteFile(encoded){const path=decodeURIComponent(encoded),f=edu162Files.find(x=>x.path===path);if(!f)return;
 const warning=f.protected?'\n\nENTREGA CORREGIDA: se conservarán la calificación y la ficha de la entrega, pero el archivo desaparecerá de Storage y dejará de ser descargable. Comprueba antes las obligaciones de conservación.':'';
 if(!confirm('¿Eliminar permanentemente «'+f.name+'» ('+edu162Size(f.size)+')? La acción no puede deshacerse.'+warning))return;
 let confirmation='';
 if(f.protected){confirmation=prompt('Para borrar una entrega CORREGIDA, escribe exactamente ELIMINAR. La calificación se conserva, pero el archivo se pierde.');if(confirmation!=='ELIMINAR')return;}
 try{await magicMediaRequest('delete_inventory',{mission_id:f.mission_id,path,confirm_corrected:confirmation});await edu162LoadFiles();toast('Archivo eliminado y referencias actualizadas.');}catch(e){edu16Msg(e);}
}

// Menú y enrutado de la nueva pantalla docente.
const edu162OldRender=render;
render=function(){
 if(page==='almacenamiento'&&session){
  // Renderizar shell directamente para no alterar paneles existentes.
  shell(edu162StoragePage());magicTeacherNav();edu162DecorateStorageNav();return;
 }
 edu162OldRender();edu162DecorateStorageNav();edu162MoveHome();
};
function edu162DecorateStorageNav(){const nav=document.querySelector('.side .navItems');if(!nav)return;
 let button=document.getElementById('edu162StorageNav');if(!button){button=document.createElement('button');button.id='edu162StorageNav';button.setAttribute('onclick',"go('almacenamiento')");button.innerHTML='<span class="navIcon">💾</span><span>Almacenamiento</span>';nav.appendChild(button);}
 button.classList.toggle('active',page==='almacenamiento');
}
