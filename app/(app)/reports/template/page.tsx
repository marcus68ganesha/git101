import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTemplate } from "@/lib/reportTemplate";
import type { TemplateItemType, TemplateSection } from "@/lib/types";
import { createItem, deleteItem, moveItem } from "./actions";

const SECTIONS: { key: TemplateSection; title: string; help: string }[] = [
  {
    key: "scoring",
    title: "Scoring criteria",
    help: "Each is scored out of a maximum you set.",
  },
  {
    key: "observation",
    title: "Observation questions",
    help: "Multiple-choice or open-text questions about the lesson.",
  },
  {
    key: "notes",
    title: "Notes",
    help: "Open-text fields, e.g. a final \"To Improve\" summary.",
  },
];

const TYPE_LABEL: Record<TemplateItemType, string> = {
  score: "Score",
  single_choice: "Multiple choice",
  open_text: "Open text",
};

export default async function TemplateEditorPage() {
  const supabase = await createClient();
  const template = await getActiveTemplate(supabase);

  if (!template) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Report template
        </h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          No active template found. Run the Phase 2 database migration
          first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {template.name}
        </h1>
        <Link
          href="/reports"
          className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400"
        >
          Back to reports
        </Link>
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        This is the live template every new report is built from. Add,
        reorder, edit, or delete anything below — no code changes needed.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {SECTIONS.map((section) => {
          const items = template.report_template_items.filter(
            (item) => item.section === section.key,
          );
          return (
            <section key={section.key}>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {section.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {section.help}
              </p>

              <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {item.label}
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {TYPE_LABEL[item.item_type]}
                          {item.item_type === "score" &&
                            ` / ${item.max_score}`}
                          {item.item_type === "single_choice" &&
                            ` · ${item.report_template_options.length} option${item.report_template_options.length === 1 ? "" : "s"}`}
                        </span>
                      </p>
                      {item.helper_text && (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.helper_text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <form action={moveItem.bind(null, item.id, "up")}>
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="text-zinc-400 hover:text-zinc-800 disabled:opacity-30 dark:hover:text-zinc-100"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveItem.bind(null, item.id, "down")}>
                        <button
                          type="submit"
                          disabled={index === items.length - 1}
                          className="text-zinc-400 hover:text-zinc-800 disabled:opacity-30 dark:hover:text-zinc-100"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </form>
                      <Link
                        href={`/reports/template/items/${item.id}/edit`}
                        className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400"
                      >
                        Edit
                      </Link>
                      <form action={deleteItem.bind(null, item.id)}>
                        <button
                          type="submit"
                          className="text-red-600 underline hover:text-red-800 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                    Nothing here yet — add one below.
                  </li>
                )}
              </ul>

              <AddItemForm section={section.key} />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AddItemForm({ section }: { section: TemplateSection }) {
  return (
    <form
      action={createItem}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-dashed border-zinc-300 p-3 dark:border-zinc-700"
    >
      <input type="hidden" name="section" value={section} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Label</span>
        <input
          name="label"
          required
          placeholder="e.g. Punctuality"
          className="w-56 rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      {section === "observation" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Type</span>
          <select
            name="item_type"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="single_choice">Multiple choice</option>
            <option value="open_text">Open text</option>
          </select>
        </label>
      )}
      {section === "scoring" && (
        <>
          <input type="hidden" name="item_type" value="score" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Max score
            </span>
            <input
              name="max_score"
              type="number"
              min={1}
              defaultValue={10}
              className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </>
      )}
      {section === "notes" && (
        <input type="hidden" name="item_type" value="open_text" />
      )}

      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add
      </button>
    </form>
  );
}
