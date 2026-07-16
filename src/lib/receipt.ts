import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { getTenantId } from "@/lib/tenant-context";
import type { Order, OrderItem, OrderPayment, User } from "@/generated/prisma/client";

export type ReceiptOrder = Order & {
  items: OrderItem[];
  payment: OrderPayment | null;
  user: User;
};

const CURRENCY_SYMBOL: Record<string, string> = { INR: "Rs. ", USD: "$", EUR: "EUR " };

function money(amount: unknown, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "";
  return `${symbol}${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Best-effort logo embed — falls back to null (caller renders a text fallback)
// on any failure (network, unsupported format, no logo configured), matching
// this app's existing "gracefully degrade when an asset/integration isn't set
// up" convention.
async function tryEmbedLogo(pdfDoc: PDFDocument, logoUrl: string | null): Promise<PDFImage | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return await pdfDoc.embedJpg(bytes);
    }
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      return await pdfDoc.embedJpg(bytes);
    }
  } catch {
    return null;
  }
}

export async function generateOrderReceiptPdf(order: ReceiptOrder): Promise<Uint8Array> {
  const tenantId = await getTenantId();
  const [settings, branding] = await Promise.all([
    prisma.settings.findUnique({ where: { tenantId } }),
    getBranding(),
  ]);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await tryEmbedLogo(pdfDoc, settings?.logoUrl ?? null);

  const margin = 56;
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const contentBottom = margin;
  let y = pageHeight - margin;

  function text(
    value: string,
    x: number,
    size: number,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) {
    page.drawText(value, {
      x,
      y,
      size,
      font: options?.bold ? bold : font,
      color: options?.color ? rgb(...options.color) : rgb(0.1, 0.1, 0.1),
    });
  }

  function textRightAligned(
    value: string,
    rightEdge: number,
    size: number,
    useFont: PDFFont,
    options?: { color?: [number, number, number] },
  ) {
    const w = useFont.widthOfTextAtSize(value, size);
    page.drawText(value, {
      x: rightEdge - w,
      y,
      size,
      font: useFont,
      color: options?.color ? rgb(...options.color) : rgb(0.1, 0.1, 0.1),
    });
  }

  function line(gap = 18) {
    y -= gap;
  }

  function hr() {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    line(14);
  }

  // Header — logo (or platform name text fallback) top-left, sized to match
  // the "Payment Receipt" title, with the sender email beneath it;
  // "Payment Receipt" right-aligned against the actual margin using
  // measured text width, so it never looks off-balance.
  const headerTop = y;
  const receiptTitleSize = 20;
  let logoBottom: number;
  if (logo) {
    const logoHeight = 26;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    page.drawImage(logo, { x: margin, y: headerTop - logoHeight, width: logoWidth, height: logoHeight });
    logoBottom = headerTop - logoHeight;
  } else {
    text(branding.platformName, margin, receiptTitleSize, { bold: true });
    logoBottom = headerTop - receiptTitleSize;
  }

  let headerBottom = logoBottom;
  const contactEmail = settings?.resendSenderEmail || branding.supportEmail;
  if (contactEmail) {
    y = logoBottom - 14;
    text(contactEmail, margin, 9, { color: [0.45, 0.45, 0.45] });
    headerBottom = y;
  }

  y = headerTop;
  textRightAligned("Payment Receipt", pageWidth - margin, receiptTitleSize, bold);

  y = Math.min(headerBottom, headerTop - receiptTitleSize) - 24;
  hr();

  // Order meta
  text(`Order Number: ${order.orderNumber}`, margin, 11);
  line();
  text(`Order Date: ${order.createdAt.toLocaleDateString("en-IN")}`, margin, 11);
  line();
  text(`Status: ${order.status}`, margin, 11);
  line();
  if (order.payment?.gatewayPaymentId) {
    text(`Payment ID: ${order.payment.gatewayPaymentId}`, margin, 11);
    line();
  }
  text(`Payment Method: ${order.paymentMethod}`, margin, 11);
  line(26);
  hr();

  // Billing to
  text("Billed To", margin, 11, { bold: true });
  line();
  text(order.user.name, margin, 11);
  line();
  text(order.user.email, margin, 11);
  line(26);
  hr();

  // Items table header
  text("Item", margin, 11, { bold: true });
  text("Original", pageWidth - margin - 190, 11, { bold: true });
  text("Final", pageWidth - margin - 80, 11, { bold: true });
  line(18);

  for (const item of order.items) {
    text(item.titleSnapshot, margin, 10);
    text(money(item.originalPrice, order.currency), pageWidth - margin - 190, 10);
    text(money(item.finalPrice, order.currency), pageWidth - margin - 80, 10);
    line(16);
  }

  line(4);
  hr();

  // Totals
  function totalsRow(label: string, value: string, opts?: { bold?: boolean }) {
    text(label, pageWidth - margin - 220, 11, { bold: opts?.bold });
    text(value, pageWidth - margin - 80, 11, { bold: opts?.bold });
    line(18);
  }

  totalsRow("Subtotal", money(order.subtotal, order.currency));
  if (Number(order.discountTotal) > 0) {
    totalsRow("Discount", `-${money(order.discountTotal, order.currency)}`);
  }
  if (Number(order.couponDiscountAmount) > 0) {
    totalsRow(`Coupon (${order.couponCode})`, `-${money(order.couponDiscountAmount, order.currency)}`);
  }
  totalsRow("Amount Paid", money(order.totalAmount, order.currency), { bold: true });

  line(30);
  hr();
  text("Thank you for your purchase.", margin, 10, { color: [0.45, 0.45, 0.45] });

  // Guard against silent overflow past the bottom margin as content grows
  // (more items, longer notes) — better to know than to render off-page.
  if (y < contentBottom) {
    console.warn(`Receipt for order ${order.orderNumber} content ran past the bottom margin.`);
  }

  return pdfDoc.save();
}
