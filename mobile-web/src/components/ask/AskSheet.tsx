"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUp, X } from "lucide-react";
import { resolvePageRoute } from "@/lib/content/published-repository";
import type { AnswerSession } from "@/lib/answers/session";
import type { AskStatus, PageContext } from "@/src/components/ask/AskProvider";

type AskSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  pageContext?: PageContext;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (question: string) => void;
  status: AskStatus;
  session: AnswerSession | null;
  error: string;
  onCitationNavigate: () => void;
};

export function AskSheet({ open, onOpenChange, question, pageContext, draft, onDraftChange, onSubmit, status, session, error, onCitationNavigate }: AskSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-drawer bg-ink/45" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-modal mx-auto max-w-2xl rounded-t-large bg-surface px-s5 pb-s6 pt-s5 shadow-floating focus:outline-none" aria-describedby={undefined}>
          <div className="flex items-center justify-between border-b border-line pb-s4">
            <Dialog.Title className="text-title leading-heading font-semibold">询问此间</Dialog.Title>
            <Dialog.Close asChild><button type="button" className="focus-ring tap-target grid place-items-center rounded-round" aria-label="关闭回答"><X className="size-icon" /></button></Dialog.Close>
          </div>
          {pageContext ? <div className="border-b border-line py-s4"><p className="text-caption text-muted">正在询问当前文档</p><p className="mt-s1 text-label">{pageContext.pageId}{pageContext.anchor ? ` · ${pageContext.anchor}` : ""}</p></div> : null}
          <div className="max-h-[58vh] overflow-y-auto py-s5">
            <p className="text-caption text-muted">你的问题</p>
            <p className="mt-s2 font-display text-heading leading-heading font-semibold">{question || "输入你想了解的问题"}</p>
            {status === "loading" ? <p className="mt-s5 font-body text-label leading-body text-muted" role="status">正在核对已发布资料…</p> : null}
            {status === "error" ? <p className="mt-s5 font-body text-label leading-body text-danger" role="alert">{error}</p> : null}
            {status === "idle" ? <p className="mt-s5 font-body text-label leading-body text-muted">输入问题后，将依据已发布文档作答。</p> : null}
            {session?.confidence === "insufficient" ? <p className="mt-s5 font-body text-body leading-body">现有资料不足，暂时无法给出有依据的事实性回答。你可以改用关键词搜索相关文档。</p> : null}
            {session && session.claims.length > 0 ? (
              <ol className="mt-s5 space-y-s4">
                {session.claims.map((claim, index) => {
                  const citation = session.citations.find((item) => item.id === claim.citationIds[0]);
                  return (
                    <li key={claim.id} className="font-body text-body leading-body">
                      <span>{claim.text}</span>{" "}
                      {citation ? (
                        <a
                          href={`${resolvePageRoute(citation.pageId)}?answerSession=${session.id}#${citation.anchor}`}
                          onClick={onCitationNavigate}
                          className="focus-ring inline-flex size-icon items-center justify-center rounded-round bg-action-subtle align-text-top font-sans text-caption font-semibold"
                          aria-label={`查看结论 ${index + 1} 的依据`}
                        >{index + 1}</a>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {session && session.citations.length > 0 ? (
              <section className="mt-s6 border-t border-line pt-s5" aria-labelledby="answer-evidence-title">
                <h2 id="answer-evidence-title" className="text-label font-semibold">完整依据</h2>
                <ol className="mt-s3 divide-y divide-line border-y border-line">
                  {session.citations.map((citation, index) => (
                    <li key={citation.id}>
                      <a
                        href={`${resolvePageRoute(citation.pageId)}?answerSession=${session.id}#${citation.anchor}`}
                        onClick={onCitationNavigate}
                        className="focus-ring block py-s4"
                        aria-label={`打开依据 ${index + 1}：${citation.pageTitle}`}
                      >
                        <span className="block text-label font-semibold">{index + 1}. {citation.pageTitle}</span>
                        <span className="mt-s1 block font-body text-caption leading-body text-muted">{citation.excerpt}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); onSubmit(draft); }}>
            <label className="sr-only" htmlFor="ask-follow-up">继续追问</label>
            <div className="flex items-center border-y border-line py-s2 pl-s1">
              <input id="ask-follow-up" value={draft} onChange={(event) => onDraftChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-body text-label outline-none placeholder:text-muted" placeholder="继续追问" />
              <button type="submit" className="focus-ring tap-target grid place-items-center rounded-round bg-action text-surface" aria-label="提交追问"><ArrowUp className="size-icon" /></button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
