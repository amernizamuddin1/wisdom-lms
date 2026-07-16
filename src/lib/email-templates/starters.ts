import type { Branding } from "@/lib/branding";
import { ctaButtonHtml } from "./layout";

export type StarterTemplateId =
  | "blank"
  | "announcement"
  | "course_update"
  | "new_course_launch"
  | "reminder"
  | "welcome"
  | "newsletter";

export const STARTER_TEMPLATES: { id: StarterTemplateId; label: string }[] = [
  { id: "blank", label: "Blank" },
  { id: "announcement", label: "Announcement" },
  { id: "course_update", label: "Course Update" },
  { id: "new_course_launch", label: "New Course Launch" },
  { id: "reminder", label: "Reminder" },
  { id: "welcome", label: "Welcome" },
  { id: "newsletter", label: "General Newsletter" },
];

// Starting body HTML for the editor — admins override freely from here.
// {{firstName}}/{{platformName}} placeholders are substituted at send time
// (see personalize()) so the same draft works across every recipient.
export function getStarterHtml(id: StarterTemplateId, branding: Branding): string {
  const primary = branding.primaryColor;

  switch (id) {
    case "announcement":
      return `<h2 style="margin:0 0 12px;">We have an announcement, {{firstName}}!</h2><p>Share your update here. This is a good place for platform news, policy changes, or important information for your learners.</p>${ctaButtonHtml("Learn More", "#", primary)}`;
    case "course_update":
      return `<h2 style="margin:0 0 12px;">Course Update</h2><p>Hi {{firstName}}, we've just updated <strong>{{courseName}}</strong> with new content. Here's what's new:</p><ul><li>New lesson added</li><li>Updated resources</li></ul>${ctaButtonHtml("View Course", "#", primary)}`;
    case "new_course_launch":
      return `<h2 style="margin:0 0 12px;">New Course: {{courseName}}</h2><p>Hi {{firstName}}, we just launched a brand-new course on ${escapeHtmlLocal(branding.platformName)}. Take a look and enroll today.</p>${ctaButtonHtml("Explore the Course", "#", primary)}`;
    case "reminder":
      return `<h2 style="margin:0 0 12px;">Don't forget, {{firstName}}!</h2><p>This is a friendly reminder about your course progress on ${escapeHtmlLocal(branding.platformName)}. Pick up right where you left off.</p>${ctaButtonHtml("Continue Learning", "#", primary)}`;
    case "welcome":
      return `<h2 style="margin:0 0 12px;">Welcome to ${escapeHtmlLocal(branding.platformName)}, {{firstName}}!</h2><p>We're excited to have you. Here's how to get started:</p><ol><li>Explore your dashboard</li><li>Start your first lesson</li><li>Track your progress</li></ol>${ctaButtonHtml("Go to Dashboard", "#", primary)}`;
    case "newsletter":
      return `<h2 style="margin:0 0 12px;">This Month at ${escapeHtmlLocal(branding.platformName)}</h2><p>Hi {{firstName}}, here's what's new this month.</p><h3 style="margin:16px 0 8px;">Highlights</h3><p>Add your newsletter content here.</p>`;
    case "blank":
    default:
      return `<p>Hi {{firstName}},</p><p>&nbsp;</p>`;
  }
}

function escapeHtmlLocal(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Applied per-recipient at send time.
export function personalize(html: string, vars: { firstName: string; platformName: string; courseName?: string }): string {
  return html
    .replaceAll("{{firstName}}", vars.firstName)
    .replaceAll("{{platformName}}", vars.platformName)
    .replaceAll("{{courseName}}", vars.courseName ?? "");
}
