// Pure string transforms only (no server/browser-only APIs) - this module
// is imported by both a "use client" editor (for the live preview) and by
// src/lib/email.ts (for the real send), so it must stay safe in either
// environment.

export type InvitationTemplateVars = {
  positionTitle: string;
  accessCode: string;
  assessmentLink: string;
};

export const DEFAULT_INVITATION_SUBJECT = "You're shortlisted - {{positionTitle}}";

export const DEFAULT_INVITATION_BODY = `Dear Candidate,

We are pleased to inform you that you have been shortlisted for the next stage of our **{{positionTitle}}** selection process.

You are now invited to complete our online practical assessment.

**Assessment Link:** {{assessmentLink}}

### Login Instructions

Please log in using:

- **Email:** The same email address you used when applying
- **Access Code:** {{accessCode}}

Please make sure you use your own application email and the access code provided above to access the assessment.

Read all instructions carefully before starting the assessment. Once you begin, make sure you have a stable internet connection and enough uninterrupted time to complete it.

Please do not share your assessment link or access code with anyone else.

If you face any technical issues while accessing the assessment, please contact us.

Best regards,
**HR Team**
**VecoSoft**`;

export const SAMPLE_INVITATION_VARS: InvitationTemplateVars = {
  positionTitle: "Frontend Developer Practical Assessment",
  accessCode: "VSOFT-7XQ9-K2M4",
  assessmentLink: "http://localhost:3000/assessment/login",
};

export const INVITATION_TEMPLATE_HELP =
  "Placeholders: {{positionTitle}}, {{accessCode}}, {{assessmentLink}} - filled in per candidate when sent. " +
  "Formatting: **bold**, ### heading, lines starting with \"- \" become a bulleted list, a blank line starts a new paragraph.";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

export function renderEmailSubject(subject: string, vars: InvitationTemplateVars): string {
  return subject
    .replaceAll("{{positionTitle}}", vars.positionTitle)
    .replaceAll("{{accessCode}}", vars.accessCode)
    .replaceAll("{{assessmentLink}}", vars.assessmentLink);
}

/** Escapes a line, then swaps in placeholders (as pre-built safe HTML) and **bold** markers. */
function formatLine(line: string, vars: InvitationTemplateVars): string {
  let html = escapeHtml(line);

  html = html.replaceAll("{{positionTitle}}", escapeHtml(vars.positionTitle));
  html = html.replaceAll(
    "{{accessCode}}",
    `<span style="font-weight:700;letter-spacing:1px;background:#f1f5f9;padding:2px 8px;border-radius:6px;">${escapeHtml(
      vars.accessCode
    )}</span>`
  );
  html = html.replaceAll(
    "{{assessmentLink}}",
    `<a href="${escapeHtml(vars.assessmentLink)}" style="color:#4f46e5;">${escapeHtml(vars.assessmentLink)}</a>`
  );

  return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Lightweight markdown -> HTML fragment: blank-line paragraphs, "### " headings, "- "/"* " bullet lists, **bold**. */
export function renderEmailBodyHtml(bodyMarkdown: string, vars: InvitationTemplateVars): string {
  const blocks = bodyMarkdown.trim().split(/\n\s*\n/);

  return blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return "";

      if (lines[0].startsWith("### ")) {
        return `<h3 style="margin:24px 0 8px;font-size:15px;color:#0f172a;">${formatLine(
          lines[0].slice(4),
          vars
        )}</h3>`;
      }

      if (lines.every((l) => l.startsWith("- ") || l.startsWith("* "))) {
        const items = lines.map((l) => `<li>${formatLine(l.slice(2), vars)}</li>`).join("");
        return `<ul style="padding-left:20px;margin:8px 0;">${items}</ul>`;
      }

      return `<p style="margin:12px 0;">${lines.map((l) => formatLine(l, vars)).join("<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

export function emailShellHtml(bodyHtml: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
    <div style="padding: 24px 0; border-bottom: 2px solid #4f46e5;">
      <strong style="font-size: 18px; color: #4f46e5;">Vecosoft</strong>
    </div>
    <div style="padding: 24px 0;">${bodyHtml}</div>
    <div style="padding: 16px 0; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      Vecosoft Recruitment Team &middot; This is an automated message from the Practical Hiring & Skill Assessment Platform.
    </div>
  </div>`;
}
