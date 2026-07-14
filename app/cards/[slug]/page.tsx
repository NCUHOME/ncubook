import { redirect } from "next/navigation";

export default async function LegacyCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "campus-transport") redirect("/docs/campus-shuttle");
  redirect("/sections/campus-life");
}
