-- certificateTemplateUrl and certificateFieldPositionsJson were reserved for
-- a coordinate-based certificate positioning UI that was never built and has
-- zero reads/writes anywhere in the app — safe to drop with no backfill.
-- certificateTemplateHtml replaces both: admins upload one HTML file with
-- {{studentName}}/{{courseTitle}}/{{completionDate}}/{{certificateCode}}
-- tokens, substituted server-side and rendered to PDF.
ALTER TABLE "settings" DROP COLUMN "certificate_template_url";
ALTER TABLE "settings" DROP COLUMN "certificate_field_positions_json";
ALTER TABLE "settings" ADD COLUMN "certificate_template_html" TEXT;
