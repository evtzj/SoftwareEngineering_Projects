const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let editing = null, filter = 'all';
function validDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date=new Date(value+'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10)===value;
}
export function validPlans(plans) {
  return Array.isArray(plans) && new Set(plans.map(p=>p?.id)).size===plans.length && plans.every(p => p && typeof p.id === 'string' && typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= 100 && typeof p.note === 'string' && p.note.length <= 1000 && typeof p.done === 'boolean' && ['normal','high'].includes(p.priority) && typeof p.due === 'string' && validDate(p.due));
}
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function learningView(plans) {
  const selected = plans.find(p => p.id === editing);
  const done = plans.filter(p => p.done).length;
  const visible = plans.filter(p => filter === 'all' || (filter === 'done' ? p.done : !p.done)).sort((a,b) => Number(a.done)-Number(b.done) || Number(b.priority==='high')-Number(a.priority==='high') || (a.due || '9999').localeCompare(b.due || '9999'));
  return `<section class="page-container learning-page" id="plans"><div class="feature-heading"><p class="eyebrow">把想法，变成下一步</p><h1>学习计划</h1><p>已完成 ${done} / ${plans.length} 项，按自己的节奏前进。</p></div><div class="feature-surface"><form id="plan-form"><h2>${selected ? '编辑计划' : '添加一个小目标'}</h2><label>计划名称<input name="title" maxlength="100" required placeholder="例如：完成四则运算专项练习" value="${esc(selected?.title || '')}"></label><div class="feature-fields"><label>截止日期（可选）<input type="date" name="due" value="${esc(selected?.due || '')}"></label><label>优先级<select name="priority" aria-label="优先级"><option value="normal">普通</option><option value="high" ${selected?.priority === 'high' ? 'selected' : ''}>优先完成</option></select></label></div><label>备注（可选）<textarea name="note" rows="2" maxlength="1000" placeholder="把大任务拆成几个小步骤…">${esc(selected?.note || '')}</textarea></label><div class="feature-actions"><button class="button primary" type="submit">${selected ? '保存计划' : '添加计划'}</button>${selected ? '<button class="button outline" type="button" id="plan-cancel">取消编辑</button>' : ''}</div></form></div><div class="feature-toolbar"><div class="filter-group" role="group" aria-label="计划筛选">${[['all','全部'],['active','进行中'],['done','已完成']].map(([v,l])=>`<button data-plan-filter="${v}" aria-pressed="${v===filter}">${l}</button>`).join('')}</div><span>优先项在前 · 未完成项按截止日期排列</span></div><div class="plan-list">${visible.map(p=>`<article class="plan-row ${p.done ? 'is-done' : ''}"><input type="checkbox" data-plan-toggle="${esc(p.id)}" aria-label="完成计划：${esc(p.title)}" ${p.done ? 'checked' : ''}><div class="plan-content"><h2>${esc(p.title)}</h2><p>${p.priority==='high' ? '<span class="feature-badge">优先完成</span> ' : ''}${p.due ? `<span class="${!p.done && p.due<today() ? 'overdue' : ''}">${!p.done && p.due<today() ? '已逾期 · ' : ''}${esc(p.due)}</span>` : '未设截止日期'}</p>${p.note ? `<p class="plan-note">${esc(p.note)}</p>` : ''}</div><div class="feature-actions"><button class="text-link" data-plan-edit="${esc(p.id)}">编辑</button><button class="text-link" data-plan-delete="${esc(p.id)}" aria-label="删除计划：${esc(p.title)}">删除</button></div></article>`).join('') || `<div class="feature-empty">${plans.length ? '当前筛选下没有计划，可以切换查看全部。' : '这里还没有计划。先为自己定一个小目标。'}</div>`}</div><p class="feature-footnote">计划保存在当前浏览器，并包含在个人档案的 JSON 备份中。</p></section>`;
}
export function bindLearning(plans, save, redraw) {
  document.querySelector('#plan-form').onsubmit = event => {
    event.preventDefault();
    const data = new FormData(event.target), title = String(data.get('title')).trim();
    if (!title) { event.target.elements.title.setCustomValidity('请输入计划名称'); event.target.elements.title.reportValidity(); return; }
    const item = { id: editing || crypto.randomUUID(), title, note:String(data.get('note')).trim(), due:String(data.get('due')), priority:String(data.get('priority')), done:plans.find(p=>p.id===editing)?.done || false };
    const next = plans.some(p=>p.id===editing) ? plans.map(p=>p.id===editing ? item : p) : [...plans,item];
    editing = null; save(next);
  };
  document.querySelector('#plan-form [name=title]').oninput = event => event.target.setCustomValidity('');
  document.querySelector('#plan-cancel')?.addEventListener('click',()=>{editing=null;redraw();});
  document.querySelectorAll('[data-plan-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.planFilter;redraw();});
  document.querySelectorAll('[data-plan-toggle]').forEach(b=>b.onchange=()=>save(plans.map(p=>p.id===b.dataset.planToggle ? {...p,done:b.checked} : p)));
  document.querySelectorAll('[data-plan-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.planEdit;redraw();document.querySelector('#plan-form [name=title]').focus();});
  document.querySelectorAll('[data-plan-delete]').forEach(b=>b.onclick=()=>{if(editing===b.dataset.planDelete)editing=null;save(plans.filter(p=>p.id!==b.dataset.planDelete));});
}
