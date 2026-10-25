await page.getByRole('slider',{name:'Maximum applications per run'}).press('Home');
globalThis.receiptWatcher=setInterval(async()=>{
 if(globalThis.receiptBusy)return;
 globalThis.receiptBusy=true;
 try {
  const receipt=await app.evaluate(async({webContents})=>{
   for(const w of webContents.getAllWebContents().filter(w=>w.getType()==='webview')){
    const ok=await w.executeJavaScript(`(()=>{
     const roots=[document];
     for(let i=0;i<roots.length;i++){
      const r=roots[i];
      for(const e of r.querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);
      if(/your application (?:was|has been) sent|application submitted/i.test(r===document?document.body.innerText:r.textContent))return true;
     }return false})()`);
    if(ok)return {url:w.getURL(),png:(await w.capturePage()).toPNG().toString('base64')};
   }return null;
  });
  if(receipt){
   fs.writeFileSync('output/live-check/application-confirmed.png',Buffer.from(receipt.png,'base64'));
   fs.writeFileSync('output/live-check/receipt.json',JSON.stringify({url:receipt.url,capturedAt:new Date().toISOString()}));
   clearInterval(globalThis.receiptWatcher);console.log('RECEIPT_CAPTURED',receipt.url);
  }
 }catch(e){}finally{globalThis.receiptBusy=false;}
},1500);
await page.locator('button').filter({hasText:'Review & start AutoApply'}).click({timeout:5000});
return 'Started one-application live test';
