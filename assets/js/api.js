(function(){
  function config(){ return window.STORM_CONFIG || {}; }
  function hasApi(){ const u=String(config().apiUrl||''); return /^https:\/\/script\.google\.com\/macros\/s\//.test(u) && /\/exec(?:$|\?)/.test(u); }
  function appUrl(page, params){
    if(!hasApi()) return '#connection-needed';
    const u=new URL(config().apiUrl); u.searchParams.set('page',page);
    Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v); });
    return u.toString();
  }
  function backendUnavailable(){ const f=window.STORM_FALLBACK||{}; return {ok:false,connectionError:true,settings:f.settings||{},players:[],calendar:[],announcements:[],videos:[],shoutouts:[],picture:[],gallery:[],tryouts:[],homeworkWeeks:[],eventRosters:[]}; }
  function publicData(){
    return new Promise((resolve,reject)=>{
      if(!hasApi()){ resolve(window.STORM_FALLBACK||{}); return; }
      const cb='storm_cb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      const u=new URL(config().apiUrl); u.searchParams.set('action','public'); u.searchParams.set('callback',cb);
      let done=false;
      window[cb]=data=>{done=true; cleanup(); resolve(data&&data.ok===false?backendUnavailable():data);};
      function cleanup(){ delete window[cb]; s.remove(); }
      s.onerror=()=>{ if(!done){cleanup(); resolve(backendUnavailable());} };
      s.src=u.toString(); document.head.appendChild(s);
      setTimeout(()=>{ if(!done){cleanup(); resolve(backendUnavailable());} },9000);
    });
  }
  window.StormAPI={hasApi,appUrl,publicData};
})();
