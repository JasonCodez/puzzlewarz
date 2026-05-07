import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium, devices } from "@playwright/test";

const baseUrl = process.env.PWA_SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3002";
const outputDir = path.resolve(process.cwd(), "public", "pwa");

async function openStablePage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

async function capture(browser, { fileName, url, contextOptions, fullPage = true }) {
  const context = await browser.newContext({
    colorScheme: "dark",
    locale: "en-US",
    serviceWorkers: "block",
    ...contextOptions,
  });

  const page = await context.newPage();
  await openStablePage(page, url);

  const filePath = path.join(outputDir, fileName);
  await page.screenshot({
    path: filePath,
    fullPage,
    scale: "css",
  });

  const dimensions = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      document: {
        width: Math.max(root.clientWidth, root.scrollWidth),
        height: Math.max(root.clientHeight, root.scrollHeight),
      },
    };
  });

  await context.close();
  return {
    fileName,
    width: fullPage ? dimensions.document.width : dimensions.viewport.width,
    height: fullPage ? dimensions.document.height : dimensions.viewport.height,
  };
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await capture(browser, {
      fileName: "screenshot-home-wide.png",
      url: new URL("/", baseUrl).toString(),
      contextOptions: {
        viewport: { width: 1440, height: 1400 },
        deviceScaleFactor: 1,
      },
    });

    const mobile = await capture(browser, {
      fileName: "screenshot-home-narrow.png",
      url: new URL("/", baseUrl).toString(),
      contextOptions: {
        ...devices["Pixel 7"],
      },
      fullPage: false,
    });

    process.stdout.write(`${JSON.stringify({ desktop, mobile }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});