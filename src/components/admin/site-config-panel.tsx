// 组件：管理后台网站全局配置面板（公告栏、联系方式、Hero 引言）
"use client";

import { useEffect, useState } from "react";
import { Settings, Save, CheckCircle2, AlertCircle } from "lucide-react";

export function SiteConfigPanel() {
  const [noticeTitle, setNoticeTitle] = useState("公告");
  const [noticeDate, setNoticeDate] = useState("2026 年 8 月");
  const [noticeDesc, setNoticeDesc] = useState("目前手册还在持续更新中……");
  const [noticeLinks, setNoticeLinks] = useState("新生必看:xinsheng, 关于我们:why");

  const [contactEmail, setContactEmail] = useState("book@nchuhome.club");
  const [contactQQ, setContactQQ] = useState("930991836");
  const [contactDesc, setContactDesc] = useState("如有发现错漏，或想把自己的经验写进来，欢迎加入我们～");

  const [heroTitle, setHeroTitle] = useState("校园里的事<br>在此问明白");
  const [heroQuote, setHeroQuote] = useState("是什么曾经拯救过你，就用它来更好地拯救这个世界");

  const [articleGroupsJson, setArticleGroupsJson] = useState(
    JSON.stringify(
      {
        学习: {
          "新生必看": "入学必看",
          "不喜欢本专业 / 想学其他专业": "入学必看",
          "英语": "考试",
          "学分、绩点、二课分、综测": "基本认识",
          "辅修 & 第二学士学位": "基本认识",
          "校园跑 & 体测": "基本认识",
          "早点到 & 晚自习": "基本认识",
          "保研": "评优评先",
          "班干部": "评优评先",
          "评奖评优": "评优评先",
          "大创项目 & 科研训练项目": "评优评先",
        },
        生活: {
          "必备物品": "常识",
          "网络与流量卡": "常识",
          "NCU 校园卡简介": "常识",
          "失物招领 & 寻物启事": "常识",
          "校医院就医": "常识",
          "学生证": "常识",
          "报修指南": "常识",
          "寝室生活": "常识",
          "校内出行": "重要信息",
          "校外交通": "重要信息",
          "社团介绍": "重要信息",
          "运动": "休闲",
          "吃饭": "休闲",
          "校外游玩": "休闲",
        },
      },
      null,
      2,
    ),
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          for (const item of res.data) {
            if (item.key === "home_notice" && item.value) {
              setNoticeTitle(item.value.title || "");
              setNoticeDate(item.value.date || "");
              setNoticeDesc(item.value.desc || "");
              if (Array.isArray(item.value.links)) {
                setNoticeLinks(
                  item.value.links
                    .map((l: { text: string; slug: string }) => `${l.text}:${l.slug}`)
                    .join(", "),
                );
              }
            }
            if (item.key === "home_contribute" && item.value) {
              setContactEmail(item.value.email || "");
              setContactQQ(item.value.qq_group || "");
              setContactDesc(item.value.desc || "");
            }
            if (item.key === "home_hero" && item.value) {
              setHeroTitle(item.value.title || "");
              setHeroQuote(item.value.quote || "");
            }
            if (item.key === "article_groups" && item.value) {
              setArticleGroupsJson(JSON.stringify(item.value, null, 2));
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const parsedLinks = noticeLinks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [text, slug] = s.split(":");
          return { text: text?.trim() || "", slug: slug?.trim() || "" };
        });

      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "home_notice",
          value: { title: noticeTitle, date: noticeDate, desc: noticeDesc, links: parsedLinks },
        }),
      });

      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "home_contribute",
          value: { email: contactEmail, qq_group: contactQQ, desc: contactDesc },
        }),
      });

      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "home_hero",
          value: { title: heroTitle, quote: heroQuote },
        }),
      });

      try {
        const parsedGroups = JSON.parse(articleGroupsJson);
        await fetch("/api/admin/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "article_groups",
            value: parsedGroups,
          }),
        });
      } catch {
        // 允许非严格 JSON
      }

      setMessage({ type: "success", text: "网站配置已成功保存并实时生效！" });
    } catch {
      setMessage({ type: "error", text: "保存失败，请检查网络或登录状态" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-medium border border-line bg-surface p-s5 space-y-s5">
      <div className="flex items-center justify-between border-b border-line pb-s3">
        <div className="flex items-center gap-s2">
          <Settings className="size-icon text-brand" />
          <h2 className="text-title font-semibold">网站公告与全局配置</h2>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-ink px-s4 py-s2 text-label font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="size-icon-small" />
          <span>{saving ? "保存中..." : "保存配置"}</span>
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-s2 rounded-small p-s3 text-label ${
            message.type === "success" ? "bg-brand-tint text-brand" : "bg-danger-bg text-danger"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="size-icon-small" /> : <AlertCircle className="size-icon-small" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. 首页 Hero 标语与引言 */}
      <div className="space-y-s3 border-b border-line pb-s4">
        <h3 className="text-label font-semibold text-ink">1. 首页 Hero 标语与引言</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
          <div>
            <label className="text-caption text-muted">Hero 主标语（支持 HTML 换行）</label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
          <div>
            <label className="text-caption text-muted">人文引言句子</label>
            <input
              type="text"
              value={heroQuote}
              onChange={(e) => setHeroQuote(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
        </div>
      </div>

      {/* 2. 手册公告栏配置 */}
      <div className="space-y-s3 border-b border-line pb-s4">
        <h3 className="text-label font-semibold text-ink">2. 手册公告栏 (Notice)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
          <div>
            <label className="text-caption text-muted">公告标题</label>
            <input
              type="text"
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
          <div>
            <label className="text-caption text-muted">公告日期/版本标识</label>
            <input
              type="text"
              value={noticeDate}
              onChange={(e) => setNoticeDate(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-caption text-muted">公告描述正文</label>
            <input
              type="text"
              value={noticeDesc}
              onChange={(e) => setNoticeDesc(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-caption text-muted">快捷链接（格式：文本:文章slug，多个以逗号隔开）</label>
            <input
              type="text"
              value={noticeLinks}
              onChange={(e) => setNoticeLinks(e.target.value)}
              placeholder="新生必看:xinsheng, 关于我们:why"
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
        </div>
      </div>

      {/* 3. 完善手册联系方式 */}
      <div className="space-y-s3 border-b border-line pb-s4">
        <h3 className="text-label font-semibold text-ink">3. 完善手册联系信息 (Contribute)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
          <div>
            <label className="text-caption text-muted">投稿/反馈邮箱</label>
            <input
              type="text"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
          <div>
            <label className="text-caption text-muted">交流 QQ 群号</label>
            <input
              type="text"
              value={contactQQ}
              onChange={(e) => setContactQQ(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-caption text-muted">联系副标题说明文案</label>
            <input
              type="text"
              value={contactDesc}
              onChange={(e) => setContactDesc(e.target.value)}
              className="mt-s1 w-full rounded-small border border-line px-s3 py-s2 text-body focus-ring"
            />
          </div>
        </div>
      </div>

      {/* 4. 目录分组与蓝色前称配置 */}
      <div className="space-y-s3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-label font-semibold text-ink">4. 目录二级分类与蓝色前称配置 (Article Groups)</h3>
          <span className="text-caption text-muted">在抽屉目录中为文章归集蓝色小标题</span>
        </div>
        <div>
          <label className="text-caption text-muted block pb-s1">
            JSON 分组映射（格式：{"{ 板块名: { \"文章名关键词\": \"分组前称\" } }"}）
          </label>
          <textarea
            value={articleGroupsJson}
            onChange={(e) => setArticleGroupsJson(e.target.value)}
            rows={10}
            className="w-full font-mono text-caption rounded-small border border-line p-s3 focus-ring bg-surface-subtle"
          />
        </div>
      </div>
    </div>
  );
}
