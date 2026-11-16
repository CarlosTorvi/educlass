/* EduClass NFC v16.6: borrado atómico de módulos y misiones sin entregas.
   Cargar después de educlass-v165.js. No concede privilegios en el navegador. */
'use strict';
(function(){
  function count(x){return Number(x||0);}
  function fail(e){alert('No se ha eliminado el módulo. '+(e?.message||String(e))+'\n\nNingún dato del módulo se ha borrado en esta operación.');}
  const previous=window.deleteModule;
  window.deleteModule=async function(cid){
    const c=db.classes.find(x=>x.id===cid);
    if(!c)return alert('El módulo no existe. Actualiza la página.');
    if(!cloud){
      const students=db.students.filter(s=>s.class_id===cid);
      const missions=(db.magic_missions||[]).filter(m=>m.class_id===cid);
      const games=(db.magic_games||[]).filter(g=>g.class_id===cid);
      const submissions=(db.magic_submissions||[]).filter(s=>missions.some(m=>m.id===s.mission_id));
      if(students.length||games.length||submissions.length||missions.some(m=>(m.materials||[]).length)||db.classes.length<=1)
        return alert('No se puede eliminar: existen estudiantes, juegos, entregas, materiales o es el último módulo.');
      if(prompt('Se eliminarán '+missions.length+' misiones vacías y el módulo «'+c.name+'». Escribe ELIMINAR')!=='ELIMINAR')return;
      db.magic_missions=db.magic_missions.filter(m=>m.class_id!==cid);
      if(typeof previous==='function'){
        // El borrado local anterior solo elimina clases vacías; ya retiramos misiones.
        if(currentClassId===cid)currentClassId=db.classes.find(x=>x.id!==cid)?.id||null;
        db.classes=db.classes.filter(x=>x.id!==cid);
        save();page='clases';toast('Módulo y misiones vacías eliminados.');
      }
      return;
    }
    try{
      const {data:preview,error}=await api.rpc('educlass_v166_module_preview',{p_class:cid});
      if(error)throw error;
      const p=preview||{};
      const detail=[
        'Módulo: '+p.name,
        'Estudiantes: '+count(p.students),
        'Juegos todavía asociados: '+count(p.games),
        'Misiones: '+count(p.missions),
        'Entregas: '+count(p.submissions),
        'XP de misiones: '+count(p.mission_xp),
        'Archivos de material: '+count(p.materials)
      ].join('\n');
      if(!p.can_delete){
        alert('No se puede eliminar todavía.\n\n'+detail+'\n\nTraslada a los estudiantes, retira los juegos o conserva/gestiona los registros y archivos pendientes. Nunca se borran evidencias ni recompensas automáticamente.');
        return;
      }
      const confirmation=prompt(detail+'\n\nSe eliminarán las misiones vacías y el módulo. Para confirmar escribe ELIMINAR:');
      if(confirmation!=='ELIMINAR')return;
      const {data,error:deleteError}=await api.rpc('educlass_v166_delete_module',{p_class:cid,p_confirm:confirmation});
      if(deleteError)throw deleteError;
      if(!data?.ok)throw Error('El servidor no ha confirmado el borrado');
      if(currentClassId===cid)currentClassId=db.classes.find(x=>x.id!==cid)?.id||null;
      await loadRemote();page='clases';
      toast('Módulo eliminado en Supabase junto con '+count(data.deleted_empty_missions)+' misiones vacías.');
    }catch(e){fail(e);}
  };
})();
