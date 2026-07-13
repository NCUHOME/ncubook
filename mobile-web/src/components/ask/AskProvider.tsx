"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { AskSheet } from "@/src/components/ask/AskSheet";

export type PageContext = { pageId: string; anchor?: string };
export type AskInput = { question?: string; pageContext?: PageContext };

type AskContextValue = {
  openAsk: (input: AskInput) => void;
  draft: string;
  setDraft: (value: string) => void;
};

const AskContext = createContext<AskContextValue | null>(null);

export function AskProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pageContext, setPageContext] = useState<PageContext | undefined>();
  const [draft, setDraft] = useState("");

  const value = useMemo<AskContextValue>(() => ({
    draft,
    setDraft,
    openAsk(input) {
      setQuestion(input.question?.trim() ?? "");
      setPageContext(input.pageContext);
      setOpen(true);
    },
  }), [draft]);

  return (
    <AskContext.Provider value={value}>
      {children}
      <AskSheet open={open} onOpenChange={setOpen} question={question} pageContext={pageContext} draft={draft} onDraftChange={setDraft} />
    </AskContext.Provider>
  );
}

export function useAsk() {
  const context = useContext(AskContext);
  if (!context) throw new Error("useAsk must be used inside AskProvider");
  return context;
}
