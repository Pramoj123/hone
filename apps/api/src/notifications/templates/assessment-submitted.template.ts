import { baseTemplate, S } from './base.template';

export interface AssessmentSubmittedData {
  trainerName: string;
  memberName: string;
  gymName: string;
  templateName: string;
  submittedAt: string;            // pre-formatted: "June 5 at 2:34 PM"
  reviewUrl: string;              // admin deep link
  responsesSummary: Array<{       // first 4 fields only
    label: string;
    value: string;
    unit?: string;
  }>;
}

export function assessmentSubmittedTemplate(data: AssessmentSubmittedData): { subject: string; html: string } {
  const subject = `${data.memberName} submitted their ${data.templateName}`;
  const preheader = `Review ${data.memberName}'s assessment from ${data.submittedAt}`;

  const preview = data.responsesSummary.slice(0, 4);
  const extraCount = data.responsesSummary.length - preview.length;

  const previewRows = preview
    .map((r, i) => {
      const isLast = i === preview.length - 1 && extraCount === 0;
      const value = r.unit ? `${r.value} ${r.unit}` : r.value;
      return `
      <tr>
        <td style="padding:9px 0;${isLast ? '' : 'border-bottom:1px solid #e5e7eb;'}width:200px;vertical-align:top;">
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:#6b7280;margin:0;line-height:1.4;">${r.label}</p>
        </td>
        <td style="padding:9px 0;${isLast ? '' : 'border-bottom:1px solid #e5e7eb;'}vertical-align:top;">
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;margin:0;line-height:1.4;">${value}</p>
        </td>
      </tr>`;
    })
    .join('');

  const moreNote = extraCount > 0
    ? `<tr>
        <td colspan="2" style="padding:10px 0 0 0;">
          <p style="${S.pMuted}">+ ${extraCount} more field${extraCount !== 1 ? 's' : ''}</p>
        </td>
      </tr>`
    : '';

  const previewSection = preview.length > 0
    ? `<!-- Response preview -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border-collapse:collapse;${S.infoBox}">
        <tr>
          <td colspan="2" style="padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
            <p style="${S.h2}">${data.templateName}</p>
            <p style="${S.pMuted}">Submitted ${data.submittedAt}</p>
          </td>
        </tr>
        ${previewRows}
        ${moreNote}
      </table>`
    : `<div style="${S.infoBox}">
        <p style="${S.h2}">${data.templateName}</p>
        <p style="${S.pMuted}">Submitted ${data.submittedAt}</p>
      </div>`;

  const content = `
    <p style="${S.p}">Hi <strong style="${S.strong}">${data.trainerName}</strong>,</p>
    <p style="${S.p}">
      <strong style="${S.strong}">${data.memberName}</strong> has completed their
      <strong style="${S.strong}">${data.templateName}</strong>.
    </p>

    ${previewSection}

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${S.btnWrapper}">
      <tr>
        <td>
          <a href="${data.reviewUrl}" style="${S.btn}" target="_blank">Review assessment</a>
        </td>
      </tr>
    </table>

    <p style="${S.pMuted}">Add your feedback and mark it as reviewed from the member profile.</p>
  `;

  return { subject, html: baseTemplate(content, preheader, data.gymName) };
}
