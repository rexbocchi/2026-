const TYPE_NAME = {single:'单选题', multiple:'多选题', judge:'判断题', short:'简答题', case:'案例分析题'};
const STORE_KEY = 'interview-practice-v1';
let allQuestions = [], list = [], current = 0, mode = 'practice', selected = new Set(), answered = false;
let store = JSON.parse(localStorage.getItem(STORE_KEY) || '{"wrong":{},"favorite":{},"stats":{"done":0,"right":0},"theme":""}');
const $ = id => document.getElementById(id);
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(store)); updateStats(); }
function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]} return b; }
function normalize(s){ return (s||'').toString().toLowerCase(); }
async function init(){
  if(store.theme === 'dark') document.documentElement.classList.add('dark');
  const data = await fetch('questions.json').then(r=>r.json());
  allQuestions = data.questions;
  $('totalCount').textContent = allQuestions.length;
  bind(); applyFilters(); updateStats();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}
function bind(){
  document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{mode=btn.dataset.mode; document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn)); current=0; applyFilters();});
  $('typeFilter').onchange=()=>{current=0; applyFilters();}; $('orderFilter').onchange=()=>{current=0; applyFilters();}; $('searchInput').oninput=()=>{current=0; applyFilters();};
  $('prevBtn').onclick=()=>go(-1); $('nextBtn').onclick=()=>go(1); $('favBtn').onclick=toggleFavorite;
  $('themeBtn').onclick=()=>{document.documentElement.classList.toggle('dark'); store.theme=document.documentElement.classList.contains('dark')?'dark':''; save();};
  $('exportBtn').onclick=exportProgress;
  $('importFile').onchange=importProgress;
  $('resetBtn').onclick=resetProgress;
}

function applyFilters(){
  const t=$('typeFilter').value, kw=normalize($('searchInput').value);
  let base = allQuestions.filter(q => (t==='all'||q.type===t));
  if(mode==='wrong') base = base.filter(q=>store.wrong[q.id]);
  if(mode==='favorite') base = base.filter(q=>store.favorite[q.id]);
  if(kw) base = base.filter(q=>normalize(q.question).includes(kw) || normalize(Array.isArray(q.answer)?q.answer.join(''):q.answer).includes(kw));
  list = $('orderFilter').value === 'random' ? shuffle(base) : base;
  current = Math.min(current, Math.max(0, list.length-1)); render();
}
function render(){ selected=new Set(); answered=false; const q=list[current]; updateProgress();
  if(!q){ $('questionCard').innerHTML=`<div class="empty">暂无题目。可以切换题型或模式试试。</div>`; $('favBtn').textContent='☆ 收藏'; return; }
  $('favBtn').textContent = store.favorite[q.id] ? '★ 已收藏' : '☆ 收藏';
  let html = `<div class="q-meta"><span class="badge">${TYPE_NAME[q.type]}</span><span class="badge green">第 ${q.number} 题</span><span class="muted">${current+1} / ${list.length}</span></div><h2 class="q-title">${esc(q.question)}</h2>`;
  if(mode === 'recite') html += reciteHtml(q); else html += practiceHtml(q);
  $('questionCard').innerHTML = html;
  wireQuestion(q);
}
function practiceHtml(q){
  if(q.type==='single' || q.type==='multiple') return `<div class="options">${q.options.map(o=>optHtml(o,false)).join('')}</div><div class="actions"><button class="action-btn primary" id="submitBtn">提交答案</button><button class="action-btn" id="showBtn">查看答案</button></div><div id="feedback"></div>`;
  if(q.type==='judge') return `<div class="judge-buttons"><button class="option" data-key="对"><span class="option-key">对</span></button><button class="option" data-key="错"><span class="option-key">错</span></button></div><div class="actions"><button class="action-btn primary" id="submitBtn">提交答案</button><button class="action-btn" id="showBtn">查看答案</button></div><div id="feedback"></div>`;
  return `<div class="actions"><button class="action-btn primary" id="showBtn">查看参考答案</button><button class="action-btn danger" id="markWrongBtn">加入错题</button></div><div id="feedback"></div>`;
}
function reciteHtml(q){
  if(q.type==='single' || q.type==='multiple') return `<div class="options recite-options">${q.options.map(o=>optHtml(o, q.answer.includes(o.key))).join('')}</div>${answerBox(q)}`;
  return answerBox(q);
}
function optHtml(o, correct){return `<div class="option ${correct?'correct':''}" data-key="${o.key}"><span class="option-key">${o.key}</span><span>${esc(o.text)}</span>${correct?'<span class="mark">✓</span>':''}</div>`}
function answerBox(q, result=''){ const ans = Array.isArray(q.answer) ? q.answer.join('') : q.answer; return `<div class="answer-box">${result}<strong>${q.type==='short'||q.type==='case'?'参考答案':'答案'}：${esc(ans)}</strong></div>`; }
function wireQuestion(q){
  document.querySelectorAll('.option[data-key]').forEach(el=>el.onclick=()=>{ if(answered || mode==='recite') return; const k=el.dataset.key; if(q.type==='multiple'){ selected.has(k)?selected.delete(k):selected.add(k); } else { selected=new Set([k]); } document.querySelectorAll('.option').forEach(e=>e.classList.toggle('selected', selected.has(e.dataset.key))); });
  const submit=$('submitBtn'), show=$('showBtn'), mark=$('markWrongBtn'); if(submit) submit.onclick=()=>submitAnswer(q); if(show) show.onclick=()=>showAnswer(q); if(mark) mark.onclick=()=>{store.wrong[q.id]=true; save(); render();};
}
function submitAnswer(q){ if(!selected.size){alert('请先选择答案'); return;} answered=true; let ok=false;
  if(q.type==='single'||q.type==='multiple'){ const a=[...selected].sort().join(''); const b=[...q.answer].sort().join(''); ok=a===b; document.querySelectorAll('.option').forEach(el=>{const k=el.dataset.key; if(q.answer.includes(k)) el.classList.add('correct'); else if(selected.has(k)) el.classList.add('wrong');}); }
  if(q.type==='judge'){ ok=[...selected][0]===q.answer; document.querySelectorAll('.option').forEach(el=>{const k=el.dataset.key; if(k===q.answer) el.classList.add('correct'); else if(selected.has(k)) el.classList.add('wrong');}); }
  store.stats.done++; if(ok){ store.stats.right++; delete store.wrong[q.id]; } else store.wrong[q.id]=true; save();
  $('feedback').innerHTML=answerBox(q, ok?'<span class="badge green">回答正确</span> ':'<span class="badge red">回答错误</span> ');
}
function showAnswer(q){ answered=true; if(q.type==='single'||q.type==='multiple') document.querySelectorAll('.option').forEach(el=>{if(q.answer.includes(el.dataset.key)) el.classList.add('correct')}); if(q.type==='judge') document.querySelectorAll('.option').forEach(el=>{if(el.dataset.key===q.answer) el.classList.add('correct')}); $('feedback').innerHTML=answerBox(q); }
function toggleFavorite(){ const q=list[current]; if(!q) return; store.favorite[q.id] ? delete store.favorite[q.id] : store.favorite[q.id]=true; save(); render(); }
function go(d){ if(!list.length) return; current=(current+d+list.length)%list.length; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function updateProgress(){ const pct=list.length?((current+1)/list.length*100):0; $('progressBar').style.width=pct+'%'; $('progressText').textContent=list.length?`${TYPE_NAME[list[current].type]} 第 ${list[current].number} 题 · 当前列表 ${current+1}/${list.length}`:'没有匹配题目'; }
function updateStats(){ $('doneCount').textContent=store.stats.done||0; $('accuracy').textContent=(store.stats.done?Math.round(store.stats.right/store.stats.done*100):0)+'%'; $('wrongCount').textContent=Object.keys(store.wrong||{}).length; }
function exportProgress(){
  const payload = {app:'interview-practice', version:1, exportedAt:new Date().toISOString(), progress:store};
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  a.href = url;
  a.download = `面试题库进度-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('进度已导出');
}
function importProgress(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      const progress = data.progress || data;
      if(!progress || typeof progress !== 'object') throw new Error('文件格式不正确');
      const next = {
        wrong: progress.wrong && typeof progress.wrong === 'object' ? progress.wrong : {},
        favorite: progress.favorite && typeof progress.favorite === 'object' ? progress.favorite : {},
        stats: progress.stats && typeof progress.stats === 'object' ? progress.stats : {done:0,right:0},
        theme: progress.theme || store.theme || ''
      };
      store = next; save(); applyFilters(); toast('进度已导入');
    }catch(e){ alert('导入失败：' + e.message); }
  };
  reader.readAsText(file, 'utf-8');
}
function resetProgress(){
  if(!confirm('确定清空本机刷题进度、错题和收藏吗？此操作不可撤销。')) return;
  const theme = store.theme || '';
  store = {wrong:{}, favorite:{}, stats:{done:0,right:0}, theme};
  save(); applyFilters(); toast('本机进度已清空');
}
function toast(msg){
  const old = document.querySelector('.toast'); if(old) old.remove();
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1800);
}
function esc(s){ return (s||'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
init().catch(e=>{ $('questionCard').innerHTML=`<div class="empty">加载失败：${esc(e.message)}<br>请用本地服务器打开，不要直接双击 file://。</div>`; });
