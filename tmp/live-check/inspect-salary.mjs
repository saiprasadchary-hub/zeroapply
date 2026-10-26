import { chromium } from 'playwright-core';
const browser=await chromium.connectOverCDP('http://127.0.0.1:61831');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://localhost:5173'));
const stop=page.getByRole('button',{name:/Stop Applying/i});
if(await stop.count()) { await stop.first().click(); console.log('Paused current AutoApply while diagnosing salary.'); }
console.log(JSON.stringify(await page.evaluate(async()=>{
 const {PersonaManager}=await import('/src/persona/personaManager.ts');
 const {resolveScreeningFact}=await import('/src/agent/localLlm/screeningFacts.ts');
 const active=PersonaManager.getActiveProfile();
 const p=active?.data;
 return {profileId:active?.id, employmentStatus:p?.employmentStatus,current:p?.currentCtcLpa,expected:p?.expectedSalaryLpa,minSalary:p?.minSalary,verifiedSalaryAnswers:Object.entries(p?.verifiedScreeningAnswers||{}).filter(([q])=>/salary|ctc/i.test(q)),resolved:p?resolveScreeningFact('Expected Salary',p):null, servedSource:(await(await fetch('/src/agent/localLlm/screeningFacts.ts')).text()).includes("if (!isCurrent && persona.employmentStatus === 'fresher') return '0'")};
}))); await browser.close();
