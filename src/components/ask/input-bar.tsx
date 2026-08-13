// 组件：AI 问答共享输入条 (AskInputBar)，受控输入 + ArrowUp 圆形提交钮，供首页提问表单与问答弹层追问复用
"use client";

import type { FormEvent } from "react";
import { ArrowUp } from "lucide-react";

type AskInputBarProps = {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** form 元素的补充类名（用于承载各调用方不同的边框位置） */
  className?: string;
  /** 内层 flex 容器的补充类名 */
  innerClassName?: string;
  /** 输入框字号令牌差异（text-body / text-label） */
  inputClassName?: string;
  autoComplete?: "off";
  iconStrokeWidth?: number;
};

export function AskInputBar({
  id,
  label,
  placeholder,
  submitLabel,
  value,
  onChange,
  onSubmit,
  className,
  innerClassName,
  inputClassName = "text-body",
  autoComplete,
  iconStrokeWidth,
}: AskInputBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className={innerClassName ? `flex items-center ${innerClassName}` : "flex items-center"}>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`min-w-0 flex-1 bg-transparent font-body ${inputClassName} outline-none placeholder:text-muted`}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button type="submit" className="focus-ring tap-target grid place-items-center rounded-round bg-action text-surface" aria-label={submitLabel}>
          <ArrowUp className="size-icon" {...(iconStrokeWidth === undefined ? {} : { strokeWidth: iconStrokeWidth })} />
        </button>
      </div>
    </form>
  );
}
