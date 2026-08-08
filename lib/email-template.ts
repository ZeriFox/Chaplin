import { getEmailLogoUrl, SITE_CONFIG } from "@/lib/site-config"

export const EMAIL_LAYOUT_MARKER = "data-chaplin-email-layout=\"shared-v1\""

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function extractLegacyContent(html: string) {
  const styles = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[0])
    .join("\n")
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html

  return `${styles}${body}`
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
    .replace(/<img\b[^>]*src=["'][^"']*chaplin-logo[^"']*["'][^>]*\/?>/gi, "")
    .trim()
}

export function renderEmailLayout({
  title,
  preheader,
  content,
}: {
  title: string
  preheader?: string
  content: string
}) {
  const safeTitle = escapeHtml(title)
  const safePreheader = escapeHtml(preheader || title)

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body ${EMAIL_LAYOUT_MARKER} style="margin:0;padding:0;background:#f3f1eb;font-family:Arial,Helvetica,sans-serif;color:#24231f;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f1eb;padding:28px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #e4dcc5;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:26px 28px;background:#1b1a17;text-align:center;">
                <img src="${getEmailLogoUrl()}" width="260" alt="${SITE_CONFIG.name}" style="display:block;width:100%;max-width:260px;height:auto;margin:0 auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px;line-height:1.6;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8f6f0;text-align:center;color:#777168;font-size:12px;line-height:1.6;">
                <strong>${SITE_CONFIG.name}</strong><br />
                ${SITE_CONFIG.address}<br />
                <a href="${getPublicSiteUrlForTemplate()}" style="color:#8d722e;text-decoration:none;">${getPublicSiteUrlForTemplate()}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function getPublicSiteUrlForTemplate() {
  const logoUrl = getEmailLogoUrl()
  return logoUrl.slice(0, -SITE_CONFIG.emailLogoPath.length)
}

/**
 * Garantisce che anche i template storici passino dallo stesso layout.
 * Il trasporto email la applica centralmente, quindi nessuna nuova email può
 * dimenticare logo assoluto, indirizzo o struttura responsive condivisa.
 */
export function ensureSharedEmailLayout(html: string | undefined, subject: string) {
  if (!html) return html
  if (html.includes(EMAIL_LAYOUT_MARKER)) return html
  return renderEmailLayout({ title: subject, content: extractLegacyContent(html) })
}
