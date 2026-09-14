/* Static blind-voting app. Do not put real model names in questions.json or public image paths. */
const STORAGE_KEY = "blind-photo-vote-v1";
const LABELS = ["A", "B", "C", "D", "E", "F", "G"];
let questions = [], index = 0, selections = new Set(), order = [], startedAt = 0;
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"votes":{},"participantId":null}');
if (!state.participantId) { state.participantId = crypto.randomUUID(); persist(); }

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function current() { return questions[index]; }
function displayOrder(q) { return shuffle(q.candidates).map((candidate, i) => ({ ...candidate, label: LABELS[i] })); }

function render() {
  const q = current();
  if (!q) { document.querySelector('#app').hidden = true; document.querySelector('#complete').hidden = false; return; }
  selections = new Set(state.votes[q.id]?.selectedSlots || []);
  order = displayOrder(q); startedAt = performance.now();
  document.querySelector('#questionId').textContent = ` · 题目 ${q.id}`;
  document.querySelector('#progressText').textContent = `进度 ${index + 1} / ${questions.length}`;
  document.querySelector('#progressBar').style.width = `${index / questions.length * 100}%`;
  document.querySelector('#originalImage').src = q.original;
  document.querySelector('#originalImage').alt = `题目 ${q.id} 的原图`;
  const box = document.querySelector('#choices'); box.innerHTML = '';
  for (const c of order) {
    const card = document.createElement('article'); card.className = 'choice' + (selections.has(c.slot) ? ' selected' : '');
    card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-pressed', selections.has(c.slot));
    card.innerHTML = `<div class="choice-label"><span>候选 ${c.label}</span><span class="rank">${selections.has(c.slot) ? '已选' : '选择'}</span></div><img src="${c.image}" alt="候选 ${c.label}" loading="eager">`;
    const toggle = () => { if (selections.has(c.slot)) selections.delete(c.slot); else if (selections.size < 2) selections.add(c.slot); updateCards(); };
    card.onclick = toggle; card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }; box.append(card);
  }
  updateCards(); document.querySelector('#prevBtn').disabled = index === 0;
}
function updateCards() {
  document.querySelectorAll('.choice').forEach((node, i) => { const picked = selections.has(order[i].slot); node.classList.toggle('selected', picked); node.setAttribute('aria-pressed', picked); node.querySelector('.rank').textContent = picked ? '已选' : '选择'; });
  document.querySelector('#selectionStatus').textContent = `已选择 ${selections.size} / 2`;
  document.querySelector('#nextBtn').disabled = selections.size !== 2;
}
function saveAndAdvance() {
  const q = current(); state.votes[q.id] = { questionId: q.id, selectedSlots: [...selections], shownOrder: order.map(x => ({ label: x.label, slot: x.slot })), elapsedSeconds: Math.round((performance.now() - startedAt) / 1000), savedAt: new Date().toISOString() }; persist(); index++; render();
}
function csvCell(v) { return `"${String(v ?? '').replaceAll('"', '""')}"`; }
function exportCsv() {
  const rows = [["participant_id", "question_id", "selected_slot_1", "selected_slot_2", "shown_label_slot_map", "elapsed_seconds", "saved_at"]];
  for (const q of questions) { const v = state.votes[q.id]; if (v) rows.push([state.participantId, v.questionId, v.selectedSlots[0], v.selectedSlots[1], JSON.stringify(v.shownOrder), v.elapsedSeconds, v.savedAt]); }
  const blob = new Blob([rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `blind-vote-${state.participantId.slice(0, 8)}.csv` }); a.click(); URL.revokeObjectURL(a.href);
}
document.querySelector('#nextBtn').onclick = saveAndAdvance;
document.querySelector('#prevBtn').onclick = () => { if (index) { index--; render(); } };
document.querySelector('#exportBtn').onclick = exportCsv; document.querySelector('#exportCompleteBtn').onclick = exportCsv;
document.querySelector('#resetBtn').onclick = () => { if (confirm('确定清除这台设备上保存的全部投票吗？')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } };
fetch('questions.json').then(r => { if (!r.ok) throw new Error(`无法读取 questions.json (${r.status})`); return r.json(); }).then(data => { questions = shuffle(data); document.querySelector('#loading').hidden = true; document.querySelector('#app').hidden = false; render(); }).catch(e => { document.querySelector('#loading').hidden = true; const el = document.querySelector('#error'); el.hidden = false; el.textContent = `载入失败：${e.message}`; });
