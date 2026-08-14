// 站点 canonical URL 单一来源：仅服务端 metadata / sitemap / robots / OG 使用
// 生产环境必须通过 SITE_URL 环境变量配置真实域名（见 .env.example 与运维手册）

export function getSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  return (raw && raw.length > 0 ? raw : "http://localhost:3000").replace(/\/+$/, "");
}

export function getSiteHost(): string {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return "localhost:3000";
  }
}
