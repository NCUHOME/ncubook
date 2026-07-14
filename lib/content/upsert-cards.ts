import type { SupabaseClient } from "@supabase/supabase-js";
import type { InformationCard } from "@/lib/content/schema";

export async function upsertInformationCards(supabase: SupabaseClient, cards: InformationCard[]) {
  const rows = cards.map((card) => ({
    slug: card.slug,
    title: card.title,
    category: card.category,
    tags: card.tags,
    audience: card.audience,
    conclusion: card.conclusion,
    steps: card.steps,
    notes: card.notes,
    source_type: card.sourceType,
    source_url: card.sourceUrl,
    updated_at_label: card.updatedAt,
    trust_status: card.trustStatus,
    review_status: card.reviewStatus,
    risk_level: card.riskLevel,
    related_cards: card.relatedCards,
    updated_at: new Date().toISOString(),
  }));

  return supabase.from("information_cards").upsert(rows, { onConflict: "slug" });
}
