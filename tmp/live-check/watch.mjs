clearInterval(globalThis.receiptWatcher);
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
      for(const d of r.querySelectorAll('dialog[open],[role="dialog"],.artdeco-modal'))if(d.getClientRects().length&&/your application (?:was|has been) sent|application submitted/i.test(d.innerText||d.textContent))return true;
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
return 'Receipt watcher active';