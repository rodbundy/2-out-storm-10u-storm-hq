(function(){
  // STORM HQ SPEED STEP 6
  // Persistent stale-while-revalidate public-data cache.
  //
  // Goal:
  // - Do NOT make returning visitors wait on Apps Script every 90 seconds.
  // - Show the last successful public payload immediately.
  // - Refresh it quietly in the background.
  // - Never cache private Family Portal / Coach Control data here.

  const CACHE_KEY='stormhq_public_v2';
  const LEGACY_CACHE_KEY='stormhq_public_v1';

  // Fresh data can be used without any network request.
  const FRESH_MS=5*60*1000;          // 5 minutes

  // Older successful public data may still paint the page immediately while
  // a fresh copy is fetched in the background.
  const STALE_MAX_MS=6*60*60*1000;   // 6 hours

  let memoryCache=null;
  let inFlight=null;

  function config(){ return window.STORM_CONFIG || {}; }

  function hasApi(){
    const u=String(config().apiUrl||'');
    return /^https:\/\/script\.google\.com\/macros\/s\//.test(u) &&
           /\/exec(?:$|\?)/.test(u);
  }

  function appUrl(page,params){
    if(!hasApi()) return '#connection-needed';
    const u=new URL(config().apiUrl);
    u.searchParams.set('page',page);
    Object.entries(params||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v);
    });
    return u.toString();
  }

  function backendUnavailable(){
    const f=window.STORM_FALLBACK||{};
    return {
      ok:false,
      connectionError:true,
      settings:f.settings||{},
      players:[],
      calendar:[],
      announcements:[],
      videos:[],
      shoutouts:[],
      picture:[],
      gallery:[],
      tryouts:[],
      homeworkWeeks:[],
      eventRosters:[],
      playerStats:[]
    };
  }

  function validCached(cached){
    return !!(cached && cached.savedAt && cached.data && cached.data.ok!==false);
  }

  function storageRead(storage,key){
    try{
      const raw=storage.getItem(key);
      if(!raw)return null;
      const cached=JSON.parse(raw);
      return validCached(cached)?cached:null;
    }catch(e){
      return null;
    }
  }

  function storageWrite(storage,key,value){
    try{storage.setItem(key,JSON.stringify(value));}catch(e){}
  }

  function storageRemove(storage,key){
    try{storage.removeItem(key);}catch(e){}
  }

  function readCacheRecord(){
    if(validCached(memoryCache)) return memoryCache;

    // localStorage survives closing/reopening the browser, which is the key
    // improvement over the previous sessionStorage-only 90 second cache.
    let cached=storageRead(localStorage,CACHE_KEY);

    // During rollout, accept the previous cache once so users do not lose the
    // benefit of a payload they already downloaded.
    if(!cached){
      cached=storageRead(sessionStorage,LEGACY_CACHE_KEY);
      if(cached){
        storageWrite(localStorage,CACHE_KEY,cached);
      }
    }

    if(!cached){
      cached=storageRead(sessionStorage,CACHE_KEY);
    }

    if(!cached)return null;

    const age=Date.now()-Number(cached.savedAt||0);
    if(!Number.isFinite(age) || age<0 || age>=STALE_MAX_MS){
      storageRemove(localStorage,CACHE_KEY);
      storageRemove(sessionStorage,CACHE_KEY);
      storageRemove(sessionStorage,LEGACY_CACHE_KEY);
      return null;
    }

    memoryCache=cached;
    return cached;
  }

  function writeCache(data){
    if(!data || data.ok===false)return;
    const cached={savedAt:Date.now(),data:data};
    memoryCache=cached;
    storageWrite(localStorage,CACHE_KEY,cached);
    storageWrite(sessionStorage,CACHE_KEY,cached);
    storageRemove(sessionStorage,LEGACY_CACHE_KEY);
  }

  function notifyFreshData(data){
    try{
      window.dispatchEvent(new CustomEvent('stormhq:public-updated',{
        detail:{data:data}
      }));
    }catch(e){}
  }

  function fetchPublic(options){
    options=options||{};
    const background=!!options.background;

    if(inFlight)return inFlight;

    inFlight=new Promise((resolve)=>{
      if(!hasApi()){
        resolve(window.STORM_FALLBACK||{});
        inFlight=null;
        return;
      }

      const cb='storm_cb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      const u=new URL(config().apiUrl);
      u.searchParams.set('action','public');
      u.searchParams.set('callback',cb);
      // Prevent an intermediary browser/proxy cache from holding onto the JSONP
      // response while Apps Script itself continues to use its safe server cache.
      u.searchParams.set('_',String(Date.now()));

      let done=false;
      let timeout=null;

      function cleanup(){
        try{delete window[cb];}catch(e){}
        try{s.remove();}catch(e){}
        if(timeout)clearTimeout(timeout);
        inFlight=null;
      }

      function finish(data){
        if(done)return;
        done=true;
        cleanup();

        const good=data && data.ok!==false;
        if(good){
          writeCache(data);
          if(background)notifyFreshData(data);
          resolve(data);
          return;
        }

        resolve(backendUnavailable());
      }

      window[cb]=finish;
      s.onerror=()=>finish(backendUnavailable());
      s.src=u.toString();
      document.head.appendChild(s);

      timeout=setTimeout(()=>finish(backendUnavailable()),45000);
    });

    return inFlight;
  }

  function publicData(){
    if(!hasApi())return Promise.resolve(window.STORM_FALLBACK||{});

    const cached=readCacheRecord();

    if(cached){
      const age=Date.now()-Number(cached.savedAt||0);

      // Truly fresh: zero network work.
      if(age<FRESH_MS){
        return Promise.resolve(cached.data);
      }

      // Stale-while-revalidate:
      // paint the site immediately from the last successful payload, then
      // quietly fetch a fresh one for the next navigation/current-page listener.
      fetchPublic({background:true}).catch(()=>{});
      return Promise.resolve(cached.data);
    }

    // First-ever visit on this browser still needs one real backend request.
    return fetchPublic({background:false});
  }

  function clearPublicCache(){
    memoryCache=null;
    storageRemove(localStorage,CACHE_KEY);
    storageRemove(sessionStorage,CACHE_KEY);
    storageRemove(sessionStorage,LEGACY_CACHE_KEY);
  }

  window.StormAPI={
    hasApi,
    appUrl,
    publicData,
    clearPublicCache,
    refreshPublicData:()=>fetchPublic({background:true})
  };
})();
