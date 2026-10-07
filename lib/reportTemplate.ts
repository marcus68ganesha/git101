import type { SupabaseClient } from "@supabase/supabase-js";
import type { TemplateWithItems } from "@/lib/types";

function sortTemplate(data: TemplateWithItems): TemplateWithItems {
  const items = [...data.report_template_items].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  for (const item of items) {
    item.report_template_options = [...item.report_template_options].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }
  return { ...data, report_template_items: items };
}

/**
 * Loads the single active report template with its items and each item's
 * options, sorted into display order. Returns null if no template is
 * marked active (shouldn't happen once the seed migration has run, but
 * callers should handle it rather than crash).
 */
export async function getActiveTemplate(
  supabase: SupabaseClient,
): Promise<TemplateWithItems | null> {
  const { data, error } = await supabase
    .from("report_templates")
    .select("*, report_template_items(*, report_template_options(*))")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return sortTemplate(data);
}

/**
 * Loads a specific template by id (not necessarily the active one) — used
 * when editing an existing report, so it keeps using whichever template it
 * was originally filled in against even if a newer template has since
 * become active.
 */
export async function getTemplateById(
  supabase: SupabaseClient,
  templateId: string,
): Promise<TemplateWithItems | null> {
  const { data, error } = await supabase
    .from("report_templates")
    .select("*, report_template_items(*, report_template_options(*))")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) return null;
  return sortTemplate(data);
}
