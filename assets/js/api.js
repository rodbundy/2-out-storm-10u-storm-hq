(function(){
  const CACHE_KEY='stormhq_public_v1';
  const CACHE_MS=90*1000; // 90 seconds: fast page-to-page navigation without letting team data stay stale for long.
  let memoryCache=null;
  let inFlight=null;

  function config(){ return window.STORM_CONFIG || {}; }
  function hasApi(){ const u=String(config().apiUrl||''); return /^https:\/\/script\.google\.com\/macros\/s\//.test(u) && /\/exec(?:$|\?)/.test(u); }

  function appUrl(page, params){
    if(!hasApi()) return '#connection-needed';
    const u=new URL(config().apiUrl); u.searchParams.set('page',page);
    Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v); });
    return u.toString();
  }

  function backendUnavailable(){
    const f=window.STORM_FALLBACK||{};
    return {ok:false,connectionError:true,settings:f.settings||{},players:[],calendar:[],announcements:[],videos:[],shoutouts:[],picture:[],gallery:[],tryouts:[],homeworkWeeks:[],eventRosters:[],playerStats:[]};
  }

  function readCache(){
    if(memoryCache && (Date.now()-memoryCache.savedAt)<CACHE_MS) return memoryCache.data;
    try{
      const raw=sessionStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      const cached=JSON.parse(raw);
      if(!cached || !cached.savedAt || !cached.data) return null;
      if((Date.now()-cached.savedAt)>=CACHE_MS){ sessionStorage.removeItem(CACHE_KEY); return null; }
      memoryCache=cached;
      return cached.data;
    }catch(e){ return null; }
  }

  function writeCache(data){
    if(!data || data.ok===false) return;
    const cached={savedAt:Date.now(),data:data};
    memoryCache=cached;
    try{ sessionStorage.setItem(CACHE_KEY,JSON.stringify(cached)); }catch(e){}
  }

  function fetchPublic(){
    if(inFlight) return inFlight;
    inFlight=new Promise((resolve)=>{
      if(!hasApi()){ resolve(window.STORM_FALLBACK||{}); return; }
      const cb='storm_cb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      const u=new URL(config().apiUrl); u.searchParams.set('action','public'); u.searchParams.set('callback',cb);
      let done=false;

      function finish(data){
        if(done) return;
        done=true;
        cleanup();
        if(data && data.ok!==false) writeCache(data);
        resolve(data&&data.ok===false?backendUnavailable():data);
      }
      function cleanup(){ delete window[cb]; s.remove(); inFlight=null; }

      window[cb]=finish;
      s.onerror=()=>finish(backendUnavailable());
      s.src=u.toString();
      document.head.appendChild(s);
      setTimeout(()=>finish(backendUnavailable()),45000);
    });
    return inFlight;
  }

  function publicData(){
    if(!hasApi()) return Promise.resolve(window.STORM_FALLBACK||{});
    const cached=readCache();
    if(cached) return Promise.resolve(cached);
    return fetchPublic();
  }

  function clearPublicCache(){
    memoryCache=null;
    try{ sessionStorage.removeItem(CACHE_KEY); }catch(e){}
  }

  window.StormAPI={hasApi,appUrl,publicData,clearPublicCache};
})();
