import { baseTemplate, S } from './base.template';

export interface AssessmentAssignedData {
  memberName: string;
  trainerName: string;
  gymName: string;
  templateName: string;        // e.g. "Weekly check-in"
  scheduledDate: string | null; // pre-formatted date, or null
  fieldCount: number;
  assessmentUrl: string;        // deep link: /dashboard/assessments/[id]
}

export function assessmentAssignedTemplate(data: AssessmentAssignedData): { subject: string; html: string } {
  const subject = `New assessment ready — ${data.templateName}`;
  const preheader = `Complete your ${data.templateName} — it only takes a few minutes`;

  const dueLine = data.scheduledDate
    ? `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;margin:4px 0 0 0;line-height:1.5;">
        <strong style="${S.strong}">Due:</strong> ${data.scheduledDate}
      </p>`
    : `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#6b7280;margin:4px 0 0 0;line-height:1.5;">
        Complete at your earliest convenience
      </p>`;

  const content = `
    <p style="${S.p}">Hi <strong style="${S.strong}">${data.memberName}</strong>,</p>
    <p style="${S.p}">
      <strong style="${S.strong}">${data.trainerName}</strong> has sent you a
      <strong style="${S.strong}">${data.templateName}</strong> assessment to complete.
    </p>

    <!-- Info box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;${S.infoBox}">
      <tr>
        <td style="padding-bottom:12px;">
          <p style="${S.h2}">${data.templateName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:10px;">
          <p style="${S.label}">Fields</p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;margin:4px 0 0 0;line-height:1.5;">
            ${data.fieldCount} question${data.fieldCount !== 1 ? 's' : ''}
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <p style="${S.label}">Due</p>
          ${dueLine}
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${S.btnWrapper}">
      <tr>
        <td>
          <a href="${data.assessmentUrl}" style="${S.btn}" target="_blank">Fill in assessment</a>
        </td>
      </tr>
    </table>

    <p style="${S.pMuted}">This takes about 2&ndash;3 minutes to complete.</p>
  `;

  return { subject, html: baseTemplate(content, preheader, data.gymName) };
}
