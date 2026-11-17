// Refund rules for cancelling a paid booking.
//  - The sitter cancels: the owner always gets 100% back.
//  - The owner cancels 2+ days before the start date: 100%.
//  - The owner cancels the day before: 50%.
//  - The owner cancels on the start day or later: no refund (the sitter has already set the time aside).
// Unpaid bookings simply get cancelled; nothing is charged.

const OWNER_REASONS = ['plans_changed', 'found_other_sitter', 'sitter_not_responding', 'pet_health', 'other'];
const SITTER_REASONS = ['not_available', 'cannot_handle_pet', 'emergency', 'owner_not_responding', 'other'];

function daysBetween(fromDate, toDate) {
  const from = Date.UTC(...fromDate.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))));
  const to = Date.UTC(...toDate.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))));
  return Math.round((to - from) / 86400000);
}

function refundFor({ actor, paymentStatus, totalPrice, startDate, today }) {
  const paid = paymentStatus === 'paid';
  const total = Number(totalPrice) || 0;
  if (!paid) return { paid: false, percent: 0, amount: 0, daysBefore: daysBetween(today, startDate) };
  const daysBefore = daysBetween(today, startDate);
  let percent;
  if (actor === 'sitter') percent = 100;
  else if (daysBefore >= 2) percent = 100;
  else if (daysBefore === 1) percent = 50;
  else percent = 0;
  return { paid: true, percent, amount: Math.round((total * percent) / 100), daysBefore };
}

function paymentStatusAfterRefund(percent) {
  if (percent >= 100) return 'refunded';
  if (percent > 0) return 'partially_refunded';
  return 'paid';
}

module.exports = { OWNER_REASONS, SITTER_REASONS, refundFor, paymentStatusAfterRefund };
