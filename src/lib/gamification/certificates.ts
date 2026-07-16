import "server-only";
import { randomUUID } from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Prisma } from "@/generated/prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardXp, getRuleXpAmount } from "./xp";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

// Minimal, unbranded certificate PDF — generated so CERTIFICATE_EARNED and
// the "Certificates earned" analytics metric are real and non-zero. This is
// deliberately not the full Canva-template-positioning pipeline reserved by
// Settings.certificateTemplateUrl/certificateFieldPositionsJson, which
// remains separate future work.
async function generateCertificatePdf(params: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  certificateCode: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  const accent = rgb(0.486, 0.227, 0.929);
  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.42, 0.42, 0.45);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: accent,
    borderWidth: 2,
  });

  const centerText = (text: string, y: number, size: number, font: typeof titleFont, color = ink) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  };

  centerText("Certificate of Completion", height - 150, 30, titleFont);
  centerText("This certifies that", height - 205, 14, bodyFont, muted);
  centerText(params.learnerName, height - 245, 26, titleFont);
  centerText("has successfully completed", height - 285, 14, bodyFont, muted);
  centerText(params.courseTitle, height - 320, 20, titleFont, accent);

  page.drawText(`Issued ${params.issuedAt.toLocaleDateString()}`, {
    x: 60,
    y: 60,
    size: 10,
    font: bodyFont,
    color: muted,
  });
  const codeText = `Certificate ID: ${params.certificateCode}`;
  const codeWidth = bodyFont.widthOfTextAtSize(codeText, 10);
  page.drawText(codeText, { x: width - 60 - codeWidth, y: 60, size: 10, font: bodyFont, color: muted });

  return doc.save();
}

// Issues a certificate the first time a course completes for a user
// (idempotent — checks for an existing Certificate row first). Uploads to
// the public "certificates" Supabase Storage bucket (reusing the
// createAdminClient() pattern already used for lesson-file signed URLs),
// then awards CERTIFICATE_EARNED XP.
export async function maybeIssueCertificate(
  tx: Tx,
  params: { userId: string; courseId: string },
): Promise<{ issued: boolean }> {
  const tenantId = await getTenantId();

  const existing = await tx.certificate.findFirst({
    where: { userId: params.userId, courseId: params.courseId },
  });
  if (existing) return { issued: false };

  const [user, course] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: params.userId } }),
    tx.course.findUniqueOrThrow({ where: { id: params.courseId } }),
  ]);

  const certificateCode = `WQ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const issuedAt = new Date();
  const pdfBytes = await generateCertificatePdf({
    learnerName: user.name,
    courseTitle: course.title,
    issuedAt,
    certificateCode,
  });

  const supabase = createAdminClient();
  const path = `${params.userId}/${params.courseId}-${certificateCode}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from("certificates").getPublicUrl(path);

  await tx.certificate.create({
    data: {
      userId: params.userId,
      courseId: params.courseId,
      certificateCode,
      issuedAt,
      fileUrl: publicUrlData.publicUrl,
      tenantId,
    },
  });

  const amount = await getRuleXpAmount(tx, "CERTIFICATE_EARNED");
  const result = await awardXp(tx, {
    userId: params.userId,
    ruleCode: "CERTIFICATE_EARNED",
    amount,
    reason: "Certificate earned",
    dedupeKey: `CERTIFICATE_EARNED:${params.courseId}`,
    relatedEntityType: "COURSE",
    relatedEntityId: params.courseId,
  });

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "CERTIFICATE_EARNED",
      courseId: params.courseId,
      xpAwarded: result.amount,
      tenantId,
    },
  });

  return { issued: true };
}
