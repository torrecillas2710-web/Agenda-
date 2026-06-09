var CACHE = 'agenda-v6';
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

  // For navigation (HTML pages): network-first, fallback to cache
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

  // For everything else: cache-first, then network (works offline)
  e.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type !== 'opaque'){
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
