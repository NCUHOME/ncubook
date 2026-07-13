import { InformationCard } from "@/lib/content/schema";
import { filterPublishedCards } from "@/lib/content/lark-mapper";

export type CardSearchResult = {
  card: InformationCard;
  score: number;
  reasons: string[];
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[，。！？、,.!?;；:：'"“”‘’()[\]{}<>《》\s]+/g, "");
}

function tokenize(text: string) {
  return text
    .split(/[，。！？、,.!?;；:：'"“”‘’()[\]{}<>《》\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function searchCards(query: string, cards: InformationCard[], limit = 8): CardSearchResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const tokens = tokenize(query);

  return filterPublishedCards(cards)
    .map((card) => {
      const title = normalize(card.title);
      const category = normalize(card.category);
      const tags = card.tags.map(normalize);
      const body = normalize([card.audience, card.conclusion, ...card.steps, ...card.notes].join(""));
      const reasons: string[] = [];
      let score = 0;

      if (title.includes(normalizedQuery) || normalizedQuery.includes(title)) {
        score += 80;
        reasons.push("标题匹配");
      }

      for (const tag of tags) {
        if (tag && (normalizedQuery.includes(tag) || tag.includes(normalizedQuery))) {
          score += 36;
          reasons.push(`标签：${tag}`);
        }
      }

      if (category && normalizedQuery.includes(category)) {
        score += 12;
        reasons.push("分类匹配");
      }

      for (const token of tokens) {
        if (token.length > 1 && title.includes(normalize(token))) score += 8;
        if (token.length > 1 && body.includes(normalize(token))) score += 3;
        if (tags.some((tag) => tag.includes(normalize(token)))) score += 10;
      }

      return { card, score, reasons: Array.from(new Set(reasons)) };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
