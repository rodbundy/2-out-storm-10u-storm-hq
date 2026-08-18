/* 2 OUT STORM HQ — PWA + FIREBASE MESSAGING SERVICE WORKER
   SPEED RULE: cache the shell, never intercept Apps Script API calls,
   and NEVER serve a cached Firebase push config. */

const STORM_CACHE='storm-hq-shell-v3';

const STORM_CORE=[
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/meet-the-storm.html', '/storm-tracker.html', '/tryout-center.html',
  '/storm-channel.html', '/storm-homework.html', '/storm-reports.html',
  '/the-shelter.html', '/join-the-storm.html', '/family.html', '/admin.html',
  '/availability.html', '/event-details.html', '/player.html',
  '/storm-development.html', '/website-guide.html', '/storm-notifications.html',
  '/assets/css/styles.css', '/assets/css/storm-pwa.css',
  '/assets/js/config.js', '/assets/js/fallback-data.js', '/assets/js/api.js',
  '/assets/js/site.js', '/assets/js/storm-pwa.js',
  '/assets/img/2out-storm-10u-logo.webp', '/assets/img/storm-logo.svg',
  '/assets/img/icons/icon-192.png', '/assets/img/icons/icon-512.png',
  '/assets/img/icons/icon-512-maskable.png', '/assets/img/icons/badge-96.png'
];

self.addEventListener('notificationclick',event=>{
  const raw=event.notification?.data?.url || '/';
  const url=new URL(raw,self.location.origin).href;
  event.notification.close();

  event.waitUntil((async()=>{
    const clientsList=await clients.matchAll({
      type:'window',
      includeUncontrolled:true
    });

    for(const c of clientsList){
      try{
        if(new URL(c.url).origin===self.location.origin){
          await c.focus();
          if('navigate' in c) await c.navigate(url);
          return;
        }
      }catch(e){}
    }

    if(clients.openWindow) return clients.openWindow(url);
  })());
});

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(STORM_CACHE);
    await Promise.allSettled(STORM_CORE.map(u=>cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();

    await Promise.all(
      keys
        .filter(k=>k.startsWith('storm-hq-shell-') && k!==STORM_CACHE)
        .map(k=>caches.delete(k))
    );

    await clients.claim();
  })());
});

async function networkFirst(req){
  const cache=await caches.open(STORM_CACHE);

  try{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),2800);
    const res=await fetch(req,{signal:ctrl.signal});
    clearTimeout(timer);

    if(res && res.ok) cache.put(req,res.clone());
    return res;
  }catch(e){
    return (await cache.match(req)) || (await cache.match('/offline.html'));
  }
}

async function staleWhileRevalidate(req){
  const cache=await caches.open(STORM_CACHE);
  const cached=await cache.match(req);

  const fresh=fetch(req)
    .then(res=>{
      if(res && res.ok) cache.put(req,res.clone());
      return res;
    })
    .catch(()=>null);

  return cached || (await fresh) || Response.error();
}

self.addEventListener('fetch',event=>{
  const req=event.request;

  if(req.method!=='GET') return;

  const url=new URL(req.url);

  // Never put Apps Script / Google-hosted API traffic behind the PWA cache.
  if(
    url.hostname==='script.google.com' ||
    url.hostname.endsWith('.googleusercontent.com')
  ){
    return;
  }

  if(url.origin!==self.location.origin) return;

  // CRITICAL:
  // Firebase web config must always come from the network.
  // Never cache it and never substitute offline.html for it.
  if(url.pathname==='/assets/js/push-config.js'){
    event.respondWith(
      fetch(req,{cache:'no-store'})
    );
    return;
  }

  if(req.mode==='navigate'){
    // SPEED: pages already visited/pre-cached open immediately. The network
    // refresh happens behind the scenes and is ready for the next visit.
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if(/\.(?:css|js|png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname)){
    event.respondWith(staleWhileRevalidate(req));
  }
});

// Load Firebase push config with a versioned URL so an old browser copy
// cannot keep the previous Firebase API key alive.
try{
  importScripts('/assets/js/push-config.js?v=2');

  const cfg=self.STORM_PUSH_CONFIG||{};

  if(cfg.enabled && cfg.firebase && cfg.firebase.projectId){
    const v=cfg.sdkVersion||'12.17.1';

    importScripts(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
    importScripts(`https://www.gstatic.com/firebasejs/${v}/firebase-messaging-compat.js`);

    firebase.initializeApp(cfg.firebase);

    const messaging=firebase.messaging();

    messaging.onBackgroundMessage(payload=>{
      const data=payload?.data||{};
      const title=data.title||'Storm Update';

      const options={
        body:data.body||'There is a new update from 2 Out Storm.',
        icon:data.icon||cfg.notificationIcon||'/assets/img/icons/icon-192.png',
        badge:data.badge||cfg.notificationBadge||'/assets/img/icons/badge-96.png',
        tag:data.tag||('storm-'+(data.category||'update')),
        renotify:Boolean(data.renotify==='true'),
        data:{url:data.link||cfg.defaultUrl||'/'},
        vibrate:[120,60,120]
      };

      self.registration.showNotification(title,options);
    });
  }
}catch(err){
  console.warn(
    '[Storm HQ] Push worker waiting for Firebase setup.',
    err?.message||err
  );
}
