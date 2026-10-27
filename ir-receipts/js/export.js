// Excel / PDF exports of a payment list, plus backup files.
const itemsText = p => p.items.map(it => `${it.description} (x${it.qty})`).join('; ');

function exportExcel(list, title) {
  const rows = list.map(p => ({
    'Receipt No.': p.receiptNo,
    'Date': p.date,
    'School': p.schoolName,
    'Person in charge': p.personInCharge,
    'Items': itemsText(p),
    'Payment method': p.method,
    'Reference': p.reference || '',
    'Amount (RM)': p.total / 100,
  }));
  const total = list.reduce((s, p) => s + p.total, 0);
  rows.push({ 'Payment method': 'TOTAL', 'Amount (RM)': total / 100 });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [12, 12, 30, 22, 45, 15, 15, 14].map(wch => ({ wch }));
  // Show the amount column with 2 decimals.
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 7 })];
    if (cell) cell.z = '#,##0.00';
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  XLSX.writeFile(wb, `IR Payments - ${title}.xlsx`);
}

function exportListPDF(list, title) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  doc.addImage(window.IR_LOGO, 'JPEG', 14, 10, 18, 18);
  doc.setFont('helvetica', 'bold').setFontSize(14).text(BUSINESS.name, 36, 18);
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(90).text(`Payment Records - ${title}`, 36, 25);

  const total = list.reduce((s, p) => s + p.total, 0);
  doc.autoTable({
    startY: 34, theme: 'striped',
    headStyles: { fillColor: [91, 79, 214] },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 7: { halign: 'right' } },
    head: [['Receipt No.', 'Date', 'School', 'Person in charge', 'Items', 'Method', 'Ref', { content: 'Amount', styles: { halign: 'right' } }]],
    body: list.map(p => [p.receiptNo, fmtDate(p.date), p.schoolName, p.personInCharge, itemsText(p), p.method, p.reference || '', fmtRM(p.total)]),
    foot: [[{ content: `TOTAL (${list.length} receipt${list.length === 1 ? '' : 's'})`, colSpan: 7, styles: { halign: 'right' } }, { content: fmtRM(total), styles: { halign: 'right' } }]],
    footStyles: { fillColor: [240, 238, 255], textColor: 20 },
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i).setFontSize(8).setTextColor(120);
    doc.text(`Printed ${new Date().toLocaleString('en-GB')}  |  Page ${i} of ${pages}`, 283, 203, { align: 'right' });
  }
  doc.save(`IR Payments - ${title}.pdf`);
}

function downloadFile(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function downloadBackup() {
  const data = await DB.exportAll();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`IR-Receipts-backup-${stamp}.json`, JSON.stringify(data, null, 1), 'application/json');
  await DB.setSetting('lastBackup', new Date().toISOString());
}

// Optional auto-backup: the user picks a file once; it is rewritten after every change.
const AutoBackup = (() => {
  let handle = null;
  const supported = 'showSaveFilePicker' in window;

  async function choose() {
    handle = await window.showSaveFilePicker({
      suggestedName: 'IR-Receipts-autobackup.json',
      types: [{ description: 'Backup file', accept: { 'application/json': ['.json'] } }],
    });
    await DB.setSetting('autoBackupHandle', handle);
    await write();
  }

  async function restoreHandle() {
    if (!supported) return;
    try { handle = (await DB.getSetting('autoBackupHandle')) || null; } catch { handle = null; }
  }

  async function permission() {
    if (!handle) return 'none';
    return handle.queryPermission({ mode: 'readwrite' });
  }

  async function reconnect() {
    if (handle && (await handle.requestPermission({ mode: 'readwrite' })) === 'granted') await write();
  }

  async function write() {
    if (!handle || (await permission()) !== 'granted') return false;
    const w = await handle.createWritable();
    await w.write(JSON.stringify(await DB.exportAll(), null, 1));
    await w.close();
    await DB.setSetting('lastBackup', new Date().toISOString());
    return true;
  }

  async function stop() { handle = null; await DB.setSetting('autoBackupHandle', null); }

  return { supported, choose, restoreHandle, permission, reconnect, write, stop, get name() { return handle && handle.name; } };
})();
