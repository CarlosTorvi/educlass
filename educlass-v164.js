/* EduClass NFC v16.4: eliminación controlada de juegos y exportación PDF por juego/misión.
   Cargar DESPUÉS de educlass-v162.js. No sustituye las correcciones v16.3. */
'use strict';
(function(){
  const e164esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e164Filename = s => String(s||'EduClass').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,60);
  const e164Date = s => {try{return s?new Date(s).toLocaleString('es-ES'):'No consta'}catch(_){return String(s||'No consta')}};
  const e164Students = () => Array.isArray(db?.students)?db.students:[];
  const e164FindStudent = id => e164Students().find(s=>s.id===id)?.name || 'Alumno sin ficha ('+String(id).slice(0,8)+')';
  const e164Warn = err => alert('EduClass: '+(err?.message||String(err)));

  // PDF autónomo: PDF multipágina sin CDN y sin enviar datos del alumnado a terceros.
  // El texto se codifica como Windows-1252; los caracteres fuera del juego se sustituyen.
  function e164Win1252(str){
    const special={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
    const arr=[]; for(const ch of String(str||'')){let v=ch.codePointAt(0);if(v>=32&&v<=126||v>=160&&v<=255)arr.push(v);else if(special[ch])arr.push(special[ch]);else if(ch==='\n'||ch==='\t')arr.push(32);else arr.push(63);}return arr;
  }
  function e164PdfEscape(v){let z='';for(const n of e164Win1252(v)){if(n===40||n===41||n===92)z+='\\';z+=String.fromCharCode(n);}return z;}
  function e164Width(s,font=10){let n=0;for(const c of String(s)){n+=c===' '?2.65:'il|.,:;!\'' .includes(c)?2.6:'MW@%'.includes(c)?8.6:5.2;}return n*font/10;}
  function e164Wrap(raw,max=490,font=10){
    let result=[];for(const paragraph of String(raw??'').replace(/\r/g,'').split('\n')){
      const words=paragraph.split(/\s+/);let line='';for(let word of words){
        if(!word)continue;
        while(e164Width(word,font)>max&&word.length>1){let cut=Math.max(1,Math.floor(word.length*max/e164Width(word,font)));while(cut>1&&e164Width(word.slice(0,cut),font)>max)cut--;if(line){result.push(line);line='';}result.push(word.slice(0,cut));word=word.slice(cut);}
        if(!word)continue;const candidate=line?line+' '+word:word;
        if(line&&e164Width(candidate,font)>max){result.push(line);line=word;}else line=candidate;
      }
      result.push(line);
    }return result;
  }
  function e164MakePdf(title,sections,filename){
    const PAGE_H=842,LEFT=48,RIGHT=48,TOP=48,BOTTOM=45,max=595-LEFT-RIGHT;
    const pages=[];let cmds=[],y=PAGE_H-TOP;
    const pushPage=()=>{if(cmds.length)pages.push(cmds.join('\n'));cmds=[];y=PAGE_H-TOP;};
    const line=(txt,size=10,bold=false,lead=15)=>{if(y-lead<BOTTOM)pushPage();cmds.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+LEFT+' '+y.toFixed(1)+' Tm ('+e164PdfEscape(txt)+') Tj ET');y-=lead;};
    const block=(s,{size=10,bold=false,lead=15,space=4}={})=>{for(const txt of e164Wrap(s,max,size))line(txt,size,bold,lead);y-=space;};
    block('EDUCLASS NFC · INFORME DOCENTE',{size:11,bold:true,lead:20,space:4});
    block(title,{size:16,bold:true,lead:21,space:8});
    block('Generado: '+new Date().toLocaleString('es-ES'),{size:9,space:12});
    for(const section of sections){
      if(y<110)pushPage();
      block(section.heading,{size:12,bold:true,lead:19,space:5});
      for(const item of section.lines)block(item,{size:10,lead:15,space:3});
      y-=10;
    }
    if(cmds.length)pages.push(cmds.join('\n'));
    const objects=[null],add=x=>{objects.push(x);return objects.length-1;};
    const catalog=add(''),pagesId=add(''),font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const refs=[]; for(const content of pages){const bytes=e164Win1252(content).concat([10]);const stream=add({stream:bytes});const page=add('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 '+font1+' 0 R /F2 '+font2+' 0 R >> >> /Contents '+stream+' 0 R >>');refs.push(page);}
    objects[catalog]='<< /Type /Catalog /Pages '+pagesId+' 0 R >>';objects[pagesId]='<< /Type /Pages /Kids ['+refs.map(x=>x+' 0 R').join(' ')+'] /Count '+refs.length+' >>';
    const byte=[];const push=s=>{for(let i=0;i<s.length;i++)byte.push(s.charCodeAt(i)&255);};
    push('%PDF-1.4\n');let offsets=[0];for(let i=1;i<objects.length;i++){
      offsets.push(byte.length);push(i+' 0 obj\n');const o=objects[i];
      if(typeof o==='string')push(o+'\n');else{push('<< /Length '+o.stream.length+' >>\nstream\n');for(const b of o.stream)byte.push(b);push('endstream\n');}
      push('endobj\n');
    }
    const offset=byte.length;push('xref\n0 '+objects.length+'\n0000000000 65535 f \n');for(let i=1;i<objects.length;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');push('trailer\n<< /Size '+objects.length+' /Root '+catalog+' 0 R >>\nstartxref\n'+offset+'\n%%EOF');
    const url=URL.createObjectURL(new Blob([new Uint8Array(byte)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);
  }

  function e164ExportGame(gameId){
    const game=db.magic_games.find(g=>g.id===gameId);if(!game)return alert('Juego no encontrado.');
    const rows=db.magic_attempts.filter(x=>x.game_id===gameId).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
    const clazz=db.classes.find(c=>c.id===game.class_id)?.name||game.archived_class_name||'Módulo';
    const sections=[{heading:'Resumen',lines:['Módulo: '+clazz,'Tipo: '+(typeof MAGIC_KINDS!=='undefined'?(MAGIC_KINDS[game.kind]||game.kind):game.kind),'Partidas: '+rows.length,'Participantes: '+new Set(rows.map(a=>a.student_id)).size]}];
    for(const [i,a] of rows.entries())sections.push({heading:(i+1)+'. '+e164FindStudent(a.student_id),lines:['Fecha: '+e164Date(a.created_at),'Aciertos: '+(a.correct_count??'—')+' / '+(a.total_count??'—'),'Resultado: '+(a.score??'—')+'%','Recompensa: '+(a.rewarded?'Sí':'No')]});
    if(!rows.length)sections.push({heading:'Sin resultados registrados',lines:['Todavía no hay partidas para este juego.']});
    e164MakePdf('Resultados: '+game.title,sections,'EduClass_Juego_'+e164Filename(game.title)+'.pdf');
  }
  function e164ExportMission(missionId){
    const mission=db.magic_missions.find(m=>m.id===missionId);if(!mission)return alert('Misión no encontrada.');
    const rows=db.magic_submissions.filter(s=>s.mission_id===missionId).sort((a,b)=>e164FindStudent(a.student_id).localeCompare(e164FindStudent(b.student_id),'es'));
    const clazz=db.classes.find(c=>c.id===mission.class_id)?.name||'Módulo';
    const sections=[{heading:'Datos de la misión',lines:['Módulo: '+clazz,'Título: '+mission.title,'Instrucciones: '+String(mission.instructions||'—'),'Fecha límite: '+e164Date(mission.due_at),'Entregas recibidas: '+rows.length]}];
    for(const [i,s] of rows.entries())sections.push({heading:(i+1)+'. '+e164FindStudent(s.student_id),lines:[
      'Fecha de entrega: '+e164Date(s.created_at),'Estado: '+(s.status==='corregida'?'Corregida':(mission.due_at&&s.created_at>mission.due_at?'Fuera de plazo':'Entregada')),
      'Respuesta del alumno: '+String(s.answer||'(Respuesta adjunta en archivo; sin texto)'),
      'Adjuntos: '+(Array.isArray(s.attachments)&&s.attachments.length?s.attachments.map(a=>a.name||'Adjunto').join(', '):'Ninguno / eliminados'),
      'Retroalimentación del docente: '+String(s.feedback||'Pendiente de corrección'),
      'Puntos otorgados: '+(s.status==='corregida'?(s.points_awarded??0):'Pendiente'),
      'XP otorgada: '+(s.status==='corregida'?(s.xp_awarded??0):'Pendiente'),
      'Fecha de corrección: '+e164Date(s.reviewed_at)
    ]});
    if(!rows.length)sections.push({heading:'Sin entregas',lines:['Todavía no se ha registrado ninguna entrega de esta misión.']});
    e164MakePdf('Misión: '+mission.title,sections,'EduClass_Mision_'+e164Filename(mission.title)+'.pdf');
  }
  // Funciones públicas únicamente para los botones del panel DOCENTE.
  window.edu164ExportGame=e164ExportGame;
  window.edu164ExportMission=e164ExportMission;
  window.edu164DeleteGame=async function(gameId){
    const game=db.magic_games.find(g=>g.id===gameId);if(!game)return alert('Juego no encontrado.');
    const attempts=db.magic_attempts.filter(a=>a.game_id===gameId).length;
    if(!confirm('¿Retirar «'+game.title+'» del catálogo y desvincularlo del módulo?\\n\\n'
      +(attempts?'Sus '+attempts+' partidas, fechas, resultados, puntos y XP seguirán conservados.':'No tiene partidas registradas.')
      +'\\nEl alumnado ya no podrá jugarlo.'))return;
    if(prompt('Para confirmar escribe ELIMINAR')!=='ELIMINAR')return;
    try{
      if(cloud){
        const {error}=await api.rpc('educlass_v164_delete_unused_game',{p_game:gameId});
        if(error)throw error;
        await loadRemote();
      }else{
        game.archived_at=new Date().toISOString();
        game.archived_class_id=game.class_id;
        game.archived_class_name=db.classes.find(c=>c.id===game.class_id)?.name||'Módulo anterior';
        game.class_id=null;game.published=false;save();
      }
      if(typeof closeModal==='function')closeModal();
      toast('Juego retirado. Su historial y las recompensas permanecen intactos.');
      go('magic-games');
    }catch(err){e164Warn(err);}
  };
  const oldGames=magicTeacherGames;
  magicTeacherGames=function(){
    const all=db.magic_games;
    const active=all.filter(g=>!g.archived_at);
    let html;
    try{db.magic_games=active;html=oldGames();}
    finally{db.magic_games=all;}
    const games=active.filter(g=>g.class_id===currentClassId);
    for(const game of games){
      const target=`onclick="magicGameResults('${game.id}')"`;
      const action=`<button class="button danger" type="button" onclick="edu164DeleteGame('${game.id}')">🗑 Eliminar juego</button>`;
      const pos=html.indexOf(target);
      if(pos>=0){const close=html.indexOf('</button>',pos);
        if(close>=0)html=html.slice(0,close+9)+action+html.slice(close+9);}
    }
    const archived=all.filter(g=>g.archived_at&&g.teacher_id===(cloud?session?.user?.id:g.teacher_id));
    if(archived.length){
      html+='<section class="magic-panel section"><h3>Historial de juegos eliminados</h3>'
        +'<p class="magic-mini">Conservados para consulta y exportación; ya no están disponibles para jugar. No bloquean la eliminación de su módulo original.</p>'
        +archived.map(g=>'<div class="magic-question"><b>'+e164esc(g.title)+'</b> · '+e164esc(g.archived_class_name||'Módulo antiguo')
          +` <button class="button secondary" onclick="magicGameResults('${g.id}')">Ver resultados</button>`
          +` <button class="button secondary" onclick="edu164ExportGame('${g.id}')">⬇ PDF</button></div>`).join('')
        +'</section>';
    }
    return html;
  };
  const oldResults=magicGameResults;
  magicGameResults=function(gameId){oldResults(gameId);const modal=document.querySelector('#modal .modal');if(!modal)return;const el=document.createElement('button');el.className='button secondary';el.textContent='⬇ Descargar resultados en PDF';el.onclick=()=>e164ExportGame(gameId);modal.insertBefore(el,modal.querySelector('.tablewrap')||modal.firstChild);};
  const oldMissionResults=magicMissionResults;
  magicMissionResults=function(missionId){oldMissionResults(missionId);const modal=document.querySelector('#modal .modal');if(!modal)return;const el=document.createElement('button');el.className='button secondary';el.textContent='⬇ Descargar informe completo de esta misión (PDF)';el.onclick=()=>e164ExportMission(missionId);const anchor=modal.querySelector('.magic-grid');modal.insertBefore(el,anchor||modal.firstChild);};
  // Los historiales antiguos deben conservar el título aunque el juego salga del catálogo.
  // La función pública devuelve solo títulos ligados al token del alumno.
  if(typeof magicShowStudent==='function'){
    const originalStudentLoad=magicShowStudent;
    magicShowStudent=async function(data){
      await originalStudentLoad(data);
      if(!portalToken||!magicState.portal)return;
      if(!cloud){magicState.portal.archivedGameTitles=Object.fromEntries(db.magic_games.filter(g=>g.archived_at).map(g=>[g.id,g.title]));magicRenderStudentExtras();return;}
      try{
        const {data:history,error}=await api.rpc('educlass_v164_archived_game_titles',{p_token:portalToken});
        if(error)throw error;
        magicState.portal.archivedGameTitles=Object.fromEntries((history||[]).map(g=>[g.id,g.title]));
        magicRenderStudentExtras();
      }catch(e){console.warn('Historial de juegos archivados no disponible',e);}
    };
    const originalStudentRender=magicRenderStudentExtras;
    magicRenderStudentExtras=function(){
      originalStudentRender();
      if(magicState.portalTab!=='history')return;
      const p=magicState.portal; if(!p)return;
      const games=p.games||[],archived=p.archivedGameTitles||{};
      const attempts=(p.attempts||[]).slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
      const lines=document.querySelectorAll('#magicPortalTab .eventLine');
      attempts.forEach((a,i)=>{
        const title=games.find(g=>g.id===a.game_id)?.title||archived[a.game_id];
        const span=lines[i]?.querySelector('span');
        if(title&&span&&span.firstChild&&span.firstChild.nodeType===Node.TEXT_NODE)
          span.firstChild.textContent=title;
      });
    };
  }

})();
