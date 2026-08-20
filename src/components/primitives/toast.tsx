// 组件：轻量 Toast 提示药丸（用于电话呼叫、文本复制与操作反馈轻提示）
"use client";

import { useEffect, useState } from "react";

let showToastGlobal: ((msg: string) => void) | null = null;

export function showToast(message: string) {
  if (showToastGlobal) {
    showToastGlobal(message);
  }
}

export function ToastPill() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    showToastGlobal = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setVisible(false);
      }, 2200);
    };

    return () => {
      showToastGlobal = null;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast-pill ${visible ? "show" : ""}`}
    >
      {message}
    </div>
  );
}
