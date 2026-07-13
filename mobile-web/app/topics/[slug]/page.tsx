import { redirect } from "next/navigation";

export default async function LegacyTopicPage() {
  redirect("/sections/campus-life");
}
