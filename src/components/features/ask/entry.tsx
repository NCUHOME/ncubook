// 组件：基于 IntersectionObserver 监听文档滚动视口中首个可见标题，自动为 FloatingAskButton 捕获最精准的段落锚点
"use client";

import { useEffect, useState } from "react";
import { FloatingAskButton } from "@/src/components/features/ask/button";

export function DocumentAskEntry({ pageId, initialAnchor }: { pageId: string; initialAnchor?: string }) {
  const [anchor, setAnchor] = useState(initialAnchor);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const headings = Array.from(document.querySelectorAll<HTMLElement>("article h1[id], article h2[id], article h3[id]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target.id) setAnchor(visible.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, []);

  return <FloatingAskButton pageContext={{ pageId, anchor }} />;
}
