clearInterval(globalThis.locationWatcher);globalThis.locationBusy=false;
globalThis.locationWatcher=setInterval(async()=>{
if(globalThis.locationBusy)return;globalThis.locationBusy=true;
try {
 const result=await app.evaluate(async({webContents})=>{
  const w=webContents.getAllWebContents().find(w=>w.getType()==='webview');if(!w)return null;
  const state=await w.executeJavaScript(`({text:document.body.innerText,location:Array.from(document.querySelectorAll('input')).find(e=>/city or location/i.test(e.placeholder||''))?.value})`);
  if(!/2[/][0-9]+ pages/.test(state.text))return null;
  return {...state,png:(await w.capturePage()).toPNG().toString('base64')};
 });
 if(result){
 fs.writeFileSync('output/autonomous-run/location-next-step.png',Buffer.from(result.png,'base64'));
 fs.writeFileSync('output/autonomous-run/location-next-step.txt',result.text);
 await app.evaluate(async({webContents})=>webContents.fromId(1).executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Stop Applying')?.click()`));
 clearInterval(globalThis.locationWatcher);console.log('LOCATION_ADVANCED_TO_STEP_2');
 }
}catch{}finally{globalThis.locationBusy=false;}
},500);return 'Watching contact-to-resume transition';
