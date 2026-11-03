"""Make one blank progress report per student from a Word template.

Usage:
    python3 make_reports.py --template templates/robotics_progress_report_template.docx \
        --namelist "names.xlsx" [--namelist "more_names.xlsx" ...] --out "Robotics_Progress_Reports_2026" [--group]

- Name lists are .xlsx files. If the first row has a "NAME" header, the NAME and CLASS
  columns are used; otherwise column B is the name and the last filled column is the class.
- Names and classes are written in UPPERCASE; "(New)" notes are dropped; spelling is never changed.
- --group puts reports into "Year 1-2 (Primary)", "Year 3-6 (Primary)" and "Year 7-9 (Secondary)" folders.
- Never commit name lists or generated reports: they contain student data.
"""
import argparse, os, re
import docx, openpyxl
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def fill_bracket(par, value):
    """Paragraph runs: label, ' [', ' ', ']' ... -> put value in the blank run."""
    runs = par.runs
    i = next(k for k, r in enumerate(runs) if r.text.endswith("["))
    runs[i + 1].text = f" {value} "


def clear_ticks(doc):
    """Replace Wingdings tick symbols with a space so every option reads '[ ]'."""
    for p in doc.paragraphs:
        for sym in p._p.findall(".//" + qn("w:sym")):
            t = OxmlElement("w:t")
            t.set(qn("xml:space"), "preserve")
            t.text = " "
            sym.getparent().replace(sym, t)


def clear_marks(doc):
    t = doc.tables[0]
    col = [c.text.strip() for c in t.rows[0].cells].index("Mark Achieved")
    for row in t.rows[1:]:
        for r in row.cells[col].paragraphs[0].runs:
            r._r.getparent().remove(r._r)


def clear_header(doc):
    """Remove the school name, logo and address from the page header."""
    for sec in doc.sections:
        h = sec.header._element
        for el in list(h):
            h.remove(el)
        h.append(OxmlElement("w:p"))


def students(path):
    rows = [r for r in openpyxl.load_workbook(path).active.iter_rows(values_only=True)
            if any(c not in (None, "") for c in r)]
    head = [str(c or "").upper() for c in rows[0]]
    if any("NAME" in h for h in head):
        name_col = next(i for i, h in enumerate(head) if "NAME" in h)
        class_col = next(i for i, h in enumerate(head) if "CLASS" in h)
        rows = rows[1:]
    else:
        name_col, class_col = 1, None
    for r in rows:
        if not r[name_col]:
            continue
        cls = r[class_col] if class_col is not None else [c for c in r if c not in (None, "")][-1]
        name = re.sub(r"\(\s*new\s*\)", "", str(r[name_col]), flags=re.I)
        yield " ".join(name.split()).upper(), " ".join(str(cls).split()).upper()


def year_group(cls):
    year = int(re.match(r"\d+", cls).group())
    return "Year 1-2 (Primary)" if year <= 2 else "Year 3-6 (Primary)" if year <= 6 else "Year 7-9 (Secondary)"


def build(template, name, cls, out_dir):
    doc = docx.Document(template)
    by = {p.text.split(":")[0].strip(): p for p in doc.paragraphs
          if p.text.startswith(("Student Name", "Class Level"))}
    fill_bracket(by["Student Name"], name)
    fill_bracket(by["Class Level"], cls)
    clear_ticks(doc)
    clear_marks(doc)
    clear_header(doc)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{name} - Progress Report.docx")
    doc.save(path)
    return path


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--template", required=True)
    ap.add_argument("--namelist", required=True, action="append")
    ap.add_argument("--out", required=True)
    ap.add_argument("--group", action="store_true", help="split into year-group folders")
    a = ap.parse_args()
    counts = {}
    for nl in a.namelist:
        for name, cls in students(nl):
            sub = year_group(cls) if a.group else ""
            build(a.template, name, cls, os.path.join(a.out, sub))
            counts[sub or "all"] = counts.get(sub or "all", 0) + 1
    for k, v in counts.items():
        print(f"{k}: {v}")
