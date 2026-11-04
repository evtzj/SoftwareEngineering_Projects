import test from 'node:test';
import assert from 'node:assert/strict';
import {updateMistakes,mistakeQuestions} from '../web/practice-library.js';
import {createSnapshot,compareSnapshots,comparisonCSV} from '../web/code-history.js';
import {validPlans} from '../web/learning.js';

test('错题本只收录已答错题，重复答错累计，答对后掌握并可重新激活',()=>{
 const q={expression:'2 + 3 × 4',answer:14,given:'20',answered:true,correct:false};
 const settings={max:100,operations:['+','*'],operatorCount:2};
 let items=updateMistakes([], {rows:[q,{...q,expression:'1 + 2',answered:false}]},settings,'2026-11-01');
 assert.equal(items.length,1);
 items=updateMistakes(items,{rows:[q]},settings,'2026-11-02');
 assert.equal(items[0].misses,2);
 items=updateMistakes(items,{rows:[{...q,correct:true,given:'14'}]},settings,'2026-11-03');
 assert.equal(items[0].mastered,true);
 assert.equal(mistakeQuestions(items).length,0);
 assert.equal(mistakeQuestions(items,true).length,1);
 items=updateMistakes(items,{rows:[q]},settings,'2026-11-04');
 assert.equal(items[0].mastered,false);
 assert.equal(items[0].misses,3);
});
const file=(name,code,complete=true)=>({name,language:'python',code,blank:0,comment:0,total:code,functions:complete?[{name:'f',startLine:1,endLine:code,length:code}]:[],functionStatus:complete?'complete':'incomplete'});
test('报告快照独立保存，比较指标按新值减旧值，保留缺失函数值',()=>{
 const files=[file('a.py',2)];
 const first=createSnapshot('初版',files,'a','2026-11-01');
 files[0].code=99;
 assert.equal(first.report.total.code,2);
 const second=createSnapshot('新版',[file('a.py',4,false)],'b','2026-11-02');
 const result=compareSnapshots(first,second);
 assert.equal(result.metrics.find(m=>m.key==='code').delta,2);
 assert.equal(result.metrics.find(m=>m.key==='functionCount').delta,null);
 assert.equal(result.languages.find(m=>m.language==='Python').functionDelta,null);
 assert.match(comparisonCSV(result),/"代码行","2","4","2"/);
 assert.throws(()=>compareSnapshots(first,first),/不同/);
 const incompatible=structuredClone(second);incompatible.report.policy.length='other';
 assert.throws(()=>compareSnapshots(first,incompatible),/口径/);
});
test('计划备份可校验必要字段，拒绝空标题和错误状态类型',()=>{
 const plan={id:'1',title:'学习',note:'',due:'',priority:'normal',done:false};
 assert.equal(validPlans([plan]),true);
 assert.equal(validPlans([{...plan,title:'   '}]),false);
 assert.equal(validPlans([{...plan,done:'false'}]),false);
 assert.equal(validPlans([{...plan,due:'next week'}]),false);
 assert.equal(validPlans([{...plan,due:'2026-02-30'}]),false);
 assert.equal(validPlans([plan,plan]),false);
});
