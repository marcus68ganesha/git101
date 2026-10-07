"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TemplateItemType, TemplateSection } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getActiveTemplateId(
  supabase: SupabaseServerClient,
): Promise<string | undefined> {
  const { data } = await supabase
    .from("report_templates")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  return data?.id;
}

async function nextItemSortOrder(
  supabase: SupabaseServerClient,
  templateId: string,
  section: string,
) {
  const { data } = await supabase
    .from("report_template_items")
    .select("sort_order")
    .eq("template_id", templateId)
    .eq("section", section)
    .order("sort_order", { ascending: false })
    .limit(1);
  return (data?.[0]?.sort_order ?? 0) + 1;
}

async function nextOptionSortOrder(supabase: SupabaseServerClient, itemId: string) {
  const { data } = await supabase
    .from("report_template_options")
    .select("sort_order")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: false })
    .limit(1);
  return (data?.[0]?.sort_order ?? 0) + 1;
}

// --- Items -------------------------------------------------------------

export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const templateId = await getActiveTemplateId(supabase);
  if (!templateId) return;

  const section = String(formData.get("section") ?? "") as TemplateSection;
  const item_type = String(formData.get("item_type") ?? "") as TemplateItemType;
  const label = String(formData.get("label") ?? "").trim();
  if (!label || !section || !item_type) return;

  const helper_text = String(formData.get("helper_text") ?? "").trim() || null;
  const max_score =
    item_type === "score" ? Number(formData.get("max_score")) || 10 : null;

  const sort_order = await nextItemSortOrder(supabase, templateId, section);

  const { data: item, error } = await supabase
    .from("report_template_items")
    .insert({
      template_id: templateId,
      section,
      item_type,
      label,
      helper_text,
      max_score,
      sort_order,
    })
    .select("id")
    .single();

  revalidatePath("/reports/template");
  if (!error && item) {
    redirect(`/reports/template/items/${item.id}/edit`);
  }
}

export async function updateItem(itemId: string, formData: FormData) {
  const supabase = await createClient();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const helper_text = String(formData.get("helper_text") ?? "").trim() || null;
  const maxScoreRaw = formData.get("max_score");
  const update: Record<string, unknown> = { label, helper_text };
  if (maxScoreRaw !== null && String(maxScoreRaw).trim() !== "") {
    update.max_score = Number(maxScoreRaw) || 10;
  }

  await supabase.from("report_template_items").update(update).eq("id", itemId);

  revalidatePath("/reports/template");
  revalidatePath(`/reports/template/items/${itemId}/edit`);
}

export async function deleteItem(itemId: string) {
  const supabase = await createClient();
  await supabase.from("report_template_items").delete().eq("id", itemId);
  revalidatePath("/reports/template");
  redirect("/reports/template");
}

export async function moveItem(itemId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("report_template_items")
    .select("id, template_id, section, sort_order")
    .eq("id", itemId)
    .single();
  if (!item) return;

  let neighborQuery = supabase
    .from("report_template_items")
    .select("id, sort_order")
    .eq("template_id", item.template_id)
    .eq("section", item.section);

  neighborQuery =
    direction === "up"
      ? neighborQuery
          .lt("sort_order", item.sort_order)
          .order("sort_order", { ascending: false })
      : neighborQuery
          .gt("sort_order", item.sort_order)
          .order("sort_order", { ascending: true });

  const { data: neighbor } = await neighborQuery.limit(1).maybeSingle();
  if (!neighbor) return;

  await supabase
    .from("report_template_items")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", item.id);
  await supabase
    .from("report_template_items")
    .update({ sort_order: item.sort_order })
    .eq("id", neighbor.id);

  revalidatePath("/reports/template");
}

// --- Options -------------------------------------------------------------

export async function createOption(itemId: string, formData: FormData) {
  const supabase = await createClient();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const sort_order = await nextOptionSortOrder(supabase, itemId);
  await supabase
    .from("report_template_options")
    .insert({ item_id: itemId, label, sort_order });

  revalidatePath(`/reports/template/items/${itemId}/edit`);
}

export async function updateOption(
  optionId: string,
  itemId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  await supabase
    .from("report_template_options")
    .update({ label })
    .eq("id", optionId);

  revalidatePath(`/reports/template/items/${itemId}/edit`);
}

export async function deleteOption(optionId: string, itemId: string) {
  const supabase = await createClient();
  await supabase.from("report_template_options").delete().eq("id", optionId);
  revalidatePath(`/reports/template/items/${itemId}/edit`);
}

export async function moveOption(
  optionId: string,
  itemId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: option } = await supabase
    .from("report_template_options")
    .select("id, sort_order")
    .eq("id", optionId)
    .single();
  if (!option) return;

  let neighborQuery = supabase
    .from("report_template_options")
    .select("id, sort_order")
    .eq("item_id", itemId);

  neighborQuery =
    direction === "up"
      ? neighborQuery
          .lt("sort_order", option.sort_order)
          .order("sort_order", { ascending: false })
      : neighborQuery
          .gt("sort_order", option.sort_order)
          .order("sort_order", { ascending: true });

  const { data: neighbor } = await neighborQuery.limit(1).maybeSingle();
  if (!neighbor) return;

  await supabase
    .from("report_template_options")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", option.id);
  await supabase
    .from("report_template_options")
    .update({ sort_order: option.sort_order })
    .eq("id", neighbor.id);

  revalidatePath(`/reports/template/items/${itemId}/edit`);
}
