/**
 * Base HTML email shell — table-based layout for cross-client compatibility.
 * All styles are inline. No <style> block (Gmail strips them).
 *
 * @param content  The inner HTML to inject into the body cell
 * @param preheader Short preview text shown by email clients before opening
 * @param gymName  Optional — appears in the footer attribution line
 */
export function baseTemplate(
  content: string,
  preheader: string,
  gymName?: string,
): string {
  const year = new Date().getFullYear();
  const footerText = gymName
    ? `&copy; ${year} Hone &middot; You received this because you are a member of ${gymName}`
    : `&copy; ${year} Hone &middot; Transactional notification`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Hone</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader: hidden preview text -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f9fafb;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Email container (max 600px) -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;border-collapse:collapse;">

          <!-- ── Header ─────────────────────────────────────────────── -->
          <tr>
            <td style="padding:28px 40px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border-collapse:collapse;">
                <tr>
                  <td>
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">Hone</span><span style="display:inline-block;width:6px;height:6px;background-color:#1D9E75;border-radius:50%;vertical-align:middle;margin-left:3px;margin-bottom:2px;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ──────────────────────────────────────────────── -->
          <tr>
            <td style="padding:40px 40px 32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
              ${content}
            </td>
          </tr>

          <!-- ── Footer ────────────────────────────────────────────── -->
          <tr>
            <td style="padding:20px 40px 28px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">
                ${footerText}
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email container -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;
}

// ── Shared style constants ────────────────────────────────────────────────────
// Reused across all templates to keep inline styles consistent.

export const S = {
  h1: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px 0;line-height:1.3;',
  h2: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:17px;font-weight:600;color:#1a1a1a;margin:0 0 8px 0;line-height:1.4;',
  p:  'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;color:#374151;margin:0 0 16px 0;line-height:1.6;',
  pMuted: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;color:#6b7280;margin:0 0 8px 0;line-height:1.5;',
  label: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px 0;',
  strong: 'font-weight:600;color:#1a1a1a;',

  // CTA button
  btn: 'display:inline-block;background-color:#1D9E75;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;line-height:1;',
  btnWrapper: 'margin:24px 0 8px 0;',

  // Info box
  infoBox: 'background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px 24px;margin:20px 0;',
  infoRow: 'padding:6px 0;border-bottom:1px solid #e5e7eb;',
  infoRowLast: 'padding:6px 0;',

  // Stat box (for 3-up row)
  statBox: 'background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 12px;text-align:center;',
  statNumber: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:28px;font-weight:700;color:#1a1a1a;margin:0;line-height:1.1;',
  statLabel: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;color:#6b7280;margin:4px 0 0 0;',

  // Pill / badge
  pill: 'display:inline-block;background-color:#f0fdf9;color:#0f766e;font-size:12px;font-weight:500;padding:3px 10px;border-radius:20px;border:1px solid #99f6e4;margin:2px 3px 2px 0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;',

  // Amber banner
  amberBanner: 'background-color:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin:20px 0;',
  amberText: 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:14px;color:#92400e;margin:0;line-height:1.5;',
} as const;
