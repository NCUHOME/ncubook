"use client";

import { FormEvent, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useAsk } from "@/src/components/ask/AskProvider";

export function QuestionForm() {
  const [question, setQuestion] = useState("");
  const { openAsk } = useAsk();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (value) openAsk({ question: value });
  }

  return (
    <form onSubmit={submit} className="border-y border-ink py-s2 pl-s1">
      <label htmlFor="home-question" className="sr-only">问题</label>
      <div className="flex items-center">
        <input id="home-question" value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 bg-transparent font-body text-body outline-none placeholder:text-muted" placeholder="输入你想了解的问题" autoComplete="off" />
        <button type="submit" className="focus-ring tap-target grid place-items-center rounded-round bg-action text-surface" aria-label="提交问题"><ArrowUp className="size-icon" strokeWidth={1.9} /></button>
      </div>
    </form>
  );
}
