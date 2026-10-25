return app.evaluate(async({webContents})=>webContents.fromId(1).executeJavaScript(`(async()=>{
 const {captureWebsiteScreenshot}=await import('/src/agent/vision/websiteScreenshot.ts');
 const image=await captureWebsiteScreenshot(document.querySelector('webview'));
 if(!image)return {error:'Viewport capture unavailable'};
 window.visionCheck={status:'running',imageBytes:image.length};
 void window.zeroApply.generateEmbeddedLlm({prompt:'Look at this website screenshot. Name the company shown and say whether there is an application-sent confirmation. Use only visible image evidence. Answer in one sentence.',systemPrompt:'Describe the screenshot accurately.',temperature:0,maxTokens:96,images:[image]}).then(answer=>window.visionCheck={status:'complete',imageBytes:image.length,answer}).catch(e=>window.visionCheck={status:'failed',error:String(e)});
 return {status:'Vision check started',imageBytes:image.length};
})()`));
