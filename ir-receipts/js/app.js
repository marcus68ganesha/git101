// Main app: navigation, payment form, dashboard, records, backup page.
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const state = {
  payments: [],
  month: todayISO().slice(0, 7),   // month shown on the dashboard (YYYY-MM)
  editing: null,                   // payment being edited, or null for new
  viewing: null,                   // payment shown on the receipt page
  returnTo: 'dashboard',
  sort: { key: 'receiptNo', dir: -1 },
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const monthLabel = ym => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
function shiftMonth(ym, n) {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const sum = list => list.reduce((s, p) => s + p.total, 0);

function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3000);
}

async function reload() {
  state.payments = await DB.getAllPayments();
}

// Called after every add / edit / delete.
async function afterChange() {
  await reload();
  try { await AutoBackup.write(); } catch (e) { console.warn('Auto-backup failed', e); }
  refreshBanner();
}

/* ---------- Navigation ---------- */
function show(view) {
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + view; });
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'dashboard') renderDashboard();
  if (view === 'records') renderRecords();
  if (view === 'backup') renderBackup();
  window.scrollTo(0, 0);
}

$$('nav button').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.view === 'form') openForm(null); else show(b.dataset.view);
}));
document.addEventListener('click', e => {
  const go = e.target.closest('[data-goto]');
  if (go) openForm(null);
  const open = e.target.closest('[data-open]');
  if (open) openReceipt(open.dataset.open);
});

/* ---------- Dashboard ---------- */
function paymentTable(list) {
  if (!list.length) return '<p class="empty">No payments yet. 🎈</p>';
  return `<table class="records"><thead><tr><th>Receipt No.</th><th>Date</th><th>School</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>
    ${list.map(p => `<tr class="clickable" data-open="${p.id}">
      <td>${esc(p.receiptNo)}</td><td>${fmtDate(p.date)}</td><td>${esc(p.schoolName)}</td>
      <td><span class="tag ${p.method.toLowerCase()}">${esc(p.method)}</span></td><td class="r">${fmtRM(p.total)}</td></tr>`).join('')}
  </tbody></table>`;
}

function renderDashboard() {
  const ym = state.month, year = ym.slice(0, 4);
  $('#dMonth').value = ym;
  $('#dMonthLabel').textContent = monthLabel(ym);
  const inMonth = state.payments.filter(p => p.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo.localeCompare(a.receiptNo));
  $('#tTotal').textContent = fmtRM(sum(inMonth));
  $('#tCount').textContent = inMonth.length;
  for (const m of ['Cash', 'Transfer', 'Card']) $('#t' + m).textContent = fmtRM(sum(inMonth.filter(p => p.method === m)));
  $('#dList').innerHTML = paymentTable(inMonth);

  // 12-month bar chart for the year
  $('#chartYear').textContent = year;
  const totals = MONTHS.map((_, i) => sum(state.payments.filter(p => p.date.startsWith(`${year}-${String(i + 1).padStart(2, '0')}`))));
  $('#yearTotal').textContent = fmtRM(totals.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1), W = 720, H = 200, bw = W / 12;
  const bars = totals.map((t, i) => {
    const h = Math.round((t / max) * (H - 40));
    const m = `${year}-${String(i + 1).padStart(2, '0')}`;
    const label = t ? (t >= 100000 ? 'RM' + (t / 100000).toFixed(1) + 'k' : 'RM' + Math.round(t / 100)) : '';
    return `<g class="bar${m === ym ? ' current' : ''}" data-month="${m}">
      <title>${monthLabel(m)}: ${fmtRM(t)}</title>
      <rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>
      <rect class="fill" x="${i * bw + 8}" y="${H - 20 - h}" width="${bw - 16}" height="${h}" rx="4"/>
      <text x="${i * bw + bw / 2}" y="${H - 24 - h}" class="val">${label}</text>
      <text x="${i * bw + bw / 2}" y="${H - 4}">${MONTHS[i]}</text></g>`;
  }).join('');
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly totals">${bars}</svg>`;
  $$('#chart .bar').forEach(g => g.addEventListener('click', () => { state.month = g.dataset.month; renderDashboard(); }));
}

$('#dPrev').onclick = () => { state.month = shiftMonth(state.month, -1); renderDashboard(); };
$('#dNext').onclick = () => { state.month = shiftMonth(state.month, 1); renderDashboard(); };
$('#dMonth').onchange = e => { if (e.target.value) { state.month = e.target.value; renderDashboard(); } };

/* ---------- Payment form ---------- */
const form = $('#payForm');

function addItemRow(it = { description: '', qty: 1, unitPrice: '' }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="desc" placeholder="e.g. Robotics class – October (20 students)" value="${esc(it.description)}"></td>
    <td><input class="qty num" type="number" min="0" step="any" value="${esc(it.qty)}"></td>
    <td><input class="price num" type="number" min="0" step="0.01" placeholder="0.00" value="${esc(it.unitPrice)}"></td>
    <td class="r amt">RM 0.00</td>
    <td><button type="button" class="icon del" title="Remove this row">🗑</button></td>`;
  $('#itemRows').appendChild(tr);
  updateFormTotal();
  return tr;
}

function readItems() {
  return $$('#itemRows tr').map(tr => ({
    description: tr.querySelector('.desc').value.trim(),
    qty: Number(tr.querySelector('.qty').value || 0),
    unitPrice: Number(tr.querySelector('.price').value || 0),
  }));
}

function updateFormTotal() {
  let total = 0;
  $$('#itemRows tr').forEach(tr => {
    const s = lineSen({ qty: tr.querySelector('.qty').value, unitPrice: tr.querySelector('.price').value });
    tr.querySelector('.amt').textContent = fmtRM(s);
    total += s;
  });
  $('#formTotal').textContent = fmtRM(total);
}

$('#itemRows').addEventListener('input', updateFormTotal);
$('#itemRows').addEventListener('click', e => {
  if (!e.target.classList.contains('del')) return;
  e.target.closest('tr').remove();
  if (!$('#itemRows tr')) addItemRow();
  updateFormTotal();
});
$('#addRow').onclick = () => addItemRow().querySelector('.desc').focus();
$('#cancelForm').onclick = () => (state.editing ? openReceipt(state.editing.id) : show('dashboard'));

function fillDatalists() {
  const uniq = key => [...new Set(state.payments.map(p => p[key]).filter(Boolean))].sort();
  $('#schoolList').innerHTML = uniq('schoolName').map(s => `<option value="${esc(s)}">`).join('');
  $('#personList').innerHTML = uniq('personInCharge').map(s => `<option value="${esc(s)}">`).join('');
}

function openForm(p) {
  state.editing = p;
  form.reset();
  $('#itemRows').innerHTML = '';
  fillDatalists();
  $('#formTitle').textContent = p ? 'Edit Payment' : 'New Payment';
  $('#formReceiptNo').textContent = p ? p.receiptNo : 'Receipt no. given on save';
  if (p) {
    for (const k of ['date', 'method', 'schoolName', 'personInCharge', 'reference', 'notes']) form.elements[k].value = p[k] || '';
    p.items.forEach(addItemRow);
  } else {
    form.elements.date.value = todayISO();
    addItemRow();
  }
  show('form');
  form.elements.schoolName.focus();
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const f = form.elements;
  const items = readItems().filter(it => it.description || it.unitPrice);
  if (!items.length) return toast('Please add at least one item.', true);
  if (items.some(it => !it.description)) return toast('Every item needs a description.', true);
  const total = items.reduce((s, it) => s + lineSen(it), 0);
  if (total <= 0) return toast('Total must be more than RM 0.00.', true);

  const old = state.editing;
  if (old && old.date.slice(0, 4) !== f.date.value.slice(0, 4)) {
    // Receipt numbers carry the year; keep the original number to avoid gaps.
    if (!confirm(`This receipt is ${old.receiptNo}. Changing the year will keep the same receipt number. Continue?`)) return;
  }
  const p = {
    ...(old || {}),
    date: f.date.value,
    method: f.method.value,
    schoolName: f.schoolName.value.trim(),
    personInCharge: f.personInCharge.value.trim(),
    reference: f.reference.value.trim(),
    notes: f.notes.value.trim(),
    items,
    total,
  };
  try {
    const saved = await DB.savePayment(p);
    await afterChange();
    toast(old ? `Updated ${saved.receiptNo} ✔` : `Saved ${saved.receiptNo} ✔`);
    state.editing = null;
    openReceipt(saved.id, 'dashboard');
  } catch (err) {
    toast('Could not save: ' + err.message, true);
  }
});

/* ---------- Receipt page ---------- */
function openReceipt(id, returnTo) {
  const p = state.payments.find(x => x.id === id);
  if (!p) return;
  state.viewing = p;
  if (returnTo) state.returnTo = returnTo;
  else state.returnTo = $('#view-records').hidden ? 'dashboard' : 'records';
  $('#receiptBox').innerHTML = receiptHTML(p);
  show('receipt');
}
$('#rcBack').onclick = () => show(state.returnTo);
$('#rcEdit').onclick = () => openForm(state.viewing);
$('#rcPrint').onclick = () => window.print();
$('#rcPdf').onclick = () => receiptPDF(state.viewing);

/* ---------- Records ---------- */
$('#rMonth').value = state.month;

function filteredRecords() {
  const q = $('#rSearch').value.trim().toLowerCase();
  const scope = $('#rScope').value, ym = $('#rMonth').value || state.month;
  const method = $('#rMethod').value;
  let list = state.payments.filter(p => {
    if (scope === 'month' && !p.date.startsWith(ym)) return false;
    if (scope === 'year' && !p.date.startsWith(ym.slice(0, 4))) return false;
    if (method && p.method !== method) return false;
    if (q) {
      const hay = [p.receiptNo, p.schoolName, p.personInCharge, p.reference, p.notes, ...p.items.map(i => i.description)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const { key, dir } = state.sort;
  list.sort((a, b) => (key === 'total' ? a.total - b.total : String(a[key]).localeCompare(String(b[key]))) * dir);
  return list;
}

function recordsTitle() {
  const scope = $('#rScope').value, ym = $('#rMonth').value || state.month;
  let t = scope === 'month' ? monthLabel(ym) : scope === 'year' ? 'Year ' + ym.slice(0, 4) : 'All records';
  if ($('#rMethod').value) t += ' - ' + $('#rMethod').value;
  if ($('#rSearch').value.trim()) t += ` - search "${$('#rSearch').value.trim()}"`;
  return t;
}

function renderRecords() {
  $('#rMonth').disabled = $('#rScope').value === 'all';
  const list = filteredRecords();
  $('#rRows').innerHTML = list.length ? list.map(p => `
    <tr>
      <td><a href="#" data-open="${p.id}">${esc(p.receiptNo)}</a></td>
      <td>${fmtDate(p.date)}</td>
      <td>${esc(p.schoolName)}</td>
      <td>${esc(p.personInCharge)}</td>
      <td><span class="tag ${p.method.toLowerCase()}">${esc(p.method)}</span></td>
      <td class="r">${fmtRM(p.total)}</td>
      <td class="row-actions">
        <button class="icon" data-act="view" data-id="${p.id}" title="View receipt">🧾</button>
        <button class="icon" data-act="edit" data-id="${p.id}" title="Edit">✏️</button>
        <button class="icon" data-act="del" data-id="${p.id}" title="Delete">🗑</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty">No matching records.</td></tr>';
  $('#rCount').textContent = `${list.length} receipt${list.length === 1 ? '' : 's'} · Total`;
  $('#rTotal').textContent = fmtRM(sum(list));
  $$('.records th[data-sort]').forEach(th => {
    th.classList.toggle('sorted', th.dataset.sort === state.sort.key);
    th.dataset.dir = state.sort.dir > 0 ? '▲' : '▼';
  });
}

['#rSearch', '#rScope', '#rMonth', '#rMethod'].forEach(s => $(s).addEventListener('input', renderRecords));
$$('#view-records th[data-sort]').forEach(th => th.addEventListener('click', () => {
  state.sort = { key: th.dataset.sort, dir: state.sort.key === th.dataset.sort ? -state.sort.dir : -1 };
  renderRecords();
}));
$('#rRows').addEventListener('click', async e => {
  if (e.target.closest('a[data-open]')) e.preventDefault();
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const p = state.payments.find(x => x.id === b.dataset.id);
  if (b.dataset.act === 'view') openReceipt(p.id, 'records');
  if (b.dataset.act === 'edit') openForm(p);
  if (b.dataset.act === 'del' && confirm(`Delete ${p.receiptNo} (${p.schoolName}, ${fmtRM(p.total)})?\nThis cannot be undone.`)) {
    await DB.deletePayment(p.id);
    await afterChange();
    renderRecords();
    toast(`Deleted ${p.receiptNo}`);
  }
});
$('#exportXlsx').onclick = () => {
  const list = filteredRecords();
  if (!list.length) return toast('Nothing to export.', true);
  exportExcel(list, recordsTitle());
};
$('#exportPdf').onclick = () => {
  const list = filteredRecords();
  if (!list.length) return toast('Nothing to export.', true);
  exportListPDF(list, recordsTitle());
};

/* ---------- Backup ---------- */
async function renderBackup() {
  const last = await DB.getSetting('lastBackup');
  $('#lastBackup').textContent = last ? new Date(last).toLocaleString('en-GB') : 'never';
  if (!AutoBackup.supported) {
    $('#autoStatus').textContent = 'Auto-backup needs Microsoft Edge or Google Chrome.';
    $('#autoChoose').hidden = true;
    return;
  }
  const perm = await AutoBackup.permission();
  $('#autoStatus').textContent = perm === 'none' ? 'Auto-backup is off.'
    : perm === 'granted' ? `✅ Auto-backup is ON → ${AutoBackup.name}`
    : `⚠️ Auto-backup file "${AutoBackup.name}" needs permission again. Click Reconnect.`;
  $('#autoChoose').textContent = perm === 'none' ? '📂 Choose auto-backup file' : '📂 Change file';
  $('#autoReconnect').hidden = perm !== 'prompt';
  $('#autoStop').hidden = perm === 'none';
}

$('#doBackup').onclick = async () => { await downloadBackup(); toast('Backup downloaded ✔'); renderBackup(); refreshBanner(); };
$('#restoreFile').onchange = async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!confirm(`Restore ${data.payments?.length ?? 0} payments from "${file.name}"?\nThis REPLACES all current records.`)) return;
    await DB.importAll(data);
    await afterChange();
    toast('Backup restored ✔');
    renderBackup();
  } catch (err) {
    toast('Restore failed: ' + err.message, true);
  }
};
$('#autoChoose').onclick = async () => {
  try { await AutoBackup.choose(); toast('Auto-backup is on ✔'); } catch (err) { if (err.name !== 'AbortError') toast(err.message, true); }
  renderBackup(); refreshBanner();
};
$('#autoReconnect').onclick = async () => { await AutoBackup.reconnect(); renderBackup(); refreshBanner(); };
$('#autoStop').onclick = async () => { await AutoBackup.stop(); renderBackup(); refreshBanner(); };

// Reminder banner: auto-backup needs reconnecting, or no backup in 7 days.
async function refreshBanner() {
  const b = $('#banner');
  const perm = AutoBackup.supported ? await AutoBackup.permission() : 'none';
  const last = await DB.getSetting('lastBackup');
  const stale = state.payments.length && (!last || Date.now() - new Date(last) > 7 * 864e5);
  if (perm === 'prompt') {
    b.innerHTML = '🔗 Auto-backup is paused until you allow it again. <button class="btn small" id="bReconnect">Reconnect</button>';
    b.hidden = false;
    $('#bReconnect').onclick = async () => { await AutoBackup.reconnect(); refreshBanner(); };
  } else if (stale && perm !== 'granted') {
    b.innerHTML = '💾 No backup in the last 7 days. <button class="btn small" id="bBackup">Back up now</button>';
    b.hidden = false;
    $('#bBackup').onclick = async () => { await downloadBackup(); toast('Backup downloaded ✔'); refreshBanner(); };
  } else {
    b.hidden = true;
  }
}

/* ---------- Start ---------- */
(async function init() {
  $('#brandLogo').src = window.IR_LOGO;
  try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch { /* ignore */ }
  await AutoBackup.restoreHandle();
  await reload();
  refreshBanner();
  show('dashboard');
})();
