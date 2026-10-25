return await app.evaluate(async({webContents})=>{
 const w=webContents.getAllWebContents().find(w=>w.getType()==='webview');
 return w.executeJavaScript(`(()=>{const roots=[document];const dialogs=[];for(let i=0;i<roots.length;i++){for(const e of roots[i].querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);for(const d of roots[i].querySelectorAll('dialog[open],[role="dialog"],.artdeco-modal'))if(d.getClientRects().length)dialogs.push(d.innerText)}return {url:location.href.split('&')[0],dialogs,hud:document.querySelector('#zeroapply-codex-cursor-root')?.innerText}})()`);
});
