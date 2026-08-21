import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// If this app ever moves off Vercel/Node to Cloudflare Workers, this needs
// Cloudflare's Browser Rendering API instead — puppeteer-core +
// @sparticuz/chromium doesn't run in the Workers runtime.
export async function renderPdfFromHtml(html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "a4", landscape: true, printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}
