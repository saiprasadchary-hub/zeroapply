return app.evaluate(async({webContents})=>{
 const w=webContents.getAllWebContents().find(w=>w.getType()==='webview');
 const png=(await w.capturePage()).resize({width:1024}).toJPEG(75).toString('base64');
 globalThis.smallVision={status:'running',bytes:png.length};
 void fetch('http://127.0.0.1:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen3.5:4b',prompt:'Read the company name visible in this screenshot. Reply with only the company name.',images:[png],think:false,stream:false,options:{num_predict:40,num_ctx:4096}}),signal:AbortSignal.timeout(120000)}).then(r=>r.json()).then(r=>globalThis.smallVision={status:'complete',answer:r.response,error:r.error}).catch(e=>globalThis.smallVision={status:'failed',error:String(e)});
 return {status:'Small image vision test started',bytes:png.length};
});
