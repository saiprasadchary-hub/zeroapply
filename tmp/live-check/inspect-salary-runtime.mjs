import { chromium } from 'playwright-core';
const b=await chromium.connectOverCDP('http://127.0.0.1:61831'); const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://localhost:5173'));
console.log(JSON.stringify(await p.evaluate(async()=>{
 const webview=document.querySelector('webview'); const key=webview&&Object.keys(webview).find(k=>k.startsWith('__reactFiber'));let f=key?webview[key]:null; const props=[];
 for(let i=0;f&&i<80;i++,f=f.return){if(f.memoizedProps?.persona){const d=f.memoizedProps.persona;props.push({component:f.type?.name,expected:d.expectedSalaryLpa,minSalary:d.minSalary,status:d.employmentStatus});}}
 const sources=performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/screeningFacts.ts|orchestrator.ts|autoApplyEngine.ts/.test(n)).slice(-10);
 const loaded=[]; for(const url of sources.filter(u=>u.includes('screeningFacts'))){const m=await import(url); loaded.push({url:url.split('?')[1],answer:m.resolveScreeningFact?.('Expected Salary',{employmentStatus:'fresher',expectedSalaryLpa:7,minSalary:0})});}
 return {props,sources:sources.map(x=>x.replace('http://localhost:5173','')),loaded};
}))); await b.close();
