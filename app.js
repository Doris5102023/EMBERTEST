/* Public files contain only opaque slots (s1...s7), never real model names. */
const STORAGE_KEY = "blind-photo-vote-v2";
const LABELS = ["A", "B", "C", "D", "E", "F", "G"];
let questions = [], index = 0, selections = new Set(), order = [], startedAt = 0, db = null;
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"votes":{},"participantId":null}');
if (!state.participantId) { state.participantId = crypto.randomUUID(); persist(); }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function shuffle(items) { const a = [...items]; for (let i=a.length-1;i>0;i--) { const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function current() { return questions[index]; }
function configured() { return window.SUPABASE_CONFIG?.url?.startsWith("https://") && !window.SUPABASE_CONFIG?.anonKey?.includes("PASTE_"); }
function pendingVotes() { return Object.values(state.votes).filter(v => v.syncStatus !== "synced"); }
function setSyncStatus(text, tone="") { const el=document.querySelector('#syncStatus'); if(el) { el.textContent=text; el.className=`sync-status ${tone}`; } }
async function setupSupabase() {
  if (!configured()) { setSyncStatus("未配置 Supabase：投票仅保存在本机，可下载 CSV。", "warn"); return; }
  db=window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  const {data}=await db.auth.getSession(); if (!data.session) { const {error}=await db.auth.signInAnonymously(); if(error) throw error; }
  setSyncStatus("已连接安全投票后台。", "ok");
}
function displayOrder(q) { return shuffle(q.candidates).map((candidate,i)=>({...candidate,label:LABELS[i]})); }
function render() {
  const q=current(); if(!q) { document.querySelector('#app').hidden=true; document.querySelector('#complete').hidden=false; updateCompleteMessage(); return; }
  selections=new Set(state.votes[q.id]?.selectedSlots||[]); order=displayOrder(q); startedAt=performance.now();
  document.querySelector('#questionId').textContent=` · 题目 ${q.id}`; document.querySelector('#progressText').textContent=`进度 ${index+1} / ${questions.length}`; document.querySelector('#progressBar').style.width=`${index/questions.length*100}%`;
  document.querySelector('#originalImage').src=q.original; document.querySelector('#originalImage').alt=`题目 ${q.id} 的原图`;
  const box=document.querySelector('#choices'); box.innerHTML='';
  for(const c of order) { const card=document.createElement('article'); card.className='choice'+(selections.has(c.slot)?' selected':''); card.tabIndex=0; card.setAttribute('role','button'); card.innerHTML=`<div class="choice-label"><span>候选 ${c.label}</span><span class="rank">${selections.has(c.slot)?'已选':'选择'}</span></div><img src="${c.image}" alt="候选 ${c.label}" loading="eager">`; const toggle=()=>{if(selections.has(c.slot))selections.delete(c.slot);else if(selections.size<2)selections.add(c.slot);updateCards();}; card.onclick=toggle; card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}}; box.append(card); }
  updateCards(); document.querySelector('#prevBtn').disabled=index===0;
}
function updateCards() { document.querySelectorAll('.choice').forEach((node,i)=>{const picked=selections.has(order[i].slot);node.classList.toggle('selected',picked);node.querySelector('.rank').textContent=picked?'已选':'选择';}); document.querySelector('#selectionStatus').textContent=`已选择 ${selections.size} / 2`;document.querySelector('#nextBtn').disabled=selections.size!==2; }
async function syncVote(vote) { if(!db)return {ok:false,message:"后台未配置"}; const {error}=await db.from('votes').insert({participant_id:state.participantId,question_id:vote.questionId,selected_slot_1:vote.selectedSlots[0],selected_slot_2:vote.selectedSlots[1],shown_order:vote.shownOrder,elapsed_seconds:vote.elapsedSeconds,client_saved_at:vote.savedAt}); if(error&&error.code!=='23505')return {ok:false,message:error.message};return {ok:true}; }
async function saveAndAdvance() { const q=current();const vote={questionId:q.id,selectedSlots:[...selections],shownOrder:order.map(x=>({label:x.label,slot:x.slot})),elapsedSeconds:Math.round((performance.now()-startedAt)/1000),savedAt:new Date().toISOString(),syncStatus:"pending"}; state.votes[q.id]=vote;persist();document.querySelector('#nextBtn').disabled=true;setSyncStatus("正在上传本题投票…");try{const r=await syncVote(vote);vote.syncStatus=r.ok?"synced":"failed";vote.syncError=r.message||null;setSyncStatus(r.ok?"本题已安全上传。":"上传失败，已保存在本机；可稍后重新上传。",r.ok?"ok":"warn");}catch{vote.syncStatus="failed";setSyncStatus("网络错误，投票已保存在本机；可稍后重新上传。","warn");}persist();index++;render(); }
async function syncPending() { const items=pendingVotes();if(!items.length){setSyncStatus("所有本机投票均已上传。","ok");updateCompleteMessage();return;}if(!db){setSyncStatus("Supabase 尚未配置，无法在线上传。","warn");return;}setSyncStatus(`正在上传 ${items.length} 条本机记录…`);for(const v of items){const r=await syncVote(v);v.syncStatus=r.ok?"synced":"failed";v.syncError=r.message||null;}persist();const n=pendingVotes().length;setSyncStatus(n?`${n} 条记录未上传，请检查网络后重试。`:"所有投票已上传。",n?"warn":"ok");updateCompleteMessage(); }
function updateCompleteMessage(){const n=pendingVotes().length;document.querySelector('#completeMessage').textContent=n?`${n} 条选择仍在本机，点击“重新上传”或下载 CSV 备份。`:"所有选择已成功上传。你也可以下载 CSV 留存。";}
function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`;}
function exportCsv(){const rows=[["participant_id","question_id","selected_slot_1","selected_slot_2","shown_label_slot_map","elapsed_seconds","saved_at","sync_status"]];for(const q of questions){const v=state.votes[q.id];if(v)rows.push([state.participantId,v.questionId,v.selectedSlots[0],v.selectedSlots[1],JSON.stringify(v.shownOrder),v.elapsedSeconds,v.savedAt,v.syncStatus]);}const blob=new Blob([rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`blind-vote-${state.participantId.slice(0,8)}.csv`});a.click();URL.revokeObjectURL(a.href);}
document.querySelector('#nextBtn').onclick=saveAndAdvance;document.querySelector('#prevBtn').onclick=()=>{if(index){index--;render();}};document.querySelector('#syncBtn').onclick=syncPending;document.querySelector('#syncCompleteBtn').onclick=syncPending;document.querySelector('#exportBtn').onclick=exportCsv;document.querySelector('#exportCompleteBtn').onclick=exportCsv;document.querySelector('#resetBtn').onclick=()=>{if(confirm('确定清除这台设备上保存的全部投票吗？')){localStorage.removeItem(STORAGE_KEY);location.reload();}};
fetch('questions.json').then(r=>{if(!r.ok)throw new Error(`无法读取 questions.json (${r.status})`);return r.json();}).then(async data=>{questions=shuffle(data);document.querySelector('#loading').hidden=true;document.querySelector('#app').hidden=false;try{await setupSupabase();}catch(e){setSyncStatus(`后台连接失败：${e.message}；投票仍会保存在本机。`,"warn");}render();}).catch(e=>{document.querySelector('#loading').hidden=true;const el=document.querySelector('#error');el.hidden=false;el.textContent=`载入失败：${e.message}`;});
