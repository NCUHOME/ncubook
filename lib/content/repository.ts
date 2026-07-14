import { sampleCards } from "@/lib/content/sample-cards";
import type { InformationCard } from "@/lib/content/schema";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/db/supabase";

type CardRow = {
  slug: string;
  title: string;
  category: string;
  tags: string[] | null;
  audience: string | null;
  conclusion: string;
  steps: string[] | null;
  notes: string[] | null;
  source_type: string | null;
  source_url: string | null;
  updated_at_label: string | null;
  trust_status: InformationCard["trustStatus"];
  review_status: InformationCard["reviewStatus"];
  risk_level: InformationCard["riskLevel"];
  related_cards: string[] | null;
};

function rowToCard(row: CardRow): InformationCard {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    tags: row.tags || [],
    audience: row.audience || "所有同学",
    conclusion: row.conclusion,
    steps: row.steps || [],
    notes: row.notes || [],
    sourceType: row.source_type || "待核实",
    sourceUrl: row.source_url || "",
    updatedAt: row.updated_at_label || "待更新",
    trustStatus: row.trust_status,
    reviewStatus: row.review_status,
    riskLevel: row.risk_level,
    relatedCards: row.related_cards || [],
  };
}

export async function getPublishedCards(): Promise<InformationCard[]> {
  if (!hasSupabaseConfig()) {
    return sampleCards.filter((card) => card.reviewStatus === "published");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return sampleCards;

  const { data, error } = await supabase
    .from("information_cards")
    .select("*")
    .eq("review_status", "published")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Failed to load Supabase cards, falling back to sample cards:", error);
    return sampleCards.filter((card) => card.reviewStatus === "published");
  }

  return (data as CardRow[]).map(rowToCard);
}

export async function getCardBySlug(slug: string) {
  const cards = await getPublishedCards();
  return cards.find((card) => card.slug === slug) || null;
}

export async function getRecentCards(limit = 4) {
  const cards = await getPublishedCards();
  return cards.slice(0, limit);
}

export async function getCardsByTags(tags: string[]) {
  const cards = await getPublishedCards();
  return cards.filter((card) =>
    card.tags.some((tag) => tags.includes(tag)) || tags.includes(card.category),
  );
}
