await page.getByRole('slider',{name:'Maximum applications per run'}).press('Home');
await page.getByRole('slider',{name:'Maximum applications per run'}).press('ArrowRight');
const limit=await page.getByRole('slider',{name:'Maximum applications per run'}).inputValue();
if(limit!=='2')throw Error('Unexpected batch limit '+limit);
globalThis.runEvidence=[];globalThis.capturedReceipts=new Set();globalThis.captureBusy=false;
clearInterval(globalThis.twoWatcher);
globalThis.twoWatcher=setInterval(async()=>{
 if(globalThis.captureBusy)return;globalThis.captureBusy=true;
 try{
 const state=await app.evaluate(async({webContents})=>{
  const w=webContents.getAllWebContents().find(w=>w.getType()==='webview');if(!w)return null;
  const data=await w.executeJavaScript(`(()=>{
   const roots=[document];let dialogs=[];
   for(let i=0;i<roots.length;i++){for(const e of roots[i].querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);dialogs.push(...roots[i].querySelectorAll('dialog[open],[role="dialog"],.artdeco-modal'));}
   const d=dialogs.find(d=>d.getClientRects().length);if(!d)return null;
   const text=d.innerText||d.textContent;
   const fields=Array.from(d.querySelectorAll('input,select,textarea')).filter(e=>e.type!=='hidden'&&e.type!=='file').map(e=>({label:Array.from(e.labels||[]).map(l=>l.innerText).join(' ')||e.getAttribute('aria-label')||e.name,type:e.type,value:e.type==='checkbox'||e.type==='radio'?e.checked:e.tagName==='SELECT'?e.options[e.selectedIndex]?.textContent:e.value}));
   return {url:location.href,text,fields,confirmed:/your application (?:was|has been) sent/i.test(text)};
  })()`);
  return data?{...data,png:data.confirmed?(await w.capturePage()).toPNG().toString('base64'):null}:null;
 });
 if(state){
  const {png,...entry}=state;
  globalThis.runEvidence.push({time:new Date().toISOString(),...entry});
  fs.writeFileSync('output/two-applications/form-evidence.json',JSON.stringify(globalThis.runEvidence,null,2));
  if(png){const key=state.text.match(/Your application (?:was|has been) sent[^!]*!/i)?.[0]||state.url;if(!globalThis.capturedReceipts.has(key)){
   globalThis.capturedReceipts.add(key);const n=globalThis.capturedReceipts.size;
   fs.writeFileSync('output/two-applications/success-'+n+'.png',Buffer.from(png,'base64'));console.log('CONFIRMED',n,key);
   if(n>=2)clearInterval(globalThis.twoWatcher);
  }}
 }
 }catch(e){console.log('Observer:',e.message)}finally{globalThis.captureBusy=false;}
},1000);
await page.locator('button').filter({hasText:'Review & start AutoApply'}).click();
return {started:true,batchLimit:limit};
