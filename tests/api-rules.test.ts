import assert from "node:assert/strict"
import test from "node:test"

import { dateRangesOverlap, enumerateStayDates } from "../lib/booking-rules.ts"
import { calculateCouponDiscount, CouponRuleError, validateCouponRule } from "../lib/coupon-rules.ts"
import {
  hashOtpValue,
  hasOtpAttemptsRemaining,
  isOtpCode,
  isOtpExpired,
  safeCompareOtpHash,
} from "../lib/otp-rules.ts"

test("prezzi/coupon: percentuale, fisso, minimo e limite cliente", () => {
  assert.equal(calculateCouponDiscount({ type: "percentage", value: 10 }, 199), 19.9)
  assert.equal(calculateCouponDiscount({ type: "fixed", value: 250 }, 199), 199)

  assert.throws(
    () =>
      validateCouponRule(
        { type: "percentage", value: 10, active: true, minSubtotal: 200 },
        { subtotal: 199, referenceDate: "2026-08-08" },
      ),
    CouponRuleError,
  )
  assert.throws(
    () =>
      validateCouponRule(
        { type: "fixed", value: 20, active: true, maxUsesPerCustomer: 1 },
        { subtotal: 219, referenceDate: "2026-08-08", customerUsageCount: 1 },
      ),
    /limite di utilizzi/,
  )
})

test("prenotazioni: il check-out resta libero e gli intervalli sovrapposti vengono rilevati", () => {
  assert.deepEqual(enumerateStayDates("2026-12-05", "2026-12-18"), [
    "2026-12-05", "2026-12-06", "2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11",
    "2026-12-12", "2026-12-13", "2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17",
  ])
  assert.equal(dateRangesOverlap("2026-12-05", "2026-12-18", "2026-12-18", "2026-12-20"), false)
  assert.equal(dateRangesOverlap("2026-12-05", "2026-12-18", "2026-12-17", "2026-12-20"), true)
})

test("OTP: formato, hash protetto, scadenza e limite tentativi", () => {
  const hash = hashOtpValue("segreto-di-test", "123456", "challenge", "admin")
  assert.notEqual(hash, "123456")
  assert.equal(safeCompareOtpHash(hash, hashOtpValue("segreto-di-test", "123456", "challenge", "admin")), true)
  assert.equal(safeCompareOtpHash(hash, hashOtpValue("segreto-di-test", "654321", "challenge", "admin")), false)
  assert.equal(isOtpCode("123456"), true)
  assert.equal(isOtpCode("12345"), false)
  assert.equal(isOtpExpired(999, 1000), true)
  assert.equal(hasOtpAttemptsRemaining(4, 5), true)
  assert.equal(hasOtpAttemptsRemaining(5, 5), false)
})
