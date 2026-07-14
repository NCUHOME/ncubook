import Link from "next/link";
import type { SearchResult } from "@/lib/search/search-blocks";

export function SearchResultItem({ result, query }: { result: SearchResult; query: string }) {
  const section = result.sectionPath.at(-1) ?? result.pageTitle;
  return (
    <article className="border-b border-line py-s5">
      <p className="text-caption leading-ui text-muted">{result.sectionPath.join(" / ")}</p>
      <h2 className="mt-s2 text-body-large leading-heading font-semibold">{result.pageTitle}</h2>
      <p className="mt-s2 font-body text-label leading-body text-muted"><HighlightedText text={result.excerpt} query={query} /></p>
      <Link href={result.href} className="focus-ring mt-s3 inline-flex min-h-tap items-center text-caption underline underline-offset-4">跳到“{section}”</Link>
    </article>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, "gi"));
  return parts.map((part, index) => part.toLocaleLowerCase("zh-CN") === needle.toLocaleLowerCase("zh-CN")
    ? <mark className="bg-action-subtle font-semibold text-ink" key={index}>{part}</mark>
    : <span key={index}>{part}</span>);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
