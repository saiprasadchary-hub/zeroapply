import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITIES,inside,route,clearSegment} from '../dist/agent-routing.js';
const bounds={left:58,right:1222,top:142,bottom:742};
const obstacle={left:500,right:1100,top:270,bottom:560};
test('thirty distinct activities are available',()=>{assert.equal(ACTIVITIES.length,30);assert.equal(new Set(ACTIVITIES.map(item=>item[0])).size,30);});
test('direct crossing is blocked and a route goes around the wordmark',()=>{const a={x:400,y:400},b={x:1180,y:400};assert.equal(clearSegment(a,b,obstacle),false);const path=route(a,b,obstacle,bounds);assert.ok(path.length>1);let previous=a;for(const p of path){assert.equal(clearSegment(previous,p,obstacle),true);previous=p;}assert.deepEqual(path.at(-1),b);});
test('routes preserve clearance across a spread of screen positions',()=>{const points=[];for(let x=58;x<=1222;x+=97)for(let y=142;y<=742;y+=75){const p={x,y};if(!inside(p,obstacle))points.push(p);}for(let i=0;i<points.length;i++){const a=points[i],b=points[(i*17+5)%points.length],path=route(a,b,obstacle,bounds);assert.ok(path.length);let previous=a;for(const p of path){assert.ok(p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom);assert.equal(clearSegment(previous,p,obstacle),true);previous=p;}assert.deepEqual(path.at(-1),b);}});
test('unobstructed moves stay direct',()=>{const end={x:800,y:180};assert.deepEqual(route({x:100,y:180},end,obstacle,bounds),[end]);});

test('each bot receives a different solo activity in every scene',async()=>{
 const {independentActivities}=await import('../dist/agent-routing.js');
 for(let preferred=0;preferred<ACTIVITIES.length;preferred++){
  for(const value of [0,.2,.5,.8,.999]){
   const plans=independentActivities(preferred,()=>value);
   assert.equal(plans.length,3);
   assert.equal(new Set(plans.map(plan=>plan[1])).size,3);
  }
 }
});
