// End-to-end API tests for the main booking scenarios.
//
// They talk to a running API (default http://localhost:4000), create their own fresh owner and
// sitter accounts, and only touch data those accounts own. Run against a local or test database,
// not the live site:
//   cd backend && npm start            (in one terminal)
//   cd backend && npm test             (in another)
// Settings: API_URL, ADMIN_EMAIL, ADMIN_PASSWORD (an admin account approves the test sitter).
const { test, before } = require('node:test');
const assert = require('node:assert/strict');

const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nanny.kz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const PASSWORD = 'TestPass123';
const RUN = `${Date.now()}`;
const TEST_CARD = { card_number: '4242424242424242', expiry_month: 12, expiry_year: 2030, cvc: '123', cardholder_name: 'TEST USER' };

async function call(method, path, token, body) {
  const response = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function day(offset) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const ctx = {};

before(async () => {
  const health = await fetch(`${API}/api/health`).catch(() => null);
  assert.ok(health && health.ok, `API is not running at ${API}`);

  const owner = await call('POST', '/api/auth/register', null, {
    full_name: `Тест Владелец ${RUN}`, email: `owner-${RUN}@test.nanny.kz`, password: PASSWORD, role: 'owner',
  });
  assert.equal(owner.status, 201, JSON.stringify(owner.data));
  ctx.owner = owner.data;

  const sitterName = `Тест Ситтер ${RUN}`;
  const sitter = await call('POST', '/api/auth/register', null, {
    full_name: sitterName, email: `sitter-${RUN}@test.nanny.kz`, password: PASSWORD, role: 'sitter',
  });
  assert.equal(sitter.status, 201, JSON.stringify(sitter.data));
  ctx.sitter = sitter.data;
  ctx.sitterName = sitterName;

  await call('PUT', '/api/sitters/me', ctx.sitter.token, { description: 'Тестовый ситтер для автотестов', price_per_day: 3000, district: 'Almaly' });
  const services = await call('PUT', '/api/sitters/me/services', ctx.sitter.token, {
    services: [{ service: 'walking', price: 2000 }, { service: 'boarding', price: 5000 }],
  });
  assert.ok(services.status < 300, JSON.stringify(services.data));

  const admin = await call('POST', '/api/auth/login', null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  assert.equal(admin.status, 200, 'admin login failed: set ADMIN_EMAIL / ADMIN_PASSWORD');
  ctx.admin = admin.data;
  const pending = await call('GET', `/api/admin/sitters/pending?q=${encodeURIComponent(sitterName)}`, ctx.admin.token);
  const list = Array.isArray(pending.data) ? pending.data : pending.data.sitters || [];
  const row = list.find((item) => item.user_id === ctx.sitter.user.id || item.full_name === sitterName);
  assert.ok(row, 'test sitter not found in the admin review list');
  ctx.sitterId = row.sitter_id || row.id;
  const verify = await call('PUT', `/api/admin/sitters/${ctx.sitterId}/verify`, ctx.admin.token, { verified: true });
  assert.equal(verify.status, 200, JSON.stringify(verify.data));

  const pet1 = await call('POST', '/api/pets', ctx.owner.token, { name: 'Бобик', pet_type: 'dog' });
  const pet2 = await call('POST', '/api/pets', ctx.owner.token, { name: 'Мурка', pet_type: 'cat' });
  assert.equal(pet1.status, 201, JSON.stringify(pet1.data));
  ctx.pet1 = pet1.data.id;
  ctx.pet2 = pet2.data.id;
});

const booking = (extra) => ({ sitter_id: ctx.sitterId, pet_id: ctx.pet1, service: 'walking', ...extra });

test('a booking in the past is rejected', async () => {
  const res = await call('POST', '/api/bookings', ctx.owner.token, booking({ start_date: day(-1), end_date: day(-1) }));
  assert.equal(res.status, 400);
});

test('owner creates a booking with the service price', async () => {
  const res = await call('POST', '/api/bookings', ctx.owner.token,
    booking({ start_date: day(20), end_date: day(20), start_time: '10:00', end_time: '11:00' }));
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(Number(res.data.total_price), 2000);
  assert.equal(res.data.status, 'pending');
  ctx.main = res.data.id;
});

test('the same request twice is not duplicated', async () => {
  const res = await call('POST', '/api/bookings', ctx.owner.token,
    booking({ start_date: day(20), end_date: day(20), start_time: '10:00', end_time: '11:00' }));
  assert.equal(res.status, 409);
});

test('only the sitter can confirm, and an owner cannot', async () => {
  const byOwner = await call('PUT', `/api/bookings/${ctx.main}/status`, ctx.owner.token, { status: 'confirmed' });
  assert.ok(byOwner.status >= 400);
  const bySitter = await call('PUT', `/api/bookings/${ctx.main}/status`, ctx.sitter.token, { status: 'confirmed' });
  assert.equal(bySitter.status, 200, JSON.stringify(bySitter.data));
});

test('no double booking: the same sitter slot cannot be booked again', async () => {
  const res = await call('POST', '/api/bookings', ctx.owner.token,
    booking({ pet_id: ctx.pet2, start_date: day(20), end_date: day(20), start_time: '10:30', end_time: '11:30' }));
  assert.equal(res.status, 409);
});

test('payment: a bad card fails, the test card works once', async () => {
  const bad = await call('POST', `/api/bookings/${ctx.main}/pay`, ctx.owner.token, { payment: { ...TEST_CARD, card_number: '4242424242424241' } });
  assert.equal(bad.status, 400);
  const ok = await call('POST', `/api/bookings/${ctx.main}/pay`, ctx.owner.token, { payment: TEST_CARD });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.payment_status, 'paid');
  const again = await call('POST', `/api/bookings/${ctx.main}/pay`, ctx.owner.token, { payment: TEST_CARD });
  assert.ok(again.status >= 400);
});

test('reschedule: a paid booking keeps its length and goes back to the sitter', async () => {
  const longer = await call('POST', `/api/bookings/${ctx.main}/reschedule`, ctx.owner.token,
    { start_date: day(22), end_date: day(23), start_time: '10:00', end_time: '11:00' });
  assert.equal(longer.status, 400);
  const moved = await call('POST', `/api/bookings/${ctx.main}/reschedule`, ctx.owner.token,
    { start_date: day(22), end_date: day(22), start_time: '12:00', end_time: '13:00' });
  assert.equal(moved.status, 200, JSON.stringify(moved.data));
  assert.equal(moved.data.status, 'pending');
  assert.equal(moved.data.payment_status, 'paid');
  const reconfirm = await call('PUT', `/api/bookings/${ctx.main}/status`, ctx.sitter.token, { status: 'confirmed' });
  assert.equal(reconfirm.status, 200);
});

test('cancellation needs a reason and refunds 100% two or more days ahead', async () => {
  const noReason = await call('PUT', `/api/bookings/${ctx.main}/status`, ctx.owner.token, { status: 'cancelled' });
  assert.equal(noReason.status, 400);
  const preview = await call('GET', `/api/bookings/${ctx.main}/cancel-preview`, ctx.owner.token);
  assert.equal(preview.data.refund_percent, 100);
  const cancelled = await call('PUT', `/api/bookings/${ctx.main}/status`, ctx.owner.token, { status: 'cancelled', reason: 'plans_changed' });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.payment_status, 'refunded');
  assert.equal(Number(cancelled.data.refund_amount), 2000);
});

test('a review waits until the care period is over', async () => {
  const long = await call('POST', '/api/bookings', ctx.owner.token, booking({ service: 'boarding', start_date: day(0), end_date: day(2) }));
  assert.equal(long.status, 201, JSON.stringify(long.data));
  await call('PUT', `/api/bookings/${long.data.id}/status`, ctx.sitter.token, { status: 'confirmed' });
  const done = await call('PUT', `/api/bookings/${long.data.id}/status`, ctx.sitter.token, { status: 'completed' });
  assert.equal(done.status, 200, JSON.stringify(done.data));
  const early = await call('POST', '/api/reviews', ctx.owner.token,
    { booking_id: long.data.id, rating: 5, body: 'Пробуем оставить отзыв до окончания передержки.' });
  assert.equal(early.status, 400);
});

test('a finished booking can be reviewed once', async () => {
  const short = await call('POST', '/api/bookings', ctx.owner.token, booking({ pet_id: ctx.pet2, start_date: day(0), end_date: day(0) }));
  assert.equal(short.status, 201, JSON.stringify(short.data));
  await call('PUT', `/api/bookings/${short.data.id}/status`, ctx.sitter.token, { status: 'confirmed' });
  await call('PUT', `/api/bookings/${short.data.id}/status`, ctx.sitter.token, { status: 'completed' });
  const review = await call('POST', '/api/reviews', ctx.owner.token,
    { booking_id: short.data.id, rating: 5, body: 'Всё прошло отлично, ситтер прислал фото и отчёт.' });
  assert.equal(review.status, 201, JSON.stringify(review.data));
  const twice = await call('POST', '/api/reviews', ctx.owner.token,
    { booking_id: short.data.id, rating: 4, body: 'Второй отзыв на ту же бронь не должен пройти.' });
  assert.ok(twice.status >= 400);
});

test('header search finds the sitter by name and by service word', async () => {
  const byName = await call('GET', `/api/public/search?q=${encodeURIComponent(ctx.sitterName)}`);
  assert.ok(byName.data.sitters.some((s) => s.id === ctx.sitterId));
  const byService = await call('GET', `/api/public/search?q=${encodeURIComponent('передержка')}`);
  assert.ok(byService.data.sitters.length > 0);
});

test('a chat message can point at a booking, but only between its owner and sitter', async () => {
  const res = await call('POST', '/api/bookings', ctx.owner.token,
    booking({ start_date: day(40), end_date: day(40), start_time: '09:00', end_time: '10:00' }));
  assert.equal(res.status, 201);
  const msg = await call('POST', '/api/messages', ctx.owner.token,
    { receiver_id: ctx.sitter.user.id, body: 'Вопрос по этой брони', booking_id: res.data.id });
  assert.equal(msg.status, 201, JSON.stringify(msg.data));
  assert.equal(msg.data.booking_service, 'walking');
  const stranger = await call('POST', '/api/messages', ctx.owner.token,
    { receiver_id: ctx.admin.user.id, body: 'Чужая бронь', booking_id: res.data.id });
  assert.equal(stranger.status, 403);
});
