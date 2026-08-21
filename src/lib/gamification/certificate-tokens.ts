// Pure token substitution for admin-uploaded certificate templates — no
// server-only imports, so it can also run client-side for the live preview
// in CertificateTemplateForm.tsx.

export interface CertificateTokenData {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  certificateCode: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const TOKENS: Record<keyof CertificateTokenData, string> = {
  studentName: "{{studentName}}",
  courseTitle: "{{courseTitle}}",
  completionDate: "{{completionDate}}",
  certificateCode: "{{certificateCode}}",
};

// Unrecognized {{...}} tokens are left as-is — a forgiving substitution, not
// a strict template language.
export function renderCertificateHtml(template: string, data: CertificateTokenData): string {
  return (Object.keys(TOKENS) as (keyof CertificateTokenData)[]).reduce(
    (html, key) => html.split(TOKENS[key]).join(escapeHtml(data[key])),
    template,
  );
}
