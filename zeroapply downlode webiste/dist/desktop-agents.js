import {ACTIVITIES,inside,route,independentActivities} from './agent-routing.js';
const button=document.querySelector('#agents-toggle');
const desktop=matchMedia('(hover: hover) and (pointer: fine)');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const gsap=window.gsap;
const SIZE=58,PAD=58;
let enabled=false,layer=null,bots=[],master=null,bag=[],activityIndex=0,environmentDirty=true,environment=null,stopped=false;
try{enabled=localStorage.getItem('zeroapply-desktop-agents')==='on';}catch{}
function random(){const data=new Uint32Array(1);crypto.getRandomValues(data);return data[0]/4294967296;}
function shuffled(){const a=ACTIVITIES.map((_,i)=>i);for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function readEnvironment(){
 const h=document.querySelector('header').getBoundingClientRect(),r=document.querySelector('.hero .wordmark').getBoundingClientRect();
 const hero=document.querySelector('.hero').getBoundingClientRect();
 const visibleBottom=Math.min(innerHeight,hero.bottom);
 const bounds={left:PAD,right:innerWidth-PAD,top:Math.min(visibleBottom-65,h.bottom+42),bottom:visibleBottom-PAD};
 if(layer)layer.style.clipPath=`inset(${Math.max(0,h.bottom,hero.top)}px 0px ${Math.max(0,innerHeight-hero.bottom)}px 0px)`;
 const obstacle=r.bottom<0||r.top>innerHeight?null:{left:r.left-62,right:r.right+62,top:r.top-64,bottom:r.bottom+66};
 environment={bounds,obstacle};environmentDirty=false;return environment;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function safe(p){const {bounds:b,obstacle:r}=environment;const q={x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)};if(!r||!inside(q,r))return q;
 const options=[{x:r.left-4,y:q.y},{x:r.right+4,y:q.y},{x:q.x,y:r.top-4},{x:q.x,y:r.bottom+4}].filter(v=>v.x>=b.left&&v.x<=b.right&&v.y>=b.top&&v.y<=b.bottom&&!inside(v,r));
 options.sort((a,c)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(c.x-q.x,c.y-q.y));return options[0]??{x:b.left,y:b.top};}
function point(){const b=environment.bounds;for(let tries=0;tries<24;tries++){const p={x:b.left+random()*(b.right-b.left),y:b.top+random()*(b.bottom-b.top)};if(!environment.obstacle||!inside(p,environment.obstacle))return p;}return safe({x:b.left,y:b.bottom});}
function formation(center,count){
 const occupied=[];const offsets=[[0,0],[-76,0],[76,0],[0,76],[0,-76],[-76,76],[76,-76]];
 for(let i=0;i<count;i++){
  let chosen=null;
  for(const [x,y] of offsets){const p=safe({x:center.x+x,y:center.y+y});if(occupied.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>65)){chosen=p;break;}}
  for(let tries=0;!chosen&&tries<30;tries++){const p=point();if(occupied.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>65))chosen=p;}
  occupied.push(chosen??point());
 }
 return occupied;
}
function setExpression(bot,face){bot.el.dataset.face=face;}
function speak(bot,message){bot.bubble.textContent=message;bot.bubble.classList.toggle('speech-left',bot.p.x>innerWidth*.65);}
function move(tl,bot,target,at=0,duration=2.8){
 const start={...(bot.planned??bot.p)},end=safe(target),path=route(start,end,environment.obstacle,environment.bounds);
 if(!path.length)return;
 const points=[start,...path],lengths=path.map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
 const distance=lengths.reduce((sum,length)=>sum+length,0),travel={value:0};
 // One eased travel clock for the entire safe route: no braking at every corner.
 tl.to(travel,{value:1,duration,ease:'sine.inOut',onUpdate:()=>{
  let remaining=travel.value*distance;
  for(let i=0;i<lengths.length;i++){
   if(remaining<=lengths[i]||i===lengths.length-1){const ratio=lengths[i]?Math.min(1,remaining/lengths[i]):1;bot.p.x=points[i].x+(points[i+1].x-points[i].x)*ratio;bot.p.y=points[i].y+(points[i+1].y-points[i].y)*ratio;break;}
   remaining-=lengths[i];
  }
 }},at);
 bot.planned=end;bot.busyUntil=Math.max(bot.busyUntil??0,at+duration);
 tl.to(bot.look,{x:end.x-start.x<0?-2.1:2.1,y:clamp((end.y-start.y)*.012,-1,1),duration:.8,ease:'sine.inOut'},at);
}
const mouse={x:0,y:0,seen:-Infinity,excitedUntil:0};
let previousDraw=0;
function pointerPosition(bot,index,now,dt){
 if(!bot.cursorMood||now>=bot.cursorMood.until){
  const moods=['independent','independent','sleepy','shy','curious','playful'];
  const kind=moods[Math.floor(random()*moods.length)];
  bot.cursorMood={kind,until:now+6+random()*12,interestUntil:now+2.5+random()*2.5};
 }
 const mood=bot.cursorMood.kind;
 const interested=['shy','curious','playful'].includes(mood)&&now<bot.cursorMood.interestUntil;
 const near=now-mouse.seen<.8&&Math.hypot((bot.pointerP??bot.p).x-mouse.x,(bot.pointerP??bot.p).y-mouse.y)<145;
 if(near&&!reduced.matches)bot.scaredUntil=now+1.8;
 const scared=now<(bot.scaredUntil??0)&&!reduced.matches;
 const active=(scared||interested)&&now-mouse.seen<2.4&&!reduced.matches;
 if(!active&&!bot.pointerP)return bot.p;
 if(!bot.pointerP){bot.pointerP={...bot.p};bot.pointerV={x:0,y:0};bot.pointerPlanAt=-Infinity;bot.pointerPath=[];}
 Object.assign(bot.pointerP,safe(bot.pointerP));
 const role=scared?1:mood==='shy'?1:mood==='curious'?0:2;
 let target;
 if(!active)target={...bot.p};
 else if(role===0)target={x:mouse.x-70,y:mouse.y+58};
 else if(role===1){
  const dx=bot.pointerP.x-mouse.x,dy=bot.pointerP.y-mouse.y,d=Math.hypot(dx,dy);
  const angle=bot.escapeAngle??(bot.escapeAngle=random()*Math.PI*2);
  const awayX=d>10?dx/d:Math.cos(angle),awayY=d>10?dy/d:Math.sin(angle);
  target=scared||d<155?{x:mouse.x+awayX*(scared?300:205),y:mouse.y+awayY*(scared?300:205)}:{x:mouse.x+115,y:mouse.y-65};
 }else{const angle=now*.85+index*2;target={x:mouse.x+Math.cos(angle)*125,y:mouse.y+Math.sin(angle)*85};}
 target=safe(target);
 if(now-bot.pointerPlanAt>.24||bot.pointerRole!==role||bot.pointerActive!==active){
  bot.pointerPath=route({...bot.pointerP},target,environment.obstacle,environment.bounds);bot.pointerPlanAt=now;bot.pointerRole=role;bot.pointerActive=active;
 }
 while(bot.pointerPath.length>1&&Math.hypot(bot.pointerPath[0].x-bot.pointerP.x,bot.pointerPath[0].y-bot.pointerP.y)<10)bot.pointerPath.shift();
 const goal=bot.pointerPath[0]??bot.pointerP;
 // Soft pursuit shares the roaming clock; pointer events only update coordinates.
 for(const axis of ['x','y']){bot.pointerV[axis]+=((scared?155:75)*(goal[axis]-bot.pointerP[axis])-(scared?24:17)*bot.pointerV[axis])*dt;bot.pointerP[axis]+=bot.pointerV[axis]*dt;}
 const limited=safe(bot.pointerP);
 if(limited.x!==bot.pointerP.x)bot.pointerV.x=0;if(limited.y!==bot.pointerP.y)bot.pointerV.y=0;
 Object.assign(bot.pointerP,limited);
 if(active){
  setExpression(bot,scared?'surprised':now<mouse.excitedUntil?'excited':role===0?'happy':role===1?'surprised':'curious');
  bot.look.x=clamp((mouse.x-bot.pointerP.x)/45,-2.2,2.2);bot.look.y=clamp((mouse.y-bot.pointerP.y)/100,-1,1);
 }else if(Math.hypot(bot.pointerP.x-bot.p.x,bot.pointerP.y-bot.p.y)<5){bot.pointerP=null;bot.pointerPath=[];setExpression(bot,mood==='sleepy'?'sleepy':mood==='independent'?'curious':'happy');return bot.p;}
 return bot.pointerP;
}
window.addEventListener('pointermove',event=>{if(!layer||!enabled||reduced.matches||event.pointerType!=='mouse')return;mouse.x=event.clientX;mouse.y=event.clientY;mouse.seen=performance.now()/1000;},{passive:true});
window.addEventListener('pointerdown',event=>{if(!layer||event.pointerType!=='mouse'||reduced.matches)return;mouse.x=event.clientX;mouse.y=event.clientY;mouse.seen=performance.now()/1000;mouse.excitedUntil=mouse.seen+1;},{passive:true});
document.documentElement.addEventListener('pointerleave',()=>{mouse.seen=-Infinity;},{passive:true});
function draw(){
 if(environmentDirty){readEnvironment();for(const bot of bots){const p=safe(bot.p);bot.p.x=p.x;bot.p.y=p.y;}}
 const now=performance.now()/1000,dt=previousDraw?Math.min(.032,Math.max(.001,now-previousDraw)):1/60;previousDraw=now;
 for(const [index,bot] of bots.entries()){Object.assign(bot.p,safe(bot.p));const visiblePosition=pointerPosition(bot,index,now,dt);bot.el.style.transform=`translate3d(${visiblePosition.x-SIZE/2}px,${visiblePosition.y-SIZE/2}px,0)`;bot.gaze.style.transform=`translate3d(${clamp(bot.look.x,-2.2,2.2)}px,${clamp(bot.look.y,-1,1)}px,0)`;}
}
function create(){
 if(layer)return;
 layer=document.createElement('div');layer.className='desktop-agent-layer';layer.setAttribute('aria-hidden','true');
 const skins=[['blue','agent-avatar.png'],['black','roaming-black.png'],['white','roaming-white.png']];
 bots=skins.map(([name,src],i)=>{
  const el=document.createElement('div');el.className=`roaming-bot bot-${name}`;el.dataset.face='happy';
  el.innerHTML=`<div class="roamer-body"><img src="${src}" alt="" draggable="false" width="256" height="256"><div class="roamer-visor"><div class="roamer-gaze"><div class="roamer-eyes"><i></i><i></i></div></div><span class="roamer-mouth"></span></div><span class="roamer-emotion"></span></div><div class="roamer-shadow"></div><div class="roamer-bubble"></div>`;
  layer.append(el);return{el,body:el.querySelector('.roamer-body'),eyes:el.querySelector('.roamer-eyes'),gaze:el.querySelector('.roamer-gaze'),bubble:el.querySelector('.roamer-bubble'),p:{x:90+i*95,y:innerHeight-85},look:{x:0,y:0}};
 });
 document.body.append(layer);readEnvironment();for(const bot of bots)Object.assign(bot.p,safe(bot.p));draw();
}
const soloPoses={bounce:{y:-15,rotation:5},spin:{rotation:360},dance:{rotation:15,y:-8},peek:{scale:.78,y:8},nap:{rotation:-12,scale:.92},stretch:{scaleX:1.12,scaleY:.88},jump:{y:-24,rotation:-8},balance:{rotation:18},giggle:{rotation:9,y:-4},surprise:{scale:1.14,y:-12},wave:{rotation:15},celebrate:{y:-18,rotation:12},sulk:{rotation:-12,y:7},shake:{rotation:12},wander:{y:-5},suggest:{y:-7}};
function solo(tl,bot,activity,delay=0){
 const [name,kind,mood]=activity;
 bot.el.dataset.activity=name;setExpression(bot,mood);
 const departure=delay+random()*.7,travel=2.1+random()*1.2;
 move(tl,bot,point(),departure,travel);
 const duration=kind==='spin'?1.35+random()*.4:.35+random()*.3;
 tl.to(bot.body,{...(soloPoses[kind]??{y:-5}),duration,ease:'sine.inOut',yoyo:true,repeat:kind==='spin'?1:3},departure+travel+.15);
 bot.busyUntil=Math.max(bot.busyUntil,departure+travel+.15+duration*(kind==='spin'?2:4));
}
function next(){
 if(stopped||!enabled||!desktop.matches||document.hidden)return;
 readEnvironment();if(!bag.length)bag=shuffled();activityIndex=bag.pop();const [name,kind,mood]=ACTIVITIES[activityIndex];
 layer.dataset.activity=name;
 master?.kill();
 const tl=gsap.timeline({paused:true,onUpdate:draw,onComplete:next});master=tl;
 for(const bot of bots){bot.planned={...bot.p};bot.busyUntil=0;bot.bubble.classList.remove('speech-below');setExpression(bot,['happy','curious','sleepy'][bots.indexOf(bot)]);tl.set(bot.bubble,{opacity:0,y:5},0);tl.set(bot.body,{x:0,rotation:0,y:0,scale:1},0);tl.to(bot.look,{x:0,y:0,duration:.7,ease:'sine.inOut'},0);}
 const lead=bots[activityIndex%3],other=bots[(activityIndex+1)%3],third=bots[(activityIndex+2)%3];
 const center=point();
 const personal=independentActivities(activityIndex,random);
 if(['nav'].includes(kind)){
  const selectors=['a[href="#approach"]','a[href="#agent"]','a[href="#questions"]'];const link=document.querySelector(`#nav-links ${selectors[activityIndex===8?0:activityIndex===20?1:2]}`);const box=link.getBoundingClientRect();
  setExpression(lead,'curious');lead.el.dataset.activity=name;
  move(tl,lead,{x:box.left+box.width/2,y:document.querySelector('header').getBoundingClientRect().bottom+48},0,2.7);
  solo(tl,other,personal[0],.3);solo(tl,third,personal[1],.7);
  tl.to(link.querySelector('.glass-label'),{y:-3,rotation:2,duration:.3,yoyo:true,repeat:3,ease:'sine.inOut'},3.4);
  tl.to(lead.body,{rotation:12,y:-11,duration:.38,yoyo:true,repeat:3,ease:'sine.inOut'},3.2);
  lead.busyUntil=7.3;lead.bubble.classList.add('speech-below');
  speak(lead,activityIndex===8?'Let’s see how it works.':activityIndex===20?'Our agent loves the details.':'Questions? We’re curious too.');
 }else if(['chase','race','roundtrip','zigzag','dodge'].includes(kind)){
  const destinations=formation(point(),3);bots.forEach((bot,i)=>move(tl,bot,destinations[i],i*.24,kind==='race'?1.8:3.2));
  bots.forEach((bot,i)=>{bot.el.dataset.activity=['Leading the chase','Dodging and following','Racing to catch up'][i];setExpression(bot,['excited','surprised','happy'][i]);tl.to(bot.body,{...([{y:-11,rotation:5},{rotation:-13},{y:-5,scaleX:1.07,scaleY:.94}][i]),duration:.28+i*.13,yoyo:true,repeat:3+i%2*2,ease:'sine.inOut'},.15+i*.43);});
  speak(lead,kind==='race'?'Last one there checks the résumé!':'Follow me, team!');
 }else if(['bump','highfive','nudge','greet','hide','orbit'].includes(kind)){
  const [left,right]=formation(center,2);move(tl,lead,left,0,2.5);move(tl,other,right,.2,2.4);solo(tl,third,personal[0],.5);lead.el.dataset.activity=name;other.el.dataset.activity='Playful reaction';
  tl.to(lead.body,{rotation:17,x:12,duration:.35,yoyo:true,repeat:1,ease:'sine.inOut'},3.1);tl.to(other.body,{rotation:-17,x:-12,duration:.35,yoyo:true,repeat:1,ease:'sine.inOut'},3.1);
  tl.to([lead.body,other.body],{x:0,rotation:0,duration:.6,ease:'sine.inOut'},3.9);
  lead.busyUntil=Math.max(lead.busyUntil,4.55);other.busyUntil=Math.max(other.busyUntil,4.55);
  tl.call(()=>{setExpression(lead,'surprised');setExpression(other,'grumpy');},[],3.1);tl.call(()=>{setExpression(lead,'happy');setExpression(other,'happy');},[],4.1);
  speak(lead,kind==='highfive'?'Teamwork!':kind==='nudge'?'Oops. Friends again?':'Boop!');
 }else{
  solo(tl,lead,personal[0],0);solo(tl,other,personal[1],.35);solo(tl,third,personal[2],.75);
  const tips=['Download ZeroApply for your next move.','Got a résumé? Bring it along.','Try the AI agent demo below.','A little less busywork.','Your next chapter starts with you.','Take a breath. You’ve got this.'];
  speak(lead,kind==='nap'?'Recharging a little…':kind==='sulk'?'No snacks? Okay, back to work.':tips[activityIndex%tips.length]);
 }
 // Expressions and blinks share the activity clock, and the entire clock pauses when hidden.
 for(const [i,bot] of bots.entries()){
  tl.to(bot.eyes,{scaleY:.15,duration:.12,ease:'sine.inOut'},1.35+i*.83).to(bot.eyes,{scaleY:1,duration:.22,ease:'sine.out'},1.49+i*.83);
  tl.to(bot.look,{x:i%2?-1.6:1.6,y:0,duration:.9,ease:'sine.inOut'},4.2+i*.63);
 }
 // Tips are occasional, short, and never intercept the visitor’s clicks.
 if(activityIndex%3===0||kind==='suggest'||kind==='nav')tl.to(lead.bubble,{opacity:1,y:0,duration:.45},4.4).to(lead.bubble,{opacity:0,y:-3,duration:.45},7.1);
 // Fill each bot’s otherwise idle tail with its own gentle trip; all finish together.
 for(const bot of bots){const start=Math.min(8.8,bot.busyUntil+.08);move(tl,bot,point(),start,10-start);}
 tl.play();
}
function dispose(){master?.kill();gsap.set(document.querySelectorAll('#nav-links .glass-label'),{clearProps:'transform'});master=null;layer?.remove();layer=null;bots=[];}
function onHomepage(){
 const fragment=location.hash;
 if(fragment&&fragment!=='#main')return false;
 const hero=document.querySelector('.hero').getBoundingClientRect();
 const header=document.querySelector('header').getBoundingClientRect();
 return hero.top<=header.bottom+32&&hero.bottom>header.bottom+130;
}
function sync(){
 const available=desktop.matches;button.hidden=!available;button.setAttribute('aria-pressed',String(enabled));button.querySelector('.agents-state').textContent=enabled?'On':'Off';
 if(!available||!enabled||!onHomepage()){dispose();return;}
 create();
 if(document.hidden||reduced.matches){master?.pause();return;}
 if(master&&master.progress()<1)master.play();else next();
}
button.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('zeroapply-desktop-agents',enabled?'on':'off');}catch{}sync();});
const invalidate=()=>{environmentDirty=true;sync();};window.addEventListener('scroll',invalidate,{passive:true});
window.addEventListener('resize',()=>{environmentDirty=true;if(layer){master?.kill();master=null;readEnvironment();bots.forEach(bot=>Object.assign(bot.p,safe(bot.p)));draw();}sync();},{passive:true});
window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);
 document.addEventListener('click',event=>{if(event.target.closest('a[href^="#"]'))queueMicrotask(sync);});
 desktop.addEventListener('change',sync);reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
window.addEventListener('pagehide',()=>{stopped=true;dispose();},{once:true});
sync();
