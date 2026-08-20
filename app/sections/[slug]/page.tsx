import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/server";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const repository = await loadPublishedRepository();
    const view = await repository.getSectionView(slug);
    if (!view) return { title: "板块未找到 - 此间" };

    const title = `${view.page.title} - 校园指南 · 此间`;
    const description = `南昌大学 AI 知识导引 · ${view.page.title}板块`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "此间",
      },
    };
  } catch {
    return { title: "板块未找到 - 此间" };
  }
}

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const repository = await loadPublishedRepository();
    const children = await repository.getSectionChildren(slug);
    const tree = await repository.getSectionTree(slug);
    const routes = await repository.getPageRoutes();

    const firstNode = tree[0];
    if (firstNode?.href) {
      redirect(firstNode.href);
    }
    const firstChild = children[0];
    if (firstChild) {
      const targetRoute = routes[firstChild.id] || repository.resolvePageRoute(firstChild.id);
      redirect(targetRoute);
    }
    redirect(`/docs/${slug}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    notFound();
  }
}

export async function generateStaticParams() {
  try {
    const repository = await loadPublishedRepository();
    const sections = await repository.getPublishedSections();
    return sections.map((section) => ({ slug: section.slug }));
  } catch {
    return [];
  }
}
