// StudyTrack Service Worker — handles background push notifications
const CACHE='studytrack-v1';

self.addEventListener('install',e=>{
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(clients.claim());
});

// Show notification when a push arrives
self.addEventListener('push',e=>{
  if(!e.data)return;
  let data;
  try{data=e.data.json();}catch(err){data={title:'StudyTrack',body:e.data.text()};}
  e.waitUntil(
    self.registration.showNotification(data.title||'StudyTrack 📚',{
      body:data.body||'',
      icon:data.icon||'',
      badge:data.badge||'',
      tag:data.tag||'studytrack',
      renotify:true,
      data:{url:data.url||'/studytrack/'}
    })
  );
});

// Tap notification → open/focus the app
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data&&e.notification.data.url?e.notification.data.url:'/studytrack/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('studytrack')&&'focus' in c)return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
