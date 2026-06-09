var CACHE = 'agenda-v5';

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  // Delete old caches
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  // Network first for HTML, cache first for others
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).then(function(res){
        return caches.open(CACHE).then(function(c){
          c.put(e.request, res.clone());
          return res;
        });
      }).catch(function(){
        return caches.match('/');
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r || fetch(e.request).then(function(res){
        return caches.open(CACHE).then(function(c){
          c.put(e.request, res.clone());
          return res;
        });
      }).catch(function(){
        return caches.match('/');
      });
    })
  );
});
