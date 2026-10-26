import { chromium } from 'playwright-core';
const b=await chromium.connectOverCDP('http://127.0.0.1:61831'); const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://localhost:5173'));
await p.waitForSelector('webview',{state:'attached',timeout:20000});
const browserTab=p.getByRole('button',{name:'Agent Browser',exact:true}); if(await browserTab.count()) await browserTab.first().click();
console.log(JSON.stringify(await p.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/src/agent/localLlm/screeningFacts.ts'));
 if(!url)throw Error('Salary module was not loaded');
 const m=await import(url); const {PersonaManager}=await import('/src/persona/personaManager.ts'); const profile=PersonaManager.getActiveProfile();
 return {loadedModule:url.split('?')[1]||'current',expectedLpa:profile.data.expectedSalaryLpa,expectedInr:m.resolveScreeningFact('Expected Salary',profile.data),currentInr:m.resolveScreeningFact('Current Salary',profile.data)};
}))); await p.screenshot({path:'output/upgrades/refreshed-electron-salary.png'}); await b.close();
