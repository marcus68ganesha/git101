# IR Receipts — Offline Payment & Receipt Dashboard

For **IR Robotics Creativity and Design**. It runs fully offline on your Windows PC: no internet, no installation, no account.

## Install (one time)
1. Download this folder. On GitHub: **Code → Download ZIP**, then open the ZIP and copy the `ir-receipts` folder to `Documents\IR Receipts`.
2. Double-click **`Open IR Receipts.bat`**. The app opens in its own Microsoft Edge window.
3. (Optional) Right-click `Open IR Receipts.bat` → **Send to → Desktop (create shortcut)**. You now have a desktop icon.

> Always open the app from the **same folder and the same browser (Edge)**. Your records are stored inside Edge for that folder.

## Daily use
| I want to… | Do this |
|---|---|
| Record a payment | **New Payment** → fill in school, person in charge, method → add item rows → **Save & view receipt** |
| Get the receipt | On the receipt page: **Download PDF** (A4, file named like `IR-2026-0001.pdf`) or **Print** |
| Fix a mistake | Open the receipt → **Edit**. The receipt number stays the same |
| See this month's total | **Dashboard**. Use ◀ ▶ to change month, or click a bar in the chart |
| Find a receipt | **Records** → type in the search box (receipt no., school, person or item) |
| Export a list | **Records** → choose Month / Whole year / All → **Export Excel** or **Export PDF** |

Receipt numbers are automatic: `IR-2026-0001`, `IR-2026-0002`, … and they restart at `0001` each new year.

## Backup (please do this!)
Your data lives inside Edge on this PC. If Edge's browsing data is cleared or the PC breaks, the records are lost unless you have a backup.

- **Best:** Backup page → **Choose auto-backup file**. Save the file inside your Google Drive or OneDrive folder. After that, every change is saved there automatically. When you reopen the app, click **Reconnect** once if asked.
- **Manual:** Backup page → **Download backup file** (a `.json` file). Keep it on a USB stick or in the cloud.
- **Restore / move to a new PC:** Backup page → **Restore from backup** → pick the `.json` file.

⚠️ When you clear Edge's browsing data, do **not** tick "Cookies and other site data", or back up first.

## Folder contents
- `index.html`: the app
- `js/`: app code (`db.js` storage, `app.js` screens, `receipt.js` receipt + PDF, `export.js` Excel/PDF/backup, `logo.js` embedded logo)
- `vendor/`: offline copies of jsPDF, jsPDF-AutoTable and SheetJS
- `css/style.css`: look and A4 print layout
