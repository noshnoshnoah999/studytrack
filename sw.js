// StudyTrack Service Worker — handles background push notifications
const CACHE='studytrack-v2';

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

  // Client-side stale check — drop notifications that arrived too late.
  // Two mechanisms:
  //   1. expiresAt (explicit deadline set per-notification): always respected.
  //   2. sentAt fallback: for time-sensitive notification types, drop if
  //      delivered more than 20 minutes after it was sent — even if expiresAt
  //      is missing (e.g. old queued messages from before the fix was deployed).
  const now=Date.now();
  if(data.expiresAt&&now>data.expiresAt){
    console.log('[SW] Stale (expiresAt, expired '+Math.round((now-data.expiresAt)/1000)+'s ago):',data.tag);
    return;
  }
  const TIME_SENSITIVE=['soon-','started-','end-','break-end-','todo-'];
  if(data.sentAt&&TIME_SENSITIVE.some(p=>(data.tag||'').startsWith(p))&&now>data.sentAt+20*60*1000){
    console.log('[SW] Stale (sentAt, '+Math.round((now-data.sentAt)/60000)+'min late):',data.tag);
    return;
  }

  const actions=[];
  if(data.type==='block-start'&&data.subjectId){
    actions.push({action:'start-timer',title:'▶ Start Timer'});
  }
  if(data.type==='block-end'&&data.subjectId){
    actions.push({action:'stop-log',title:'⏹ Stop & Log'});
  }

  e.waitUntil(
    self.registration.showNotification(data.title||'StudyTrack 📚',{
      body:data.body||'',
      icon:data.icon||'',
      badge:data.badge||'',
      tag:data.tag||'studytrack',
      renotify:true,
      actions:actions,
      data:{url:data.url||'/studytrack/',subjectId:data.subjectId||null,type:data.type||null,blockStart:data.blockStart||null}
    })
  );
});

// Tap notification or action button
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const notifData=e.notification.data||{};
  const subjectId=notifData.subjectId;
  const blockStart=notifData.blockStart;

  let url='/studytrack/';
  let msgType=null;

  if(e.action==='start-timer'&&subjectId){
    url='/studytrack/?starttimer='+encodeURIComponent(subjectId)+(blockStart?'&blockstart='+encodeURIComponent(blockStart):'');
    msgType='start-timer';
  } else if(e.action==='stop-log'){
    url='/studytrack/?stoplog=1';
    msgType='stop-log';
  } else {
    url=notifData.url||'/studytrack/';
  }

  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('studytrack')&&'focus' in c){
          if(msgType==='start-timer'){
            c.postMessage({type:'start-timer',subjectId:subjectId,blockStart:blockStart||null});
          } else if(msgType==='stop-log'){
            c.postMessage({type:'stop-log'});
          }
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
