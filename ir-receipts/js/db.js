// IndexedDB storage: everything is kept on this computer, no internet needed.
const DB = (() => {
  const NAME = 'ir_receipts';
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          const s = db.createObjectStore('payments', { keyPath: 'id' });
          s.createIndex('receiptNo', 'receiptNo', { unique: true });
          s.createIndex('date', 'date');
          db.createObjectStore('settings', { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(stores, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode);
      let result;
      Promise.resolve(fn(t)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const req2p = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

  function getAllPayments() {
    return tx(['payments'], 'readonly', t => req2p(t.objectStore('payments').getAll()));
  }

  function getPayment(id) {
    return tx(['payments'], 'readonly', t => req2p(t.objectStore('payments').get(id)));
  }

  // Saves a payment. New payments get the next receipt number (IR-YYYY-NNNN)
  // inside the same transaction, so two numbers can never clash.
  function savePayment(p) {
    return tx(['payments', 'settings'], 'readwrite', async t => {
      const now = new Date().toISOString();
      if (!p.receiptNo) {
        const year = Number(p.date.slice(0, 4));
        const settings = t.objectStore('settings');
        const key = 'seq-' + year;
        const row = (await req2p(settings.get(key))) || { key, last: 0 };
        row.last += 1;
        settings.put(row);
        p.receiptNo = `IR-${year}-${String(row.last).padStart(4, '0')}`;
        p.id = p.id || crypto.randomUUID();
        p.createdAt = now;
      }
      p.updatedAt = now;
      t.objectStore('payments').put(p);
      return p;
    });
  }

  function deletePayment(id) {
    return tx(['payments'], 'readwrite', t => { t.objectStore('payments').delete(id); });
  }

  function getSetting(key) {
    return tx(['settings'], 'readonly', async t => {
      const row = await req2p(t.objectStore('settings').get(key));
      return row ? row.value : undefined;
    });
  }

  function setSetting(key, value) {
    return tx(['settings'], 'readwrite', t => { t.objectStore('settings').put({ key, value }); });
  }

  async function exportAll() {
    return tx(['payments', 'settings'], 'readonly', async t => ({
      app: 'IR Receipts',
      version: 1,
      exportedAt: new Date().toISOString(),
      payments: await req2p(t.objectStore('payments').getAll()),
      // The auto-backup file link only makes sense on this computer.
      settings: (await req2p(t.objectStore('settings').getAll())).filter(s => s.key !== 'autoBackupHandle'),
    }));
  }

  // Replaces all data with the contents of a backup file.
  function importAll(data) {
    if (!data || data.app !== 'IR Receipts' || !Array.isArray(data.payments)) {
      return Promise.reject(new Error('This file is not an IR Receipts backup.'));
    }
    return tx(['payments', 'settings'], 'readwrite', async t => {
      const ps = t.objectStore('payments'), ss = t.objectStore('settings');
      const keepHandle = await req2p(ss.get('autoBackupHandle'));
      ps.clear(); ss.clear();
      data.payments.forEach(p => ps.put(p));
      (data.settings || []).filter(s => s.key !== 'autoBackupHandle').forEach(s => ss.put(s));
      if (keepHandle) ss.put(keepHandle);
    });
  }

  return { getAllPayments, getPayment, savePayment, deletePayment, getSetting, setSetting, exportAll, importAll };
})();
