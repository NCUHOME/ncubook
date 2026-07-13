"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { validateAnswerSession, type AnswerSession } from "@/lib/answers/session";
import { AskSheet } from "@/src/components/ask/AskSheet";

export type PageContext = { pageId: string; anchor?: string };
export type AskInput = { question?: string; pageContext?: PageContext };
export type AnswerRequest = (input: { question: string; pageContext?: PageContext }) => Promise<AnswerSession>;
export type AskStatus = "idle" | "loading" | "ready" | "error";

type AskContextValue = {
  openAsk: (input: AskInput) => void;
  draft: string;
  setDraft: (value: string) => void;
};

const AskContext = createContext<AskContextValue | null>(null);

async function requestAnswerFromApi(input: { question: string; pageContext?: PageContext }): Promise<AnswerSession> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("回答暂时无法获取");
  return response.json() as Promise<AnswerSession>;
}

export function AskProvider({ children, requestAnswer = requestAnswerFromApi }: { children: ReactNode; requestAnswer?: AnswerRequest }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pageContext, setPageContext] = useState<PageContext | undefined>();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<AskStatus>("idle");
  const [session, setSession] = useState<AnswerSession | null>(null);
  const [error, setError] = useState("");

  const submit = useCallback(async (input: { question: string; pageContext?: PageContext }) => {
    const value = input.question.trim();
    if (!value) return;
    setQuestion(value);
    setPageContext(input.pageContext);
    setOpen(true);
    setStatus("loading");
    setSession(null);
    setError("");
    try {
      const nextSession = validateAnswerSession(await requestAnswer({ question: value, pageContext: input.pageContext }));
      setSession(nextSession);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "回答暂时无法获取");
      setStatus("error");
    }
  }, [requestAnswer]);

  useEffect(() => {
    function restoreState(state: unknown) {
      const answerSession = (state as { answerSession?: string } | null)?.answerSession;
      if (!answerSession) return;
      const serialized = sessionStorage.getItem(`answer-session:${answerSession}`);
      if (!serialized) return;
      try {
        const saved = JSON.parse(serialized) as { session: AnswerSession; scrollY: number; draft: string };
        const restored = validateAnswerSession(saved.session);
        setQuestion(restored.question);
        setPageContext(restored.pageContext);
        setDraft(saved.draft);
        setSession(restored);
        setStatus("ready");
        setOpen(true);
        window.setTimeout(() => window.scrollTo({ top: saved.scrollY }), 0);
      } catch {
        sessionStorage.removeItem(`answer-session:${answerSession}`);
      }
    }

    function restore(event: PopStateEvent) {
      restoreState(event.state);
    }

    function restoreCurrentEntry() {
      restoreState(window.history.state);
    }

    restoreCurrentEntry();
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restoreCurrentEntry);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restoreCurrentEntry);
    };
  }, []);

  const persistSession = useCallback(() => {
    if (!session) return;
    sessionStorage.setItem(`answer-session:${session.id}`, JSON.stringify({ session, scrollY: window.scrollY, draft }));
    window.history.replaceState({ ...window.history.state, answerSession: session.id }, "");
  }, [draft, session]);

  const value = useMemo<AskContextValue>(() => ({
    draft,
    setDraft,
    openAsk(input) {
      setPageContext(input.pageContext);
      setOpen(true);
      const nextQuestion = input.question?.trim() ?? "";
      setQuestion(nextQuestion);
      setSession(null);
      setStatus("idle");
      setError("");
      if (nextQuestion) void submit({ question: nextQuestion, pageContext: input.pageContext });
    },
  }), [draft, submit]);

  return (
    <AskContext.Provider value={value}>
      {children}
      <AskSheet
        open={open}
        onOpenChange={setOpen}
        question={question}
        pageContext={pageContext}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={(nextQuestion) => submit({ question: nextQuestion, pageContext })}
        status={status}
        session={session}
        error={error}
        onCitationNavigate={persistSession}
      />
    </AskContext.Provider>
  );
}

export function useAsk() {
  const context = useContext(AskContext);
  if (!context) throw new Error("useAsk must be used inside AskProvider");
  return context;
}
