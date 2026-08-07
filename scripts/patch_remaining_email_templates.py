from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, path: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    files = (
        "app/api/bookings/notify-admin/route.ts",
        "app/api/cron/send-balance-payment-reminders/route.ts",
        "app/api/cron/send-checkin-reminders/route.ts",
        "app/api/cron/send-monthly-reminders/route.ts",
        "app/api/cron/send-promotional-emails/route.ts",
    )

    constants = '''const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://chaplinluxuryholidayhouse.it"
).replace(/\\/+$/, "")
const EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`
const BRAND_NAME = "CHAPLIN Luxury Holiday House"
const BRAND_ADDRESS = "Via della Pettinara 48, 01100 Viterbo (VT)"

'''
    logo = (
        '<div style="background:#1b1a17;padding:24px;text-align:center;">'
        '<img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" title="${BRAND_ADDRESS}" '
        'style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;" />'
        '</div>\n            '
    )

    for path in files:
        text = read(path)

        if "const EMAIL_LOGO_URL" not in text:
            marker = (
                "export async function POST(request: NextRequest) {"
                if "/bookings/notify-admin/" in path
                else "export async function GET(request: NextRequest) {"
            )
            text = replace_once(text, marker, constants + marker, path)

        text = text.replace(
            'process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com"',
            'process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"',
        )
        text = text.replace("AL 22 Suite & Spa", "CHAPLIN Luxury Holiday House")
        text = text.replace("AL 22 Suite", "CHAPLIN Luxury Holiday House")
        text = text.replace("Polignano a Mare, Italia", "${BRAND_ADDRESS}")
        text = text.replace("Polignano a Mare", "Viterbo")
        text = text.replace("https://al22suite.com", "${PUBLIC_SITE_URL}")
        text = text.replace(
            "goditi la vista mozzafiato sul mare",
            "goditi l’atmosfera del centro storico di Viterbo",
        )
        text = text.replace("Vista Mare", "Centro Storico")
        text = text.replace("Spa Luxury", "SPA Privata")
        text = text.replace("nel cuore di Viterbo", "nel centro storico di Viterbo")

        if 'src="${EMAIL_LOGO_URL}"' not in text:
            pattern = re.compile(r"(html:\s*`\s*)")
            text, count = pattern.subn(lambda match: match.group(1) + logo, text, count=1)
            if count != 1:
                raise RuntimeError(f"{path}: email HTML insertion point not found")

        text = text.replace(
            '<h1 style="margin: 0; font-size: 32px;">CHAPLIN Luxury Holiday House</h1>',
            '<p style="margin:0;font-size:18px;font-weight:600;">Esperienze e offerte esclusive</p>',
        )

        if 'src="${EMAIL_LOGO_URL}"' not in text:
            raise RuntimeError(f"{path}: logo was not added")

        write(path, text)

    print("Remaining email templates patched.")


if __name__ == "__main__":
    main()
