import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportAnswer, TemplateWithItems } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
    textAlign: "center",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
    borderBottom: "1pt solid #D1D5DB",
    paddingBottom: 10,
  },
  detailItem: {
    width: "50%",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
  },
  table: {
    borderTop: "1pt solid #D1D5DB",
    borderLeft: "1pt solid #D1D5DB",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCellHeader: {
    flex: 1,
    padding: 5,
    borderRight: "1pt solid #D1D5DB",
    borderBottom: "1pt solid #D1D5DB",
    backgroundColor: "#F3F4F6",
    fontWeight: 700,
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
    padding: 5,
    borderRight: "1pt solid #D1D5DB",
    borderBottom: "1pt solid #D1D5DB",
    fontSize: 9,
  },
  tableCellWide: {
    flex: 3,
    padding: 5,
    borderRight: "1pt solid #D1D5DB",
    borderBottom: "1pt solid #D1D5DB",
    fontSize: 9,
  },
  question: {
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 10,
    fontWeight: 700,
  },
  questionHelper: {
    fontSize: 8.5,
    color: "#6B7280",
    marginBottom: 2,
  },
  answer: {
    fontSize: 10,
    marginTop: 2,
    paddingLeft: 8,
  },
});

type ReportDocumentProps = {
  studentName: string;
  report: {
    lesson_date: string;
    class_level: string | null;
    teacher_name: string | null;
    duration_text: string | null;
    status: string;
  };
  template: TemplateWithItems;
  answersByItem: Map<string, ReportAnswer>;
};

export default function ReportDocument({
  studentName,
  report,
  template,
  answersByItem,
}: ReportDocumentProps) {
  const scoring = template.report_template_items.filter(
    (i) => i.section === "scoring",
  );
  const observation = template.report_template_items.filter(
    (i) => i.section === "observation",
  );
  const notes = template.report_template_items.filter(
    (i) => i.section === "notes",
  );

  return (
    <Document title={`${template.name} - ${studentName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{template.name}</Text>

        <View style={styles.detailsGrid}>
          <DetailItem label="Student Name" value={studentName} />
          <DetailItem label="Class Level" value={report.class_level} />
          <DetailItem label="Date" value={report.lesson_date} />
          <DetailItem label="Teacher Name" value={report.teacher_name} />
          <DetailItem label="Duration" value={report.duration_text} />
        </View>

        {scoring.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Scoring</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCellHeader}>#</Text>
                <Text style={[styles.tableCellHeader, { flex: 4 }]}>
                  Criteria
                </Text>
                <Text style={styles.tableCellHeader}>Mark Achieved</Text>
                <Text style={styles.tableCellHeader}>Full Marks</Text>
              </View>
              {scoring.map((item, index) => {
                const answer = answersByItem.get(item.id);
                return (
                  <View style={styles.tableRow} key={item.id}>
                    <Text style={styles.tableCell}>{index + 1}</Text>
                    <Text style={[styles.tableCell, { flex: 4 }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.tableCell}>
                      {answer?.score_value ?? ""}
                    </Text>
                    <Text style={styles.tableCell}>{item.max_score}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {observation.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Observation</Text>
            {observation.map((item, index) => {
              const answer = answersByItem.get(item.id);
              let display = "—";
              if (item.item_type === "single_choice") {
                display =
                  item.report_template_options.find(
                    (o) => o.id === answer?.selected_option_id,
                  )?.label ?? "—";
              } else {
                display = answer?.text_value || "—";
              }
              return (
                <View style={styles.question} key={item.id}>
                  <Text style={styles.questionLabel}>
                    {index + 1}. {item.label}
                  </Text>
                  {item.helper_text && (
                    <Text style={styles.questionHelper}>
                      {item.helper_text}
                    </Text>
                  )}
                  <Text style={styles.answer}>{display}</Text>
                </View>
              );
            })}
          </>
        )}

        {notes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            {notes.map((item) => {
              const answer = answersByItem.get(item.id);
              return (
                <View style={styles.question} key={item.id}>
                  <Text style={styles.questionLabel}>{item.label}</Text>
                  <Text style={styles.answer}>
                    {answer?.text_value || "—"}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </Page>
    </Document>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}
