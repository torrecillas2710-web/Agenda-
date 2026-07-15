var CACHE = 'agenda-v11';
var PRECACHE = ['/'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(PRECACHE); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  var url = new URL(req.url);

  // Never cache API calls (Supabase, fonts, external) — always go to network
  if(url.origin !== self.location.origin){
    e.respondWith(fetch(req).catch(function(){ return new Response('', {status: 503}); }));
    return;
  }

  // For navigation (HTML): network-first, fallback to cache
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var clone = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, clone); });
        return res;
      }).catch(function(){
        return caches.match('/');
      })
    );
    return;
  }

  // Same-origin assets: cache-first
  e.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        if(res && res.status === 200){
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, clone); });
        }
        return res;
      }).catch(function(){
        return cached;
      });
    })
  );
});
