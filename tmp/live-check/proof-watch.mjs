clearInterval(globalThis.proofWatcher);
globalThis.proofBusy=false;
globalThis.proofWatcher=setInterval(async()=>{
if(globalThis.proofBusy)return;globalThis.proofBusy=true;
try{
const proof=await app.evaluate(async({webContents})=>{
const w=webContents.getAllWebContents().find(w=>w.getType()==='webview');if(!w)return null;
const text=await w.executeJavaScript(`document.body.innerText`);
if(!/your application (?:was|has been) sent/i.test(text))return null;
return {text,png:(await w.capturePage()).toPNG().toString('base64')};
});
if(proof){fs.writeFileSync('output/autonomous-run/volga-confirmed.png',Buffer.from(proof.png,'base64'));fs.writeFileSync('output/autonomous-run/volga-confirmed.txt',proof.text);}
}catch{}finally{globalThis.proofBusy=false;}
},250);
return 'Watching for site confirmation';
