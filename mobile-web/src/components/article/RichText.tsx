import Link from "next/link";
import type { RichText as RichTextValue, RichTextColor } from "@/lib/content/published-schema";

type RichTextProps = {
  value: RichTextValue;
  resolvePageRoute: (pageId: string) => string;
};

const colorClass: Record<RichTextColor, string> = {
  default: "text-ink",
  gray: "text-muted",
  red: "text-danger",
  orange: "text-warning",
  yellow: "text-warning",
  green: "text-ink",
  blue: "text-info",
  purple: "text-ink",
  pink: "text-ink",
};

export function RichText({ value, resolvePageRoute }: RichTextProps) {
  return value.map((item, index) => {
    const classes = [
      colorClass[item.annotations.color ?? "default"],
      item.annotations.bold ? "font-bold" : "",
      item.annotations.italic ? "italic" : "",
      item.annotations.underline ? "underline underline-offset-4" : "",
      item.annotations.strikethrough ? "line-through" : "",
      item.annotations.code ? "font-mono" : "",
    ].filter(Boolean).join(" ");
    const content = <span className={classes}>{item.plainText}</span>;

    if (item.pageId) return <Link className="focus-ring underline underline-offset-4" href={resolvePageRoute(item.pageId)} key={index}>{content}</Link>;
    if (item.href) return <a className="focus-ring underline underline-offset-4" href={item.href} key={index}>{content}</a>;
    return <span key={index}>{content}</span>;
  });
}
