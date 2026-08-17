const cfg=globalThis.STORM_PUSH_CONFIG||{};
const host=document.querySelector('#push-app'),toastEl=document.querySelector('#storm-toast');
const qs=s=>document.querySelector(s);const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const DEVICE_KEY='stormhq_push_device_id_v1',SESSION_KEY='stormhq_push_family_session_v1';
const coachMode=new URLSearchParams(location.search).get('coach')==='1';
let session=null,currentTarget=null,targetType='FID';
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),3000)}
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id=(crypto.randomUUID?.()||('dev-'+Date.now()+'-'+Math.random().toString(36).slice(2)));localStorage.setItem(DEVICE_KEY,id)}return id}
function api(action,params={}){return new Promise((resolve,reject)=>{const base=cfg.apiUrl||'';if(!base)return reject(new Error('Storm backend is not configured.'));const cb='storm_push_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;const u=new URL(base);u.searchParams.set('action',action);u.searchParams.set('callback',cb);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))});const finish=(e,d)=>{if(done)return;done=true;clearTimeout(timer);try{delete window[cb]}catch(_){}s.remove();if(e)reject(e);else if(!d||d.ok===false)reject(new Error(d?.error||'Storm request failed.'));else resolve(d)};window[cb]=d=>finish(null,d);s.onerror=()=>finish(new Error('Could not reach Storm HQ.'));s.src=u;s.async=true;document.head.appendChild(s);const timer=setTimeout(()=>finish(new Error('Storm request timed out.')),16000)})}
function ios(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function standalone(){return matchMedia('(display-mode:standalone)').matches||navigator.standalone===true}
function platform(){if(ios())return 'iOS';if(/android/i.test(navigator.userAgent))return 'Android';if(/windows/i.test(navigator.userAgent))return 'Windows';if(/mac/i.test(navigator.userAgent))return 'macOS';return 'Web'}
function browser(){const u=navigator.userAgent;if(/edg/i.test(u))return'Edge';if(/crios|chrome/i.test(u))return'Chrome';if(/safari/i.test(u))return'Safari';if(/firefox/i.test(u))return'Firefox';return'Browser'}
function savedSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
function saveSession(x){session=x;sessionStorage.setItem(SESSION_KEY,JSON.stringify(x))}
function clearSession(){session=null;sessionStorage.removeItem(SESSION_KEY)}
function prefs(){return ['board','schedule','homework','availability','coachMessages'].reduce((o,k)=>(o[k]=Boolean(qs(`[data-pref="${k}"]`)?.checked),o),{})}

async function firebaseRegister(){
  if(!cfg.enabled)throw new Error('Coach has not finished Firebase setup yet.');
  if(!('Notification'in window)||!('serviceWorker'in navigator))throw new Error('Push notifications are not supported on this browser.');
  if(ios()&&!standalone())throw new Error('On iPhone, add Storm HQ to your Home Screen first, then open the installed app and enable notifications.');
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notification permission was not allowed. You can enable it later in phone/browser settings.');
  const reg=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
  const v=cfg.sdkVersion||'12.17.1';
  const appMod=await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`);
  const msgMod=await import(`https://www.gstatic.com/firebasejs/${v}/firebase-messaging.js`);
  if(msgMod.isSupported && !(await msgMod.isSupported()))throw new Error('Firebase messaging is not supported on this browser.');
  let app;try{app=appMod.getApp('storm-push')}catch(e){app=appMod.initializeApp(cfg.firebase,'storm-push')}
  const messaging=msgMod.getMessaging(app);
  // 2026 FCM uses Firebase Installation IDs. Keep a token fallback for browsers/SDKs still transitioning.
  if(typeof msgMod.register==='function'&&typeof msgMod.onRegistered==='function'){
    const fid=await new Promise((resolve,reject)=>{
      let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Push registration timed out. Try once more.'))}},15000);
      const off=msgMod.onRegistered(messaging,id=>{if(settled||!id)return;settled=true;clearTimeout(timer);try{if(typeof off==='function')off()}catch(e){}resolve(id)});
      msgMod.register(messaging,{vapidKey:cfg.vapidKey}).catch(e=>{if(!settled){settled=true;clearTimeout(timer);reject(e)}});
    });
    targetType='FID';currentTarget=fid;
  }else{
    currentTarget=await msgMod.getToken(messaging,{vapidKey:cfg.vapidKey,serviceWorkerRegistration:reg});targetType='TOKEN';
  }
  if(!currentTarget)throw new Error('This device did not return a push registration.');
  if(msgMod.onMessage)msgMod.onMessage(messaging,p=>toast(p?.data?.title||'New Storm update'));
  return currentTarget;
}

function render(){
  const installed=standalone(),perm=('Notification'in window)?Notification.permission:'unsupported',configured=Boolean(cfg.enabled);
  const installCard=installed?`<div class="storm-push-card"><div class="storm-push-status"><i class="storm-push-dot good"></i>Storm HQ Installed</div><h3>App Mode Ready</h3><p class="storm-note">This device launches Storm HQ like an app and is ready for phone alerts.</p></div>`:
    `<div class="storm-push-card"><div class="storm-push-status"><i class="storm-push-dot warn"></i>Install Storm HQ</div><h3>${ios()?'Add to Home Screen':'One-Tap App Install'}</h3>${ios()?`<ol class="storm-install-steps"><li>Tap the Share button in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open Storm HQ from the new icon.</li></ol>`:`<p class="storm-note">Install the app for the fastest launch and the cleanest notification experience.</p><button id="install-app" class="button orange storm-phone-button">Install Storm HQ</button>`}</div>`;
  const login=coachMode?`<div class="storm-push-card"><span class="eyebrow">Coach Device</span><h3>Pair Coach Phone</h3><p class="storm-note">Use the temporary 6-digit pairing code generated inside Coach HQ.</p><div class="storm-push-login"><input id="family-code" maxlength="6" inputmode="numeric" placeholder="6-digit coach pairing code"><button id="login-family" class="button orange">Pair</button></div></div>`:
    `<div class="storm-push-card"><span class="eyebrow">Family Device</span><h3>Connect Your Player</h3><p class="storm-note">Use the same private 4-digit Family Code you already use for Storm HQ.</p><div class="storm-push-login"><input id="family-code" maxlength="4" inputmode="numeric" placeholder="4-digit Family Code"><button id="login-family" class="button orange">Connect</button></div></div>`;
  host.innerHTML=installCard+`<div class="storm-push-card"><div class="storm-push-status"><i class="storm-push-dot ${configured?'good':'warn'}"></i>${configured?'Push System Ready':'Coach Setup In Progress'}</div><h3>Phone Notifications</h3><p class="storm-note">Permission: <b>${esc(perm)}</b>. Firebase: <b>${configured?'connected':'not connected yet'}</b>.</p></div>`+(session?settingsCard():login);
  qs('#install-app')?.addEventListener('click',async()=>{const r=await globalThis.StormPWA.install();if(!r.ok&&r.ios)toast('Use Safari Share → Add to Home Screen.');});
  qs('#login-family')?.addEventListener('click',connectCode);
  qs('#enable-push')?.addEventListener('click',enablePush);
  qs('#save-prefs')?.addEventListener('click',savePrefs);
  qs('#disable-push')?.addEventListener('click',disablePush);
}
function settingsCard(){
  const name=esc(session.playerName||session.label||'Storm Device');
  return `<div class="storm-push-card" style="grid-column:1/-1"><div class="storm-push-status"><i class="storm-push-dot good"></i>${coachMode?'Coach Device':'Connected to '+name}</div><h3>Choose Your Alerts</h3>${coachMode?`<p class="storm-note">Coach alerts include new Family Board posts and system test notifications.</p>`:`<div class="storm-pref">Family Board posts ${toggle('board',true)}</div><div class="storm-pref">Schedule changes ${toggle('schedule',true)}</div><div class="storm-pref">Homework ${toggle('homework',true)}</div><div class="storm-pref">Availability reminders ${toggle('availability',true)}</div><div class="storm-pref">Coach messages ${toggle('coachMessages',true)}</div>`}<button id="enable-push" class="button orange storm-phone-button">⚡ Enable Storm Notifications</button>${!coachMode?'<button id="save-prefs" class="button storm-phone-button">Save Alert Choices</button>':''}<button id="disable-push" class="button ghost storm-phone-button">Disconnect This Phone</button><p class="storm-note">Nothing is sent to advertisers. This device registration stays in the private Storm HQ spreadsheet.</p></div>`;
}
function toggle(k,on){return `<label class="storm-switch"><input data-pref="${k}" type="checkbox" ${on?'checked':''}><span class="storm-slider"></span></label>`}
async function connectCode(){
  const code=qs('#family-code')?.value.replace(/\D/g,'')||'';if(!code)return toast('Enter the code first.');
  try{const r=await api(coachMode?'pushCoachLogin':'pushLogin',{code});saveSession({...r,coach:coachMode});render();toast(coachMode?'Coach phone paired.':'Family Code accepted.');}catch(e){toast(e.message)}
}
async function enablePush(){
  try{qs('#enable-push').disabled=true;qs('#enable-push').textContent='Connecting this phone…';const target=await firebaseRegister();const p=prefs();const r=await api(coachMode?'pushCoachRegister':'pushRegister',{token:session.token,deviceId:deviceId(),target,targetType,targetValue:target,platform:platform(),browser:browser(),deviceLabel:`${platform()} · ${browser()}`,prefs:JSON.stringify(p)});toast('Storm notifications are ON.');qs('#enable-push').textContent='✓ Notifications Enabled';}catch(e){toast(e.message);qs('#enable-push').disabled=false;qs('#enable-push').textContent='⚡ Enable Storm Notifications'}
}
async function savePrefs(){try{await api('pushPrefs',{token:session.token,deviceId:deviceId(),prefs:JSON.stringify(prefs())});toast('Alert choices saved.')}catch(e){toast(e.message)}}
async function disablePush(){try{await api(coachMode?'pushCoachDisable':'pushDisable',{token:session.token,deviceId:deviceId()});clearSession();currentTarget=null;render();toast('This phone was disconnected.')}catch(e){toast(e.message)}}

session=savedSession();if(session&&Boolean(session.coach)!==coachMode){clearSession();session=null}render();
