// STORM HQ PWA BOOT — intentionally tiny and non-blocking.
(()=>{
  const state={installPrompt:null,reg:null};
  const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
  const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));

  addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;emit('storm:install-ready',{});});
  addEventListener('appinstalled',()=>{state.installPrompt=null;localStorage.setItem('stormhq_installed','1');emit('storm:installed',{});});

  async function registerWorker(){
    if(!('serviceWorker' in navigator)||location.protocol!=='https:')return null;
    try{state.reg=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'});return state.reg;}catch(e){console.warn('[Storm HQ] service worker:',e);return null;}
  }
  function idle(fn){if('requestIdleCallback'in window)requestIdleCallback(fn,{timeout:1800});else setTimeout(fn,350);}
  addEventListener('load',()=>idle(registerWorker),{once:true});

  window.StormPWA={
    isStandalone,isIOS,
    worker:()=>state.reg||navigator.serviceWorker?.ready||null,
    async install(){
      if(isStandalone())return {ok:true,installed:true};
      if(state.installPrompt){
        await state.installPrompt.prompt();
        const choice=await state.installPrompt.userChoice;
        state.installPrompt=null;
        return {ok:choice.outcome==='accepted',outcome:choice.outcome};
      }
      return {ok:false,ios:isIOS(),reason:'manual'};
    }
  };
})();
