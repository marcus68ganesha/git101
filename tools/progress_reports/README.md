# Progress report maker

Makes one blank progress report (Word) per student from a template and a name list.

## Templates

| File | Subject |
|---|---|
| `templates/robotics_progress_report_template.docx` | Robotics |
| `templates/coding_progress_report_template.docx` | Coding |

Both are blank: no header, no ticks, no marks. Teacher is "Dave" and Duration Lesson is 27.
Edit them in Word if these change.

## How to use

```bash
python3 -m pip install python-docx openpyxl

python3 tools/progress_reports/make_reports.py \
  --template tools/progress_reports/templates/robotics_progress_report_template.docx \
  --namelist "robotic_namelist_year_1_2.xlsx" \
  --namelist "robotic_namelist_year_3_6.xlsx" \
  --out "Robotics_Progress_Reports_2026" --group
```

- `--namelist` can be repeated. Name lists are `.xlsx`. With a header row, the NAME and CLASS
  columns are used. Without one, column B is the name and the last filled column is the class.
- `--group` sorts reports into `Year 1-2 (Primary)`, `Year 3-6 (Primary)` and `Year 7-9 (Secondary)`.
- Files are named `<STUDENT NAME> - Progress Report.docx`. Names are uppercased and the spelling is
  never changed. A "(New)" note is dropped.

## Privacy

This repository is public. **Never commit name lists or generated reports.** Keep them outside the
repo. The `.gitignore` blocks `.xlsx` files and `*Progress_Reports*` folders as a safety net.
