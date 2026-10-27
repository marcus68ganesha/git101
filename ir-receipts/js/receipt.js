// Business details printed on every receipt.
const BUSINESS = {
  name: 'IR Robotics Creativity and Design',
  address: ['45B, Jln BRP 6/10, Bukit Rahman Putra,', '40160 Shah Alam, Selangor'],
  email: 'ir.robotic3@gmail.com',
};

// Money is kept in sen (integers) so totals never get rounding errors.
const toSen = rm => Math.round(Number(rm || 0) * 100);
const fmtRM = sen => 'RM ' + (sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lineSen = it => Math.round(Number(it.qty || 0) * toSen(it.unitPrice));

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 15050 sen -> "Ringgit Malaysia One Hundred Fifty And Fifty Sen Only"
function amountInWords(sen) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const under1000 = n => {
    const parts = [];
    if (n >= 100) { parts.push(ones[Math.floor(n / 100)] + ' Hundred'); n %= 100; }
    if (n >= 20) { parts.push(tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')); }
    else if (n > 0) parts.push(ones[n]);
    return parts.join(' ');
  };
  const words = n => {
    if (n === 0) return 'Zero';
    const scales = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']];
    const parts = [];
    for (const [v, name] of scales) {
      if (n >= v) { parts.push(under1000(Math.floor(n / v)) + ' ' + name); n %= v; }
    }
    if (n > 0) parts.push(under1000(n));
    return parts.join(' ');
  };
  const rm = Math.floor(sen / 100), cents = sen % 100;
  return 'Ringgit Malaysia ' + words(rm) + (cents ? ' And ' + words(cents) + ' Sen' : '') + ' Only';
}

// Receipt as HTML (on-screen preview and printing).
function receiptHTML(p) {
  const rows = p.items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(it.description)}</td>
      <td class="c">${esc(it.qty)}</td>
      <td class="r">${fmtRM(toSen(it.unitPrice))}</td>
      <td class="r">${fmtRM(lineSen(it))}</td>
    </tr>`).join('');
  return `
  <div class="receipt">
    <header class="rc-head">
      <img src="${window.IR_LOGO}" alt="IR Robotics logo">
      <div>
        <h2>${esc(BUSINESS.name)}</h2>
        <p>${BUSINESS.address.map(esc).join('<br>')}</p>
      </div>
    </header>
    <h1 class="rc-title">OFFICIAL RECEIPT</h1>
    <table class="rc-meta">
      <tr><th>Receipt No.</th><td>${esc(p.receiptNo)}</td><th>Date</th><td>${fmtDate(p.date)}</td></tr>
      <tr><th>Received from</th><td colspan="3">${esc(p.schoolName)}</td></tr>
      <tr><th>Person in charge</th><td colspan="3">${esc(p.personInCharge)}</td></tr>
    </table>
    <table class="rc-items">
      <thead><tr><th class="c">No.</th><th>Description</th><th class="c">Qty</th><th class="r">Unit Price</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" class="r">TOTAL</td><td class="r">${fmtRM(p.total)}</td></tr></tfoot>
    </table>
    <p class="rc-words"><b>Amount in words:</b> ${amountInWords(p.total)}</p>
    <p><b>Payment method:</b> ${esc(p.method)}${p.reference ? ` &nbsp;(Ref: ${esc(p.reference)})` : ''}</p>
    ${p.notes ? `<p><b>Notes:</b> ${esc(p.notes)}</p>` : ''}
    <div class="rc-sign">
      <div><div class="line"></div>Received by<br>${esc(BUSINESS.name)}</div>
    </div>
    <footer class="rc-foot">Thank you for your payment. &nbsp;|&nbsp; Email: ${esc(BUSINESS.email)}<br>
      <small>This is a computer-generated receipt.</small></footer>
  </div>`;
}

// Receipt as an A4 PDF file, drawn directly with jsPDF (sharp text, small file).
function receiptPDF(p) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18;
  const purple = [91, 79, 214];

  doc.addImage(window.IR_LOGO, 'JPEG', M, 14, 30, 30);
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(30);
  doc.text(BUSINESS.name, M + 36, 24);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(80);
  doc.text(BUSINESS.address, M + 36, 31);

  doc.setDrawColor(...purple).setLineWidth(0.8).line(M, 50, W - M, 50);
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...purple);
  doc.text('OFFICIAL RECEIPT', W / 2, 62, { align: 'center' });

  doc.autoTable({
    startY: 70, margin: { left: M, right: M }, theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1.8, textColor: 30 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 }, 2: { fontStyle: 'bold', cellWidth: 18 }, 3: { cellWidth: 40 } },
    body: [
      ['Receipt No.', p.receiptNo, 'Date', fmtDate(p.date)],
      ['Received from', { content: p.schoolName, colSpan: 3 }],
      ['Person in charge', { content: p.personInCharge || '-', colSpan: 3 }],
    ],
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6, margin: { left: M, right: M }, theme: 'grid',
    headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 2.5, lineColor: 200 },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 16 }, 3: { halign: 'right', cellWidth: 32 }, 4: { halign: 'right', cellWidth: 34 } },
    head: [['No.', 'Description', { content: 'Qty', styles: { halign: 'center' } }, { content: 'Unit Price', styles: { halign: 'right' } }, { content: 'Amount', styles: { halign: 'right' } }]],
    body: p.items.map((it, i) => [i + 1, it.description, it.qty, fmtRM(toSen(it.unitPrice)), fmtRM(lineSen(it))]),
    foot: [[{ content: 'TOTAL', colSpan: 4, styles: { halign: 'right' } }, { content: fmtRM(p.total), styles: { halign: 'right' } }]],
    footStyles: { fillColor: [240, 238, 255], textColor: 20, fontStyle: 'bold' },
  });

  let y = doc.lastAutoTable.finalY + 8;
  const para = (label, value) => {
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(30).text(label, M, y);
    const lines = doc.setFont('helvetica', 'normal').splitTextToSize(value, W - 2 * M - 38);
    doc.text(lines, M + 38, y);
    y += lines.length * 5 + 2;
  };
  para('Amount in words:', amountInWords(p.total));
  para('Payment method:', p.method + (p.reference ? `  (Ref: ${p.reference})` : ''));
  if (p.notes) para('Notes:', p.notes);

  if (y > 240) { doc.addPage(); y = 30; }
  y = Math.max(y + 20, 230);
  doc.setDrawColor(120).setLineWidth(0.3).line(W - M - 70, y, W - M, y);
  doc.setFontSize(10).setTextColor(60).text(['Received by', BUSINESS.name], W - M - 35, y + 5, { align: 'center' });

  doc.setDrawColor(...purple).setLineWidth(0.5).line(M, 275, W - M, 275);
  doc.setFontSize(9).setTextColor(90);
  doc.text(`Thank you for your payment.  |  Email: ${BUSINESS.email}`, W / 2, 281, { align: 'center' });
  doc.setFontSize(8).text('This is a computer-generated receipt.', W / 2, 286, { align: 'center' });

  doc.save(`${p.receiptNo}.pdf`);
}
