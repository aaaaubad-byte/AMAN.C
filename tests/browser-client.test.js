import test from "node:test";
import assert from "node:assert/strict";
import { launch, open, skip } from "./browser-helpers.mjs";

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { if (browser) await browser.close(); });

test("العميل بلا جلسة يبدأ بالدخول ولا يكشف شاشة داخلية", { skip }, async () => {
  const t = await open(browser, "/client/", { viewport: { width: 360, height: 740 } });
  try {
    await t.page.waitForSelector("#login-screen:not([hidden])");
    assert.equal(await t.page.locator("#home-screen").isVisible(), false);
    assert.equal(await t.page.locator("#numbers-screen").isVisible(), false);
    assert.equal(await t.page.locator("#operations-screen").isVisible(), false);
    assert.equal(await t.page.locator("html").getAttribute("dir"), "rtl");
    assert.deepEqual(t.errors, []);
  } finally { await t.done(); }
});

test("العميل ينتقل بين تسجيل الدخول وإنشاء الحساب", { skip }, async () => {
  const t = await open(browser, "/client/", { viewport: { width: 360, height: 740 } });
  try {
    await t.page.waitForSelector("#login-screen:not([hidden])");
    await t.page.click("#login-to-signup");
    await t.page.waitForSelector("#signup-screen:not([hidden])");
    assert.equal(await t.page.locator("#signup-email").isVisible(), true);
    await t.page.click("#signup-to-login");
    await t.page.waitForSelector("#login-screen:not([hidden])");
    assert.equal(await t.page.locator("#login-email").isVisible(), true);
    assert.deepEqual(t.errors, []);
  } finally { await t.done(); }
});
