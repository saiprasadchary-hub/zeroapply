return app.evaluate(async({webContents})=>webContents.fromId(1).executeJavaScript(`(async()=>{
 const {PersonaManager}=await import('/src/persona/personaManager.ts');
 const {AutoApplyOrchestrator}=await import('/src/agent/workflow/orchestrator.ts');
 const view=document.querySelector('webview');
 window.liveRunResult=null;
 void new AutoApplyOrchestrator().runApplication(view,PersonaManager.getActiveProfile().data,{maxSteps:8,stepDelayMs:650}).then(r=>window.liveRunResult=r).catch(e=>window.liveRunResult={error:String(e)});
 return 'Current application workflow started';
})()`));
