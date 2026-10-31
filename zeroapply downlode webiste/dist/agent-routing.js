export const ACTIVITIES = [
 ['Explorer','wander','curious'],['Bouncy hello','bounce','happy'],['Follow the leader','chase','happy'],
 ['Playful bump','bump','surprised'],['Tiny pirouette','spin','happy'],['Meet the crew','greet','happy'],
 ['Happy dance','dance','happy'],['Peekaboo','peek','curious'],['How it works perch','nav','curious'],
 ['Power nap','nap','sleepy'],['Morning stretch','stretch','sleepy'],['Little leap','jump','surprised'],
 ['Circle of friends','orbit','happy'],['Zigzag dash','zigzag','excited'],['Friendly race','race','excited'],
 ['High five','highfive','happy'],['Hide and seek','hide','curious'],['Careful balance','balance','worried'],
 ['The giggles','giggle','happy'],['What was that?','surprise','surprised'],['Agent demo perch','nav','curious'],
 ['Follow me','roundtrip','happy'],['Hello there','wave','happy'],['Quick dodge','dodge','surprised'],
 ['Gentle nudge','nudge','grumpy'],['We did it','celebrate','happy'],['A tiny sulk','sulk','sad'],
 ['Shake it off','shake','happy'],['A friendly tip','suggest','curious'],['Questions perch','nav','curious'],
];
export function inside(p,r){return p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom;}
export function clearSegment(a,b,r){
 // Liang–Barsky intersection against a slightly inset protected rectangle.
 const dx=b.x-a.x,dy=b.y-a.y,p=[-dx,dx,-dy,dy],q=[a.x-r.left,r.right-a.x,a.y-r.top,r.bottom-a.y];
 let low=0,high=1;
 for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-9){if(q[i]<0)return true;continue;}const t=q[i]/p[i];if(p[i]<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return true;}
 return false;
}
export function route(start,end,obstacle,bounds){
 if(!obstacle||clearSegment(start,end,obstacle))return [end];
 const gap=3;
 const corners=[{x:obstacle.left-gap,y:obstacle.top-gap},{x:obstacle.right+gap,y:obstacle.top-gap},{x:obstacle.right+gap,y:obstacle.bottom+gap},{x:obstacle.left-gap,y:obstacle.bottom+gap}].filter(p=>p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom);
 const points=[start,end,...corners],distance=points.map(()=>Infinity),previous=points.map(()=>-1),visited=new Set();distance[0]=0;
 for(let step=0;step<points.length;step++){
  let u=-1;for(let i=0;i<points.length;i++)if(!visited.has(i)&&(u<0||distance[i]<distance[u]))u=i;
  if(u<0||!Number.isFinite(distance[u]))break;if(u===1)break;visited.add(u);
  for(let v=0;v<points.length;v++){if(v===u||visited.has(v)||!clearSegment(points[u],points[v],obstacle))continue;const d=distance[u]+Math.hypot(points[v].x-points[u].x,points[v].y-points[u].y);if(d<distance[v]){distance[v]=d;previous[v]=u;}}
 }
 if(!Number.isFinite(distance[1]))return [];
 const result=[];for(let i=1;i!==0;i=previous[i]){if(i<0)return [];result.unshift(points[i]);}return result;
}

export function independentActivities(preferredIndex, roll){
 const shared=new Set(['nav','chase','race','roundtrip','zigzag','dodge','bump','highfive','nudge','greet','hide','orbit']);
 const pool=ACTIVITIES.filter(activity=>!shared.has(activity[1]));
 const selected=[];
 const preferred=ACTIVITIES[preferredIndex];
 if(preferred&&!shared.has(preferred[1])){selected.push(preferred);pool.splice(pool.indexOf(preferred),1);}
 while(selected.length<3){const index=Math.min(pool.length-1,Math.floor(roll()*pool.length));selected.push(pool.splice(index,1)[0]);}
 return selected;
}
