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

  // Add "Log Session" action for block-ending notifications
  const actions=[];
  if(data.type==='block-end'&&data.subjectId){
    actions.push({action:'log-session',title:'📝 Log Session'});
  }

  e.waitUntil(
    self.registration.showNotification(data.title||'StudyTrack 📚',{
      body:data.body||'',
      icon:data.icon||'',
      badge:data.badge||'',
      tag:data.tag||'studytrack',
      renotify:true,
      actions:actions,
      data:{url:data.url||'/studytrack/',subjectId:data.subjectId||null,type:data.type||null}
    })
  );
});

// Tap notification → open/focus the app
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const notifData=e.notification.data||{};
  const subjectId=notifData.subjectId;

  // If user tapped "Log Session" action, go straight to log page with subject pre-selected
  let url='/studytrack/';
  if(e.action==='log-session'&&subjectId){
    url='/studytrack/?startlog='+encodeURIComponent(subjectId)+'#log';
  } else if(notifData.url){
    url=notifData.url;
  }

  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('studytrack')&&'focus' in c){
          // If we need to go to timer with a subject, post a message to the page
          if(e.action==='log-session'&&subjectId){
            c.postMessage({type:'log-session',subjectId:subjectId});
            return c.focus();
          }
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
