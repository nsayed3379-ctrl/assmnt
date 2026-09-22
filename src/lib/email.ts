import { Resend } from "resend";
import { supabaseAdmin } from "./supabaseAdmin";
import {
  DEFAULT_INVITATION_BODY,
  DEFAULT_INVITATION_SUBJECT,
  emailShellHtml,
  renderEmailBodyHtml,
  renderEmailSubject,
  type InvitationTemplateVars,
} from "./emailTemplate";

let client: Resend | null = null;

function resend() {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY env var");
  client = new Resend(key);
  return client;
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Vecosoft Careers <onboarding@resend.dev>";
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export type InvitationEmailInput = {
  to: string;
  fullName: string | null;
  positionTitle: string;
  accessCode: string;
  durationMinutes: number;
  hardDeadline: string | null;
  loginUrl?: string;
};

/** The invitation subject/body as edited in the admin panel (/admin/email-template), falling back to the built-in default if that row is missing (e.g. migration 0003 not run yet). */
async function fetchInvitationTemplate(): Promise<{ subject: string; body: string }> {
  try {
    const { data } = await supabaseAdmin()
      .from("email_templates")
      .select("subject, body_markdown")
      .eq("key", "invitation")
      .maybeSingle();
    if (data) return { subject: data.subject, body: data.body_markdown };
  } catch (err) {
    console.error("Could not load invitation email template, using default", err);
  }
  return { subject: DEFAULT_INVITATION_SUBJECT, body: DEFAULT_INVITATION_BODY };
}

function invitationVars(input: InvitationEmailInput): InvitationTemplateVars {
  return {
    positionTitle: input.positionTitle,
    accessCode: input.accessCode,
    assessmentLink: input.loginUrl || `${appUrl()}/assessment/login`,
  };
}

function buildInvitationEmail(template: { subject: string; body: string }, vars: InvitationTemplateVars) {
  return {
    subject: renderEmailSubject(template.subject, vars),
    html: emailShellHtml(renderEmailBodyHtml(template.body, vars)),
  };
}

export function resendCodeEmailHtml(input: { accessCode: string; loginUrl?: string }) {
  return emailShellHtml(`
    <p>Hello,</p>
    <p>As requested, here is your Vecosoft assessment access code:</p>
    <p style="font-size: 20px; font-weight: 700; letter-spacing: 2px; background:#f1f5f9; padding: 12px 16px; border-radius: 8px; text-align:center;">
      ${escapeHtml(input.accessCode)}
    </p>
    <p style="margin: 20px 0;">
      <a href="${input.loginUrl || `${appUrl()}/assessment/login`}"
         style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
         Go to Assessment Portal
      </a>
    </p>
    <p style="font-size: 13px; color:#64748b;">If you did not request this, you can safely ignore this email.</p>
  `);
}

export async function sendInvitationEmail(input: InvitationEmailInput) {
  const template = await fetchInvitationTemplate();
  const { subject, html } = buildInvitationEmail(template, invitationVars(input));
  return resend().emails.send({ from: fromAddress(), to: input.to, subject, html });
}

export async function sendInvitationBatch(inputs: InvitationEmailInput[]) {
  const template = await fetchInvitationTemplate();

  // Resend's batch endpoint accepts up to 100 emails per call.
  const chunks: InvitationEmailInput[][] = [];
  for (let i = 0; i < inputs.length; i += 100) chunks.push(inputs.slice(i, i + 100));

  const results: { to: string; id?: string; error?: string }[] = [];

  for (const chunk of chunks) {
    try {
      const { data, error } = await resend().batch.send(
        chunk.map((input) => {
          const { subject, html } = buildInvitationEmail(template, invitationVars(input));
          return { from: fromAddress(), to: input.to, subject, html };
        })
      );

      if (error) {
        chunk.forEach((input) => results.push({ to: input.to, error: error.message }));
        continue;
      }

      (data?.data || []).forEach((sent, idx) => {
        results.push({ to: chunk[idx].to, id: sent.id });
      });
    } catch (err: any) {
      chunk.forEach((input) => results.push({ to: input.to, error: err?.message || "Unknown send error" }));
    }
  }

  return results;
}

export async function sendResendCodeEmail(to: string, accessCode: string) {
  return resend().emails.send({
    from: fromAddress(),
    to,
    subject: "Your Vecosoft assessment access code",
    html: resendCodeEmailHtml({ accessCode }),
  });
}
