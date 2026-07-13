import { IdCard, LucideIcon, Phone, Router, Utensils, Wrench } from "lucide-react";

export type Topic = {
  slug: string;
  title: string;
  label: string;
  tags: string[];
  icon: LucideIcon;
};

export const topics: Topic[] = [
  {
    slug: "onboarding",
    title: "新生",
    label: "报到 / 校园卡 / 交通",
    tags: ["新生", "校园卡", "交通"],
    icon: IdCard,
  },
  {
    slug: "campus-card",
    title: "校园卡",
    label: "挂失 / 补办 / 一卡通",
    tags: ["校园卡", "补办", "一卡通"],
    icon: IdCard,
  },
  {
    slug: "network",
    title: "校园网",
    label: "连接 / 认证 / 报修",
    tags: ["校园网", "网络", "认证"],
    icon: Router,
  },
  {
    slug: "repair",
    title: "宿舍报修",
    label: "后勤 / 水电 / 维修",
    tags: ["宿舍", "报修", "后勤"],
    icon: Wrench,
  },
  {
    slug: "dining",
    title: "食堂",
    label: "吃饭 / 窗口 / 错峰",
    tags: ["食堂", "吃饭"],
    icon: Utensils,
  },
  {
    slug: "services",
    title: "服务入口",
    label: "电话 / 部门 / 咨询",
    tags: ["电话", "服务入口", "咨询"],
    icon: Phone,
  },
];

export function getTopic(slug: string) {
  return topics.find((topic) => topic.slug === slug);
}
