import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createOption,
  deleteOption,
  moveOption,
  updateItem,
  updateOption,
} from "../../../actions";

export default async function EditTemplateItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("report_template_items")
    .select("*, report_template_options(*)")
    .eq("id", itemId)
    .single();

  if (!item) {
    notFound();
  }

  const options = [...item.report_template_options].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div>
      <Link
        href="/reports/template"
        className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Back to template
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit question
      </h1>

      <form
        action={updateItem.bind(null, itemId)}
        className="mt-6 flex max-w-lg flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Label
          </span>
          <input
            name="label"
            defaultValue={item.label}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Helper text{" "}
            <span className="text-zinc-400">(optional, shown under the label)</span>
          </span>
          <textarea
            name="helper_text"
            rows={2}
            defaultValue={item.helper_text ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {item.item_type === "score" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Max score
            </span>
            <input
              name="max_score"
              type="number"
              min={1}
              defaultValue={item.max_score ?? 10}
              className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        )}

        <button
          type="submit"
          className="mt-2 w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save
        </button>
      </form>

      {item.item_type === "single_choice" && (
        <div className="mt-10 max-w-lg">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Options
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            The choices a teacher picks from for this question.
          </p>

          <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {options.map((option, index) => (
              <li
                key={option.id}
                className="flex items-center gap-2 px-3 py-2"
              >
                <form
                  action={updateOption.bind(null, option.id, itemId)}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    name="label"
                    defaultValue={option.label}
                    className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button
                    type="submit"
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400"
                  >
                    Save
                  </button>
                </form>
                <form action={moveOption.bind(null, option.id, itemId, "up")}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="text-zinc-400 hover:text-zinc-800 disabled:opacity-30 dark:hover:text-zinc-100"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                </form>
                <form
                  action={moveOption.bind(null, option.id, itemId, "down")}
                >
                  <button
                    type="submit"
                    disabled={index === options.length - 1}
                    className="text-zinc-400 hover:text-zinc-800 disabled:opacity-30 dark:hover:text-zinc-100"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </form>
                <form action={deleteOption.bind(null, option.id, itemId)}>
                  <button
                    type="submit"
                    className="text-sm text-red-600 underline hover:text-red-800 dark:text-red-400"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                No options yet — add at least one below.
              </li>
            )}
          </ul>

          <form
            action={createOption.bind(null, itemId)}
            className="mt-3 flex items-center gap-2"
          >
            <input
              name="label"
              placeholder="New option"
              required
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              Add option
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
