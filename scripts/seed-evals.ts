// 评测题库种子同步脚本 (scripts/seed-evals.ts)
//
// 作用：
//   将 evals/test.json 中的全量基准测试用例批量导入/Upsert 到 Supabase evaluation_cases 表中，
//   供管理后台「评测大盘 (AdminEvalsPanel)」与 CI 质量基线评测使用。
//
// 命令行使用方式：
//   npm run seed:evals
//   或 npx tsx scripts/seed-evals.ts
//
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../lib/database.types";
import type { TestConfig } from "../lib/ai/eval";

loadEnvConfig(process.cwd());

async function seedEvaluationCases() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[ERROR] 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量，无法执行种子导入。");
    process.exit(1);
  }

  const client = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const filePath = join(process.cwd(), "evals/test.json");
  console.log(`[INFO] 正在读取评测题库文件: ${filePath}...`);
  const raw = await readFile(filePath, "utf8");
  const config = JSON.parse(raw) as TestConfig;

  console.log(`[INFO] 发现 ${config.cases.length} 个评测基准用例，正在批量同步至 Supabase evaluation_cases 表...`);

  let successCount = 0;
  for (let i = 0; i < config.cases.length; i++) {
    const c = config.cases[i];
    if (!c) continue;

    const expectations: Json = {
      category: c.category ?? "通用",
      expectedAnswerable: c.expectedAnswerable,
      riskClass: c.riskClass,
      mustInclude: c.mustInclude ?? [],
      mustNotInclude: c.mustNotInclude ?? [],
      expectedPageSlug: c.expectedPageSlug ?? null,
    };

    const { error } = await client.from("evaluation_cases").upsert({
      id: c.id,
      question: c.question,
      expectations,
      enabled: true,
      sort_order: i * 10,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`[ERROR] 用例 ${c.id} 导入失败: ${error.message}`);
    } else {
      successCount += 1;
    }
  }

  console.log(`[OK] 评测题库种子同步完成！成功导入/更新: ${successCount}/${config.cases.length} 个用例。`);
}

seedEvaluationCases().catch((err) => {
  console.error("[ERROR] 种子脚本执行异常:", err);
  process.exit(1);
});
