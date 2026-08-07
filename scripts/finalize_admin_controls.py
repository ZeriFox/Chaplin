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


def patch_pricing() -> None:
    path = "components/dynamic-pricing-management.tsx"
    text = read(path)

    if "const PRICE_PRESETS =" not in text:
        marker = "\nfunction initialWeekdaySettings(): Record<number, WeekdaySetting> {"
        insert = r'''
const PRICE_PRESETS = [
  { label: "Tariffa 1", price: 169 },
  { label: "Tariffa 2", price: 199 },
  { label: "Tariffa 3", price: 219 },
] as const

function PricePresetButtons({ onSelect }: { onSelect: (price: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>Tariffe preimpostate</Label>
      <div className="flex flex-wrap gap-2">
        {PRICE_PRESETS.map(({ label, price }) => (
          <Button key={label} type="button" variant="outline" onClick={() => onSelect(price)}>
            {label} · €{price}
          </Button>
        ))}
      </div>
    </div>
  )
}
'''
        text = replace_once(text, marker, insert + marker, path)

    if "function applyPresetToWeekdays" not in text:
        pattern = re.compile(
            r'(  function selectedWeekdays\(\) \{\n'
            r'    return WEEKDAYS\.filter\(\(\{ day \}\) => weekdaySettings\[day\]\?\.enabled\)\n'
            r'  \}\n)'
        )
        replacement = r'''\1
  function applyPresetToWeekdays(price: number) {
    setWeekdaySettings((current) => {
      const activeDays = WEEKDAYS.filter(({ day }) => current[day]?.enabled)
      const targetDays = new Set((activeDays.length ? activeDays : WEEKDAYS).map(({ day }) => day))

      return Object.fromEntries(
        WEEKDAYS.map(({ day }) => [
          day,
          {
            enabled: activeDays.length ? Boolean(current[day]?.enabled) : true,
            price: targetDays.has(day) ? String(price) : current[day]?.price || "",
          },
        ]),
      ) as Record<number, WeekdaySetting>
    })
  }
'''
        text, count = pattern.subn(replacement, text, count=1)
        if count != 1:
            raise RuntimeError(f"{path}: selectedWeekdays insertion point not found")

    if 'data-price-presets="manual"' not in text:
        old = (
            '            <CardContent className="space-y-4">\n'
            '              <div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="manual-price">'
            'Prezzo per notte (€)</Label>'
        )
        new = (
            '            <CardContent className="space-y-4">\n'
            '              <div data-price-presets="manual">\n'
            '                <PricePresetButtons onSelect={(price) => setRangePrice(String(price))} />\n'
            '              </div>\n'
            '              <div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="manual-price">'
            'Prezzo per notte (€)</Label>'
        )
        text = replace_once(text, old, new, path)

    if 'data-price-presets="weekdays"' not in text:
        old = '              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">'
        new = (
            '              <div data-price-presets="weekdays">\n'
            '                <PricePresetButtons onSelect={applyPresetToWeekdays} />\n'
            '              </div>\n'
            '              <p className="text-xs text-muted-foreground">\n'
            '                La tariffa viene applicata ai giorni selezionati; se non ne selezioni nessuno, vengono compilati tutti.\n'
            '              </p>\n'
            '              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">'
        )
        text = replace_once(text, old, new, path)

    if 'data-price-presets="base"' not in text:
        old = (
            '<CardContent className="space-y-4"><p className="text-2xl font-bold">'
            '€{room.basePrice} / notte</p><div className="flex max-w-md flex-col gap-2 sm:flex-row">'
        )
        new = (
            '<CardContent className="space-y-4"><p className="text-2xl font-bold">'
            '€{room.basePrice} / notte</p>'
            '<div data-price-presets="base"><PricePresetButtons onSelect={(price) => setRangePrice(String(price))} /></div>'
            '<div className="flex max-w-md flex-col gap-2 sm:flex-row">'
        )
        text = replace_once(text, old, new, path)

    write(path, text)


def patch_booking_email_templates() -> None:
    path = "lib/email.tsx"
    text = read(path)

    if "logoUrl:" not in text:
        old = '''const BRAND = {
  name: "CHAPLIN Luxury Holiday House",
  city: "Viterbo, Italia",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://chaplin-house.vercel.app",
  fromFallback: "CHAPLIN <noreply@chaplin-house.com>",
}'''
        new = '''const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://chaplinluxuryholidayhouse.it"
).replace(/\\/+$/, "")

const BRAND = {
  name: "CHAPLIN Luxury Holiday House",
  city: "Viterbo, Italia",
  address: "Via della Pettinara 48, 01100 Viterbo (VT)",
  siteUrl: PUBLIC_SITE_URL,
  logoUrl: `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`,
  fromFallback: "CHAPLIN Luxury Holiday House <onboarding@resend.dev>",
}'''
        text = replace_once(text, old, new, path)

    logo = (
        '<img src="${BRAND.logoUrl}" width="260" alt="${BRAND.name}" '
        'style="display:block;width:100%;max-width:260px;height:auto;margin:14px auto 0;border:0" />'
    )
    pattern = re.compile(
        r'(<div class="header">\s*<h1>.*?</h1>)\s*<p>\$\{BRAND\.name\}</p>',
        re.DOTALL,
    )
    if 'src="${BRAND.logoUrl}"' not in text:
        text, count = pattern.subn(lambda match: f"{match.group(1)}\n      {logo}", text)
        if count != 4:
            raise RuntimeError(f"{path}: expected 4 email headers, patched {count}")

    if "<p>${BRAND.address}</p>" not in text:
        text = text.replace(
            "<p>${BRAND.city}</p>",
            "<p>${BRAND.address}</p>\n      <p>${BRAND.city}</p>",
        )

    header_count = text.count('class="header"')
    logo_count = text.count('src="${BRAND.logoUrl}"')
    if header_count != logo_count:
        raise RuntimeError(f"{path}: {header_count} headers but {logo_count} logos")

    write(path, text)


def add_brand_constants(text: str, path: str) -> str:
    if "const EMAIL_LOGO_URL" in text:
        return text

    marker = "export async function POST(request: NextRequest) {"
    constants = '''const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://chaplinluxuryholidayhouse.it"
).replace(/\\/+$/, "")
const EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`
const BRAND_NAME = "CHAPLIN Luxury Holiday House"
const BRAND_ADDRESS = "Via della Pettinara 48, 01100 Viterbo (VT)"

'''
    return replace_once(text, marker, constants + marker, path)


def patch_extra_service_emails() -> None:
    simple_path = "app/api/request-extra-services/route.ts"
    text = add_brand_constants(read(simple_path), simple_path)
    text = text.replace(
        'process.env.SERVICE_EXTRA_EMAIL || "progettocale@gmail.com"',
        'process.env.SERVICE_EXTRA_EMAIL || "chaplinviterbo@gmail.com"',
    )
    text = text.replace(
        'process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com"',
        'process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"',
    )
    if 'src="${EMAIL_LOGO_URL}"' not in text:
        old = '<h2 style="color: #8B4513;">Nuova Richiesta Servizi Extra</h2>'
        new = (
            '<div style="background:#1b1a17;padding:26px;text-align:center;">'
            '<img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" '
            'style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;" />'
            '</div>\n          '
            '<h2 style="color: #8B4513;">Nuova Richiesta Servizi Extra</h2>'
        )
        text = replace_once(text, old, new, simple_path)
    write(simple_path, text)

    path = "app/api/extra-services/request/route.ts"
    text = add_brand_constants(read(path), path)
    text = text.replace(
        'process.env.SERVICE_EXTRA_EMAIL || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"',
        'process.env.SERVICE_EXTRA_EMAIL || "chaplinviterbo@gmail.com"',
    )
    text = text.replace("Al 22 Suite & Spa Luxury Experience", "CHAPLIN Luxury Holiday House")
    text = text.replace("Al 22 Suite & Spa", "CHAPLIN Luxury Holiday House")
    text = text.replace("Polignano a Mare, Italia", "${BRAND_ADDRESS}")
    text = text.replace("border: 2px solid: #3b82f6", "border: 2px solid #3b82f6")

    header_pattern = re.compile(
        r'(<div class="header">\s*<h1>.*?</h1>)\s*<p>CHAPLIN Luxury Holiday House</p>',
        re.DOTALL,
    )
    if 'src="${EMAIL_LOGO_URL}"' not in text:
        logo = (
            '<img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" '
            'style="display:block;width:100%;max-width:250px;height:auto;margin:14px auto 0;border:0;" />'
        )
        text, count = header_pattern.subn(lambda match: f"{match.group(1)}\n      {logo}", text)
        if count != 2:
            raise RuntimeError(f"{path}: expected 2 headers, patched {count}")

    text = text.replace(
        "<p>CHAPLIN Luxury Holiday House</p>\n      <p>${BRAND_ADDRESS}</p>",
        "<p>${BRAND_NAME}</p>\n      <p>${BRAND_ADDRESS}</p>",
    )
    write(path, text)


def correct_information_typo() -> None:
    variants = ("I formazioni", "I Formazioni", "Iformazioni", "IFormazioni")
    for root in ("app", "components", "lib"):
        for path in (ROOT / root).rglob("*"):
            if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            text = path.read_text(encoding="utf-8")
            fixed = text
            for variant in variants:
                fixed = fixed.replace(variant, "Informazioni")
            if fixed != text:
                path.write_text(fixed, encoding="utf-8")


def verify_requested_features() -> None:
    checks: dict[str, tuple[str, ...]] = {
        "components/dynamic-pricing-management.tsx": (
            "Tariffa 1",
            "Tariffa 2",
            "Tariffa 3",
            "Prezzi per colonne della settimana",
            'data-price-presets="manual"',
            'data-price-presets="weekdays"',
            'data-price-presets="base"',
        ),
        "app/api/contact-structure/route.ts": (
            "chaplin-logo-white.png",
            'compact === "iformazioni"',
        ),
        "app/api/bookings/request/route.ts": (
            "chaplin-logo-readable.png",
            "claimCouponForBooking",
        ),
        "components/admin-coupon-management.tsx": ("AdminCouponManagement",),
        "components/admin-security-settings.tsx": (
            "Autenticazione a due fattori",
            "Invia OTP e cambia password",
        ),
        "app/admin-login/page.tsx": ("Conferma codice e accedi",),
        "app/admin/page.tsx": (
            "Via della Pettinara 48, 01100 Viterbo (VT)",
            "AdminCouponManagement",
        ),
        "lib/admin-two-factor.ts": (
            "createOtpChallenge",
            "verifyOtpChallenge",
            "chaplin-logo-white.png",
        ),
    }

    for path, required in checks.items():
        text = read(path)
        for item in required:
            if item not in text:
                raise RuntimeError(f"{path}: missing required marker {item!r}")

    old_brand = read("app/api/extra-services/request/route.ts")
    if "Al 22 Suite" in old_brand or "Polignano a Mare" in old_brand:
        raise RuntimeError("Extra-services email still contains the legacy property brand")

    missing_logo: list[str] = []
    for root in ("app", "lib"):
        for path in (ROOT / root).rglob("*"):
            if path.suffix not in {".ts", ".tsx"}:
                continue
            text = path.read_text(encoding="utf-8")
            if "sendEmail({" not in text or "html:" not in text:
                continue
            if "chaplin-logo" not in text and "BRAND.logoUrl" not in text and "EMAIL_LOGO_URL" not in text:
                missing_logo.append(str(path.relative_to(ROOT)))

    if missing_logo:
        raise RuntimeError("Email templates without Chaplin logo: " + ", ".join(sorted(missing_logo)))

    typo_hits: list[str] = []
    for root in ("app", "components", "lib"):
        for path in (ROOT / root).rglob("*"):
            if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            text = path.read_text(encoding="utf-8")
            if any(variant in text for variant in ("I formazioni", "I Formazioni", "Iformazioni", "IFormazioni")):
                typo_hits.append(str(path.relative_to(ROOT)))
    if typo_hits:
        raise RuntimeError("Information typo still present in: " + ", ".join(sorted(typo_hits)))


def main() -> None:
    patch_pricing()
    patch_booking_email_templates()
    patch_extra_service_emails()
    correct_information_typo()
    verify_requested_features()
    print("Admin advanced controls patched and verified.")


if __name__ == "__main__":
    main()
