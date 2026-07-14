"use client";

import { useEffect, useState } from "react";
import { FloatingAskButton } from "@/src/components/ask/FloatingAskButton";

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
