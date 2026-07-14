import { expect, test } from "@playwright/test";

test("Gate D nested quote attachment review @gate-d-review", async ({ page }) => {
  await page.goto("/design-system/gate-d-quote");

  const quote = page.getByRole("blockquote");
  await expect(quote).toBeVisible();
  await expect(quote.getByRole("link")).toHaveCount(2);
  await expect(page).toHaveScreenshot("gate-d-quote.png", { fullPage: true });
});
