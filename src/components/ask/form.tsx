// 组件：首页共享提问输入表单，拦截默认提交事件，调用 useAsk().openAsk() 调起问答
"use client";

import { useState } from "react";
import { AskInputBar } from "@/src/components/ask/input-bar";
import { useAsk } from "@/src/components/ask/provider";

export function QuestionForm() {
  const [question, setQuestion] = useState("");
  const { openAsk } = useAsk();

  function submit() {
    const value = question.trim();
    if (value) openAsk({ question: value });
  }

  return (
    <AskInputBar
      id="home-question"
      label="问题"
      placeholder="输入你想了解的问题"
      submitLabel="提交问题"
      value={question}
      onChange={setQuestion}
      onSubmit={submit}
      className="border-y border-ink py-s2 pl-s1"
      inputClassName="text-body"
      autoComplete="off"
      iconStrokeWidth={1.9}
    />
  );
}
