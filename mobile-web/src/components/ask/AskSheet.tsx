"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUp, X } from "lucide-react";
import type { PageContext } from "@/src/components/ask/AskProvider";

type AskSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  pageContext?: PageContext;
  draft: string;
  onDraftChange: (value: string) => void;
};

export function AskSheet({ open, onOpenChange, question, pageContext, draft, onDraftChange }: AskSheetProps) {
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
          <div className="py-s5">
            <p className="text-caption text-muted">你的问题</p>
            <p className="mt-s2 font-display text-heading leading-heading font-semibold">{question || "输入你想了解的问题"}</p>
            <p className="mt-s5 font-body text-label leading-body text-muted">回答能力正在连接中。这里不会用聊天人格或无依据内容填充空白。</p>
          </div>
          <label className="sr-only" htmlFor="ask-follow-up">继续追问</label>
          <div className="flex items-center border-y border-line py-s2 pl-s1">
            <input id="ask-follow-up" value={draft} onChange={(event) => onDraftChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-body text-label outline-none placeholder:text-muted" placeholder="继续追问" />
            <button type="button" className="focus-ring tap-target grid place-items-center rounded-round bg-action text-surface" aria-label="提交追问"><ArrowUp className="size-icon" /></button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
