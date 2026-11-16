/* EduClass NFC v16.5 — eliminar del historial docente sin borrar las evidencias del alumno.
   Requiere educlass-v164.js y educlass-v165.sql. */
'use strict';
(function(){
  if(typeof magicTeacherGames!=='function' || typeof db==='undefined'){
    console.error('EduClass v16.5 requiere los scripts base y v16.4.');return;
  }
  const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.edu165PurgeGame=async function(gameId){
    const game=db.magic_games.find(g=>g.id===gameId);
    if(!game||!game.archived_at||game.purged_at){alert('El juego no está disponible para eliminar.');return;}
    const count=(db.magic_attempts||[]).filter(a=>a.game_id===gameId).length;
    const description='Eliminar DEFINITIVAMENTE del historial docente: «'+game.title+'»?\n\n'
      +'Se suprimirá la definición del juego (preguntas y respuestas) y dejará de aparecer en los juegos eliminados.\n'
      +(count?'Se CONSERVARÁN '+count+' partidas, fechas, puntuaciones, puntos y XP en el perfil del alumnado.':'No hay partidas registradas.')
      +'\nEsta acción NO se puede deshacer desde EduClass.';
    if(!confirm(description))return;
    if(prompt('Escribe ELIMINAR DEFINITIVAMENTE para confirmar:')!=='ELIMINAR DEFINITIVAMENTE')return;
    try{
      if(cloud){
        const {error}=await api.rpc('educlass_v165_purge_archived_game',{p_game:gameId});
        if(error)throw error;
        await loadRemote();
      }else{
        game.purged_at=new Date().toISOString();
        game.items=[];game.published=false;game.class_id=null;
        save();
      }
      if(typeof closeModal==='function')closeModal();
      toast('Juego retirado definitivamente del historial docente. Resultados y recompensas conservados.');
      go('magic-games');
    }catch(error){alert('No se pudo retirar el juego: '+(error?.message||String(error)));}
  };

  // Mantener intactas las funciones de v16.4 (incluidos los dos informes PDF).
  const previous=magicTeacherGames;
  magicTeacherGames=function(){
    const original=db.magic_games;
    let html;
    try{
      // Los juegos ya depurados no vuelven a aparecer en el historial docente.
      db.magic_games=original.filter(g=>!g.purged_at);
      html=previous();
    }finally{db.magic_games=original;}

    // Solo añadimos el botón para los juegos previamente archivados y propios.
    const owner=cloud?session?.user?.id:null;
    for(const game of original){
      if(!game.archived_at||game.purged_at)continue;
      if(cloud&&game.teacher_id!==owner)continue;
      const needle=`onclick="edu164ExportGame('${game.id}')">⬇ PDF</button>`;
      if(!html.includes(needle))continue;
      const action=` <button class="button secondary" style="color:#a52a39" type="button" onclick="edu165PurgeGame('${game.id}')">🗑 Eliminar definitivamente</button>`;
      html=html.replace(needle,needle+action);
    }
    return html;
  };
})();
