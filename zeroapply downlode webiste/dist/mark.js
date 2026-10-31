const {poly,open,seg,mk,fillet,spring,stepS,register,pointer,disposer,clamp}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),yaw=spring(-.42),pitch=spring(.3),spread=spring(12);
 let strength=value,last='';
 const guides=mk('g',{},svg);
 const guide=mk('path',{class:'dash'},guides);
 const root=mk('g',{},svg);
 const rings=[0,1,2].map(()=>({outer:mk('path',{class:'sil'},root),inner:mk('path',{class:'sil'},root),face:mk('path',{class:'sil','fill-rule':'evenodd'},root),crease:mk('path',{class:'nf lo'},root)}));
 const bar={outer:mk('path',{class:'sil'},root),inner:mk('path',{class:'sil'},root),face:mk('path',{class:'sil hi','fill-rule':'evenodd'},root),crease:mk('path',{class:'nf lo'},root)};
 // The mark stands upright. Rotate actual vertices, rather than an image or SVG plane.
 function P(x,y,z){
  const cy=Math.cos(yaw.x),sy=Math.sin(yaw.x),cx=Math.cos(pitch.x),sx=Math.sin(pitch.x);
  const a=x*cy+z*sy,b=-x*sy+z*cy,c=y*cx-b*sx,d=y*sx+b*cx;
  const perspective=650/(650-d);
  return [200-(a*.99+c*.08)*perspective,160+(c*.99-a*.08)*perspective];
 }
 function ring(radius,z,start=0,end=Math.PI*2){return Array.from({length:97},(_,i)=>{const a=start+(end-start)*i/96;return P(Math.cos(a)*radius,Math.sin(a)*radius,z);});}
 const outline=fillet([[-16,-135],[16,-135],[16,135],[-16,135]],[1.2,1.2,1.2,1.2],5);
 const inset=fillet([[-8,-125],[8,-125],[8,125],[-8,125]],[.8,.8,.8,.8],5);
 function beam(points,z){return points.map(([x,y])=>P(x*.84+y*.54,-x*.54+y*.84,z));}
 function draw(){
  const key=[yaw.x,pitch.x,spread.x].map(v=>v.toFixed(4)).join(',');if(key===last)return;last=key;
  guide.setAttribute('d',open(ring(102,-30))+seg([55,160],[345,160])+seg([200,22],[200,298]));
  // Far ring first; opaque faces cover the geometry behind them.
  rings.forEach((r,i)=>{
   const z=(i-1)*(10+spread.x),back=z-7,outer=ring(88,z),inner=ring(75,z);
   const angle=Math.atan2(Math.sin(pitch.x),-Math.sin(yaw.x));
   const arc=(radius,depth,opposite)=>ring(radius,depth,angle+(opposite?Math.PI:0),angle+(opposite?Math.PI*2:Math.PI));
   r.outer.setAttribute('d',poly([...arc(88,back,false),...arc(88,z,false).reverse()]));
   r.inner.setAttribute('d',poly([...arc(75,back,true),...arc(75,z,true).reverse()]));
   r.face.setAttribute('d',poly(outer)+poly(inner.reverse()));
   r.crease.setAttribute('d',open(ring(85,z,angle,angle+Math.PI)));
  });
  const z=26+spread.x,front=beam(outline,z),hole=beam(inset,z),back=beam(outline,z-9),inside=beam(inset,z-9);
  bar.outer.setAttribute('d',poly([...back,...front.slice().reverse()]));
  bar.inner.setAttribute('d',poly([...inside,...hole.slice().reverse()]));
  bar.face.setAttribute('d',poly(front)+poly(hole.reverse()));
  bar.crease.setAttribute('d',open(beam([[-12,-131],[-12,131]],z)));
 }
 const loop=register(stage,dt=>{const a=stepS(yaw,dt),b=stepS(pitch,dt),c=stepS(spread,dt);draw();return a||b||c;});bag.add(loop.unregister);
 function move([x,y]){
  const u=clamp((200-x)/140,-1,1),v=clamp((y-160)/130,-1,1);
  yaw.t=-.42+u*.38;pitch.t=.3-v*.26;spread.t=12+(1-v)*strength*.45;
  read.textContent='explore';loop.wake();
 }
 bag.add(pointer(stage,{move,leave(){yaw.t=-.42;pitch.t=.3;spread.t=12;read.textContent='rest';loop.wake();}}));
 bag.add(()=>svg.replaceChildren());draw();
 return {set(v){strength=v;},destroy:bag.dispose};
}
hairline({name:'zero-mark',means:'An upright ZeroApply mark: the pointer turns its solid rings and opens the space between them.',rules:[1,3,5,6,7,8,10],range:[10,20,30],tour:[[125,160],[270,145],[200,70],null],mount});
