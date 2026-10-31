(()=>{
const root=document.querySelector('#agent');if(!root||!window.gsap)return;
const workspace=root.querySelector('.agent-workspace'),pointer=root.querySelector('.agent-pointer'),control=root.querySelector('#agent-motion');
const fields=['name','email','location'].map(id=>root.querySelector(`#agent-${id}`)),values=['Vijay','vijayzeroapply@gmail.com','Hyderabad, India'];
const rows=[...root.querySelectorAll('.agent-job')],jobs=[['Frontend Developer','Northstar Studio · Remote'],['Product Design Intern','Studio Forma · Hybrid'],['Software Engineer','Orbit Labs · Hybrid']];
const preference=matchMedia('(prefers-reduced-motion: reduce)');let timeline,visible=false,userPaused=false,lastWidth=0;
const node=s=>root.querySelector(s),text=(el,v)=>{if(el.textContent!==v)el.textContent=v;},clamp=v=>Math.max(0,Math.min(1,v));
function render(){const now=timeline.time(),job=Math.min(2,Math.floor(now/12)),t=now-job*12;
text(node('#agent-job-title'),jobs[job][0]);text(node('#agent-company'),jobs[job][1]);text(node('.agent-next-job'),`NEXT UP → ${jobs[(job+1)%3][0].toUpperCase()}`);
rows.forEach((r,i)=>{r.classList.toggle('is-selected',i===job);r.classList.toggle('is-complete',i<job||(i===job&&t>=9.2));});
const ranges=[[2.05,2.9],[3.25,4.65],[4.9,5.65]];fields.forEach((f,i)=>{const[a,b]=ranges[i];text(f.querySelector('.typed-value'),values[i].slice(0,Math.floor(values[i].length*clamp((t-a)/(b-a)))));f.classList.toggle('is-filling',t>=a-.15&&t<b+.1);});
const label=t<.8?'Choosing an opportunity':t<2?'Opening the application':t<5.7?'Filling in your profile':t<7.4?'Uploading Vijay_Resume.pdf':t<8.4?'Checking the final details':t<9.2?'Submitting the application':'Application sent. Moving to the next one.';
text(node('#agent-status'),preference.matches?'Example application · reduced motion':label);text(node('#agent-count'),`${Math.min(3,job+(t>=9.2?1:0))} / 3 APPLICATIONS`);}
function point(el,fx=.35,fy=.5){const a=el.getBoundingClientRect(),b=workspace.getBoundingClientRect();return{x:a.left-b.left+a.width*fx,y:a.top-b.top+a.height*fy};}
function build(){const old=timeline?.time()??0;timeline?.kill();const form=node('.agent-form-fields');gsap.set(form,{y:0});
const spots={jobs:rows.map(r=>point(r,.54)),name:point(fields[0],.3),email:point(fields[1],.4),location:point(fields[2],.4),upload:point(node('.agent-drop'),.48),submit:point(node('.agent-submit'),.55)};
const drag=node('.agent-drag-pdf'),eyes=root.querySelectorAll('.agent-eye'),success=node('.agent-success'),submit=node('.agent-submit-row'),scroll=node('.agent-scroll-thumb'),before=node('.upload-before'),after=node('.upload-after'),progress=node('.agent-upload-progress'),click=node('.agent-click-ring'),mascot=node('.agent-mascot');
const tl=gsap.timeline({paused:true,repeat:-1,onUpdate:render,defaults:{ease:'power2.inOut',duration:.75}});timeline=tl;
tl.set(pointer,{x:spots.jobs[0].x,y:spots.jobs[0].y,scale:1,opacity:1,force3D:true},0);
for(let job=0;job<3;job++){const at=t=>job*12+t,move=(p,t,d=.75)=>tl.to(pointer,{x:p.x,y:p.y,duration:d,force3D:true},at(t));
tl.set(pointer,{scale:1,opacity:1},at(0));tl.set(form,{y:0},at(0));tl.set(scroll,{y:0},at(0));tl.set([submit,success,after,drag,click],{opacity:0},at(0));tl.set(before,{opacity:1},at(0));tl.set(progress,{scaleX:0},at(0));
move(spots.jobs[job],.12);tl.to(node('.agent-arrow'),{scale:.91,duration:.14},at(.77)).to(node('.agent-arrow'),{scale:1,duration:.22},at(.87));tl.fromTo(node('.application-heading'),{y:8,opacity:.25},{y:0,opacity:1,duration:.5,immediateRender:false},at(.95));
move(spots.name,1.25);move(spots.email,2.65,.58);move(spots.location,4.3,.58);
const origin={x:Math.max(8,spots.upload.x-85),y:spots.upload.y-35};move(origin,5.55,.5);tl.set(drag,{x:origin.x+15,y:origin.y+17,scale:.85},at(6.05));tl.to(drag,{opacity:1,duration:.16},at(6.05));move(spots.upload,6.22,.65);tl.to(drag,{x:spots.upload.x+10,y:spots.upload.y+12,scale:1,duration:.65,ease:'power2.inOut'},at(6.22));tl.to(drag,{opacity:0,scale:.8,duration:.25},at(6.9));tl.to(before,{opacity:0,duration:.2},at(6.95));tl.to(progress,{scaleX:1,duration:.5,ease:'power2.inOut'},at(7));tl.to(after,{opacity:1,duration:.25},at(7.3));
tl.to(form,{y:-95,duration:.75,ease:'power2.inOut'},at(7.4));tl.to(scroll,{y:155,duration:.75,ease:'power2.inOut'},at(7.4));tl.to(submit,{opacity:1,duration:.35},at(7.72));move(spots.submit,7.8,.58);tl.to(node('.agent-arrow'),{scale:.91,duration:.14},at(8.43)).to(node('.agent-arrow'),{scale:1,duration:.22},at(8.53));tl.fromTo(click,{opacity:.8,scale:.35},{opacity:0,scale:3.4,duration:.7,immediateRender:false},at(8.45));
tl.to(success,{opacity:1,duration:.4},at(9.15));tl.fromTo(node('.agent-success-icon'),{scale:.7,y:8},{scale:1,y:0,duration:.65,ease:'back.out(1.5)',immediateRender:false},at(9.2));tl.to(mascot,{y:-4,duration:.35},at(9.25)).to(mascot,{y:0,duration:.5},at(9.6));move(spots.jobs[(job+1)%3],10.65,1.15);tl.to(success,{opacity:0,duration:.3},at(11.6));tl.to(pointer,{opacity:1,duration:.1},at(11.9));}
// A gaze phrase repeats inside the same master clock; matching endpoints prevent loop jumps.
for(let lap=0;lap<3;lap++){
 const start=lap*12;
 const gaze=[{t:0,x:-1.8,y:0},{t:1.25,x:2.1,y:-.35},{t:3,x:.65,y:.55},{t:4.7,x:-1.7,y:.25},{t:6.2,x:2.25,y:.7},{t:8.05,x:1.4,y:.5},{t:9.6,x:0,y:-.5},{t:10.8,x:-1.8,y:0}];
 if(lap===0)tl.set(eyes,{x:gaze[0].x,y:0,scaleY:1},0);
 for(let i=1;i<gaze.length;i++){const pose=gaze[i];tl.to(eyes,{x:pose.x,y:pose.y,duration:.95,ease:"sine.inOut"},start+pose.t);}
 for(const blink of [3.7,9.8]){tl.to(eyes,{scaleY:.14,duration:.14,ease:"sine.inOut"},start+blink).to(eyes,{scaleY:1,duration:.25,ease:"sine.out"},start+blink+.14);}
}
tl.time(preference.matches?8.25:old,false);render();sync();}
function sync(){if(!timeline)return;const playing=visible&&!userPaused&&!document.hidden&&!preference.matches;if(playing)timeline.play();else timeline.pause();control.textContent=userPaused?'▷ Play':'Ⅱ Pause';control.setAttribute('aria-label',userPaused?'Play agent animation':'Pause agent animation');control.setAttribute('aria-pressed',String(userPaused));control.hidden=preference.matches;}
workspace.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const bounds=workspace.getBoundingClientRect();workspace.style.setProperty('--agent-color-x',`${event.clientX-bounds.left}px`);workspace.style.setProperty('--agent-color-y',`${event.clientY-bounds.top}px`);},{passive:true});workspace.addEventListener('pointerleave',()=>{workspace.style.setProperty('--agent-color-x','-500px');workspace.style.setProperty('--agent-color-y','-500px');});
control.addEventListener('click',()=>{userPaused=!userPaused;sync();});const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:.12});observer.observe(root);const resize=new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(Math.abs(w-lastWidth)>1){lastWidth=w;build();}});resize.observe(workspace);preference.addEventListener('change',build);document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>{timeline?.kill();observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',sync);preference.removeEventListener('change',build);},{once:true});
})();
