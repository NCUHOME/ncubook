// Context & Provider：全站全屏即搜即显抽屉状态机与 useSearch 钩子
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

const SearchOverlay = dynamic(
  () => import("@/src/components/search/search-overlay").then((mod) => mod.SearchOverlay),
  { ssr: false },
);

type SearchContextValue = {
  isOpen: boolean;
  openSearch: (initialQuery?: string) => void;
  closeSearch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const context = useContext(SearchContext);
  return (
    context || {
      isOpen: false,
      openSearch: () => {},
      closeSearch: () => {},
    }
  );
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const openSearch = useCallback((initialQuery?: string) => {
    if (typeof initialQuery === "string") setQuery(initialQuery);
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SearchContext.Provider value={{ isOpen, openSearch, closeSearch }}>
      {children}
      {isOpen && <SearchOverlay initialQuery={query} onClose={closeSearch} />}
    </SearchContext.Provider>
  );
}
