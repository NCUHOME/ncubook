import { expect, test } from "@playwright/test";

test("homepage question entry returns grounded claims", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "问题", exact: true }).fill("环游车怎么付费？");
  await page.getByRole("button", { name: "提交问题" }).click();

  await expect(page.getByText("单次费用为 0.9 元。")).toBeVisible();
  await expect(page.getByText("可以使用支付宝或扫描车载二维码付款。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "完整依据" })).toBeVisible();
});

test("section navigation reaches a free-form document", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "校园生活" }).click();
  await expect(page).toHaveURL(/\/sections\/campus-life$/);
  await expect(page.getByRole("heading", { name: "校园生活", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "校园交通" }).click();
  await expect(page.getByRole("heading", { name: "校园交通", level: 1 })).toBeVisible();
  await expect(page.getByText("校内交通包含环游车、单车与校区间接驳信息。")).toBeVisible();
});

test("page tree closes and restores trigger focus", async ({ page }) => {
  await page.goto("/docs/campus-shuttle");
  const trigger = page.getByRole("button", { name: "打开校园生活页面列表" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "校园生活页面列表" })).toBeVisible();
  await expect(page.getByRole("link", { name: "校园环游车乘坐指南" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("keyword search jumps to the exact paragraph without asking AI", async ({ page }) => {
  let askRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/ask") askRequests += 1;
  });

  await page.goto("/");
  await page.getByRole("link", { name: "搜索文档" }).click();
  await page.getByRole("textbox", { name: "关键词", exact: true }).fill("0.9");
  await page.getByRole("textbox", { name: "关键词", exact: true }).press("Enter");
  await page.getByRole("link", { name: "跳到“路线与收费”" }).click();

  await expect(page).toHaveURL(/\/docs\/campus-shuttle#b-fare$/);
  await expect(page.locator("#b-fare")).toBeInViewport();
  expect(askRequests).toBe(0);
});

test("citation return restores answer, draft, and scroll position", async ({ page }) => {
  await page.goto("/docs/campus-shuttle");
  await page.evaluate(() => window.scrollTo({ top: 180 }));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "询问当前文档" }).click();
  await page.getByLabel("继续追问").fill("环游车怎么付费？");
  await page.getByRole("button", { name: "提交追问" }).click();
  await expect(page.getByText("单次费用为 0.9 元。")).toBeVisible();
  await page.getByLabel("继续追问").fill("继续问班次");
  await page.getByRole("link", { name: "查看结论 1 的依据" }).click();
  await expect(page).toHaveURL(/answerSession=answer-shuttle-fare#b-fare$/);

  await page.goBack();
  await expect(page.getByText("单次费用为 0.9 元。")).toBeVisible();
  await expect(page.getByLabel("继续追问")).toHaveValue("继续问班次");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(scrollBefore - 2);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(scrollBefore + 2);
});

test("approved mobile states @visual", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });

  await page.goto("/sections/campus-life");
  await expect(page).toHaveScreenshot("section.png", { fullPage: true });

  await page.goto("/docs/campus-shuttle");
  await expect(page).toHaveScreenshot("document.png", { fullPage: true });
  await page.getByRole("button", { name: "打开校园生活页面列表" }).click();
  await expect(page.getByRole("dialog", { name: "校园生活页面列表" })).toBeVisible();
  await expect(page).toHaveScreenshot("page-tree.png", { fullPage: true });

  await page.goto("/search?q=0.9");
  await expect(page).toHaveScreenshot("search.png", { fullPage: true });

  await page.goto("/docs/campus-shuttle");
  await page.getByRole("button", { name: "询问当前文档" }).click();
  await page.getByRole("textbox", { name: "继续追问", exact: true }).fill("环游车怎么付费？");
  await page.getByRole("button", { name: "提交追问" }).click();
  await expect(page.getByRole("heading", { name: "完整依据" })).toBeVisible();
  await expect(page).toHaveScreenshot("answer.png", { fullPage: true });
});
