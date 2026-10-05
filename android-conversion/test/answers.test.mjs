import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync('android-conversion/src/answerPolicy.ts','utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {candidateAnswer,sensitiveQuestion,parseAnswer} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const persona = {fullName:'Jane Doe',email:'jane@example.test',phone:'',location:'Bengaluru',linkedIn:'',gitHub:'',portfolio:''};
const field = {id:'za-phone-1',label:'Years of experience',type:'number',required:true,value:'',options:[]};
test('Profile answers come from supplied facts without guessing missing values',()=>{
 assert.equal(candidateAnswer('First name',persona),'Jane');
 assert.equal(candidateAnswer('Last name',persona),'Doe');
 assert.equal(candidateAnswer('Email address',persona),'jane@example.test');
 assert.equal(candidateAnswer('Phone number',persona),undefined);
 assert.equal(candidateAnswer('Years of experience',persona),undefined);
});
test('Personal declarations pause for the user',()=>{
 for(const label of ['Visa sponsorship','Work authorization','Gender','Nationality','Disability','Password']) {
  assert.equal(sensitiveQuestion(label),true);
  assert.equal(candidateAnswer(label,persona),undefined);
 }
});
test('Unsupported AI output cannot fill a required question',()=>{
 for(const text of ['not JSON','{"answer":null}','{"answer":"unknown"}','{"answer":5}','{"answer":"five years"}']) assert.equal(parseAnswer(text,field),undefined);
 assert.equal(parseAnswer('{"answer":"3"}',field),'3');
 assert.equal(parseAnswer('{"answer":"Yes"}',{...field,type:'select',options:['No']}),undefined);
 assert.equal(parseAnswer('```json\n{"answer":"yes"}\n```',{...field,type:'select',options:['Yes','No']}),'Yes');
});
