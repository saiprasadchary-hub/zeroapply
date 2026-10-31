const stage=document.querySelector('#stage');
const artwork=figure.mount({stage,svg:document.querySelector('#mark'),read:document.querySelector('#read')},20);
let tour;
stage.addEventListener('keydown',event=>{const points={ArrowLeft:[110,160],ArrowRight:[290,160],ArrowUp:[200,60],ArrowDown:[200,260],Escape:null};if(!(event.key in points))return;event.preventDefault();tour?.stop();tour=HL.tour(stage,[points[event.key],null]);});
window.addEventListener('pagehide',()=>{tour?.stop();artwork.destroy();},{once:true});
const platforms={windows:'Windows',macos:'macOS',linux:'Linux'};
let selected='windows',releases={};
const button=document.querySelector('#download-button'),note=document.querySelector('#download-note');
function updatePlatform(){const name=platforms[selected],url=releases[selected];document.querySelector('#platform-name').textContent=name;document.querySelector('#release-status').textContent=url?'READY TO DOWNLOAD':'RELEASE IN PREPARATION';button.replaceChildren(document.createTextNode(url?`Download for ${name}`:`Check ${name} availability`));const arrow=document.createElement('span');arrow.textContent=url?'↓':'↗';button.append(arrow);note.textContent=url?`The ${name} installer is ready. Your download will start when you select the button.`:`The ${name} installer is being prepared. Check availability for the latest release status.`;document.querySelectorAll('[data-os]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.os===selected)));}
document.querySelectorAll('[data-os]').forEach(el=>el.addEventListener('click',()=>{selected=el.dataset.os;updatePlatform();}));
fetch('releases.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{for(const os of Object.keys(platforms)){const raw=data[os];if(typeof raw!=='string')continue;const url=new URL(raw,location.href);if(url.protocol==='https:'||(url.origin===location.origin&&url.pathname.startsWith(new URL('./downloads/',location.href).pathname)))releases[os]=url.href;}updatePlatform();}).catch(()=>{note.textContent='Release information could not be loaded. Please refresh to check again.';});
button.addEventListener('click',()=>{if(releases[selected]){const a=document.createElement('a');a.href=releases[selected];a.download='';a.rel='noopener';a.click();return;}note.textContent=`The ${platforms[selected]} download is not available yet. No public installer has been published. Please check back here for the release.`;});
// These are illustrations, not controls that operate the desktop app.
const walkthrough=document.querySelector('#approach');
const motionControl=document.querySelector('#motion-control');
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let userPaused=false,walkthroughVisible=false;
function syncWalkthroughMotion(){walkthrough.classList.toggle('motion-paused',userPaused||!walkthroughVisible||motionPreference.matches);}
const motionObserver=new IntersectionObserver(entries=>{walkthroughVisible=entries.some(entry=>entry.isIntersecting);syncWalkthroughMotion();},{threshold:.1});
motionObserver.observe(walkthrough);
function walkthroughAnimations(){return [...walkthrough.querySelectorAll('.how-scene')].flatMap(scene=>scene.getAnimations({subtree:true}));}
motionControl.addEventListener('click',()=>{
 const animations=walkthroughAnimations();
 const finished=animations.length>0&&animations.every(animation=>animation.playState==='finished');
 if(finished){for(const animation of animations){animation.currentTime=0;animation.play();}userPaused=false;}
 else userPaused=!userPaused;
 motionControl.setAttribute('aria-pressed',String(userPaused));
 motionControl.textContent=userPaused?'Resume animations ▷':'Pause animations Ⅱ';
 syncWalkthroughMotion();
});
motionPreference.addEventListener('change',syncWalkthroughMotion);
syncWalkthroughMotion();
window.addEventListener('pagehide',()=>motionObserver.disconnect(),{once:true});

// Two synchronized renderings: monochrome underneath, original green through a pointer-local mask.
for(const scene of walkthrough.querySelectorAll('.how-scene')){
 const mono=document.createElement('div');mono.className='scene-mono';
 while(scene.firstChild)mono.append(scene.firstChild);
 const color=mono.cloneNode(true);color.className='scene-color';color.setAttribute('aria-hidden','true');
 scene.append(mono,color);
 const card=scene.closest('article');
 card.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const bounds=scene.getBoundingClientRect();scene.style.setProperty('--cursor-x',`${event.clientX-bounds.left}px`);scene.style.setProperty('--cursor-y',`${event.clientY-bounds.top}px`);scene.classList.add('color-near');},{passive:true});
 card.addEventListener('pointerleave',()=>scene.classList.remove('color-near'));
}
syncWalkthroughMotion();
const navToggle=document.querySelector('.nav-toggle');
const navLinks=document.querySelector('#nav-links');
function closeNavigation(){navToggle.setAttribute('aria-expanded','false');navLinks.classList.remove('is-open');}
navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')!=='true';navToggle.setAttribute('aria-expanded',String(open));navLinks.classList.toggle('is-open',open);});
navLinks.addEventListener('click',event=>{if(event.target.closest('a'))closeNavigation();});
document.addEventListener('click',event=>{if(!event.target.closest('header nav'))closeNavigation();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navToggle.getAttribute('aria-expanded')==='true'){closeNavigation();navToggle.focus();}});
const navigationSections=[...document.querySelectorAll('main>section[id]')];
const sectionObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;for(const link of navLinks.querySelectorAll('a')){if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}},{rootMargin:'-15% 0px -55% 0px',threshold:0});
for(const section of navigationSections)sectionObserver.observe(section);
window.addEventListener('pagehide',()=>sectionObserver.disconnect(),{once:true});
const stickyHeader=document.querySelector('header');
function updateNavigationHeight(){document.documentElement.style.setProperty('--navigation-height',`${stickyHeader.getBoundingClientRect().height}px`);}
const headerResize=new ResizeObserver(updateNavigationHeight);
headerResize.observe(stickyHeader);
updateNavigationHeight();
// Re-selecting the current fragment should realign the section as well.
for(const link of document.querySelectorAll('a[href^="#"]')){
 link.addEventListener('click',event=>{
  const id=link.getAttribute('href').slice(1);if(!id)return;
  const target=document.getElementById(id);if(!target)return;
  event.preventDefault();closeNavigation();updateNavigationHeight();
  const top=target.getBoundingClientRect().top+window.scrollY-stickyHeader.getBoundingClientRect().height;
  if(location.hash!==`#${id}`)history.pushState(null,'',`#${id}`);
  window.scrollTo({top:Math.max(0,top),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
}
window.addEventListener('pagehide',()=>headerResize.disconnect(),{once:true});
// Touch taps and horizontal scrubbing animate the individual letters.
const touchWordmark=document.querySelector('.hero .wordmark');
const letterFeedback=new WeakMap();
let activeWordmarkTouch=null;
function animateTouchLetter(letter){
 if(!letter?.classList.contains('wordmark-letter'))return;
 letterFeedback.get(letter)?.cancel();
 const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const frames=still?[{color:'#fafaf8'},{color:'#93958f',offset:.35},{color:'#fafaf8'}]:[
  {transform:'scale(1)',color:'#fafaf8'},
  {transform:'scale(1.2)',color:'#93958f',offset:.3},
  {transform:'scale(1.2)',color:'#93958f',offset:.55},
  {transform:'scale(1)',color:'#fafaf8'},
 ];
 letterFeedback.set(letter,letter.animate(frames,{duration:1000,easing:'ease-in-out'}));
}
function touchLetterAt(x,y){
 const bounds=touchWordmark.getBoundingClientRect();
 if(y<bounds.top-15||y>bounds.bottom+15||x<bounds.left||x>bounds.right)return null;
 // Pick from each letter's fixed layout box: scaling cannot destabilize the hit area.
 const widthRatio=bounds.width/touchWordmark.offsetWidth;
 const xLocal=(x-bounds.left)/widthRatio;
 for(const letter of touchWordmark.querySelectorAll('.wordmark-letter')){
  if(xLocal>=letter.offsetLeft&&xLocal<=letter.offsetLeft+letter.offsetWidth)return letter;
 }
 return null;
}
touchWordmark.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse'||activeWordmarkTouch)return;
 activeWordmarkTouch={id:event.pointerId,last:null};
 touchWordmark.setPointerCapture(event.pointerId);
 const letter=touchLetterAt(event.clientX,event.clientY);
 if(letter){animateTouchLetter(letter);activeWordmarkTouch.last=letter;}
},{passive:true});
touchWordmark.addEventListener('pointermove',event=>{
 if(!activeWordmarkTouch||activeWordmarkTouch.id!==event.pointerId)return;
 const letter=touchLetterAt(event.clientX,event.clientY);
 if(letter!==activeWordmarkTouch.last){if(letter)animateTouchLetter(letter);activeWordmarkTouch.last=letter;}
},{passive:true});
function endWordmarkTouch(event){if(activeWordmarkTouch?.id===event.pointerId)activeWordmarkTouch=null;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])touchWordmark.addEventListener(type,endWordmarkTouch,{passive:true});
const themeToggle=document.querySelector('.theme-toggle');
function applyTheme(theme){
 document.documentElement.dataset.theme=theme;
 const dark=theme==='dark';
 themeToggle.setAttribute('aria-pressed',String(dark));
 themeToggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
 themeToggle.querySelector('.theme-label').textContent=dark?'Light mode':'Dark mode';
}
applyTheme(document.documentElement.dataset.theme||'light');
themeToggle.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(next);try{localStorage.setItem('zeroapply-theme',next);}catch{}});

