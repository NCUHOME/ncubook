import { mapLarkRecordToCard, type LarkRecord } from "@/lib/content/lark-mapper";
import type { InformationCard } from "@/lib/content/schema";

type LarkTokenResponse = {
  code: number;
  msg?: string;
  tenant_access_token?: string;
};

type LarkRecordsResponse = {
  code: number;
  msg?: string;
  data?: {
    items?: LarkRecord[];
    has_more?: boolean;
    page_token?: string;
  };
};

async function getTenantAccessToken() {
  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing LARK_APP_ID or LARK_APP_SECRET");
  }

  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });
  const payload = (await response.json()) as LarkTokenResponse;

  if (!response.ok || payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(payload.msg || "Failed to fetch Feishu tenant access token");
  }

  return payload.tenant_access_token;
}

export async function fetchLarkInformationCards(): Promise<InformationCard[]> {
  const appToken = process.env.LARK_BASE_APP_TOKEN;
  const tableId = process.env.LARK_BASE_TABLE_ID;
  if (!appToken || !tableId) {
    throw new Error("Missing LARK_BASE_APP_TOKEN or LARK_BASE_TABLE_ID");
  }

  const token = await getTenantAccessToken();
  const records: LarkRecord[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
    );
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const payload = (await response.json()) as LarkRecordsResponse;

    if (!response.ok || payload.code !== 0) {
      throw new Error(payload.msg || "Failed to fetch Feishu Base records");
    }

    records.push(...(payload.data?.items || []));
    pageToken = payload.data?.page_token || "";
  } while (pageToken);

  return records.map(mapLarkRecordToCard);
}
