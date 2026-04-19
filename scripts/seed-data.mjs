#!/usr/bin/env node
// Seeds sample gym data: courses, lessons, enrollments, bookings, notifications.
// Idempotent — deletes existing test data then re-inserts.
// Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-data.mjs

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://ezqdmjijhgrmmofmyqho.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
  Prefer: 'return=representation',
};

const api = SUPABASE_URL + '/rest/v1';

async function q(method, table, body, params = '') {
  const res = await fetch(`${api}/${table}${params}`, {
    method,
    headers: { ...headers, Prefer: method === 'POST' ? 'return=representation' : headers.Prefer },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${table}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Resolve test user IDs ──────────────────────────────────────────────────
const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
const { users } = await adminRes.json();

const ownerAuth  = users.find(u => u.email === 'owner@test.com');
const customerAuth = users.find(u => u.email === 'customer@test.com');

if (!ownerAuth || !customerAuth) {
  console.error('Test users not found — run seed-users.mjs first');
  process.exit(1);
}

const OWNER_ID    = ownerAuth.id;
const CUSTOMER_ID = customerAuth.id;
console.log(`Owner:    ${OWNER_ID}`);
console.log(`Customer: ${CUSTOMER_ID}`);

// ── Cleanup existing seed data (FK order) ────────────────────────────────
console.log('\nCleaning up old seed data...');
await q('DELETE', 'swap_requests', null, `?user_id=eq.${CUSTOMER_ID}`);
await q('DELETE', 'bookings',      null, `?user_id=eq.${CUSTOMER_ID}`);
await q('DELETE', 'enrollments',   null, `?user_id=eq.${CUSTOMER_ID}`);
await q('DELETE', 'notifications', null, `?recipient_id=eq.${CUSTOMER_ID}`);
const existingCourses = await q('GET', 'courses', null, `?owner_id=eq.${OWNER_ID}&select=id`) ?? [];
if (existingCourses.length) {
  const ids = existingCourses.map(c => c.id).join(',');
  await q('DELETE', 'lessons', null, `?course_id=in.(${ids})`);
}
await q('DELETE', 'courses', null, `?owner_id=eq.${OWNER_ID}`);

// ── Courses ───────────────────────────────────────────────────────────────
console.log('\nSeeding courses...');
const [crossfit, yoga, boxing] = await q('POST', 'courses', [
  { owner_id: OWNER_ID, name: 'CrossFit', description: 'High-intensity functional training for all levels.', color: '#f97316', is_active: true },
  { owner_id: OWNER_ID, name: 'Yoga',     description: 'Flow, breathe, and restore. All levels welcome.',  color: '#8b5cf6', is_active: true },
  { owner_id: OWNER_ID, name: 'Boxing',   description: 'Technical boxing fundamentals and conditioning.',  color: '#ef4444', is_active: true },
]);
console.log(`  CrossFit: ${crossfit.id}`);
console.log(`  Yoga:     ${yoga.id}`);
console.log(`  Boxing:   ${boxing.id}`);

// ── Lessons ───────────────────────────────────────────────────────────────
console.log('\nSeeding lessons...');
const lessons = await q('POST', 'lessons', [
  // CrossFit — Mon/Wed/Fri 07:00
  { course_id: crossfit.id, day_of_week: 1, start_time: '07:00', duration_minutes: 60, instructor_name: 'Marco Rossi',   location: 'Box A', capacity: 15 },
  { course_id: crossfit.id, day_of_week: 3, start_time: '07:00', duration_minutes: 60, instructor_name: 'Marco Rossi',   location: 'Box A', capacity: 15 },
  { course_id: crossfit.id, day_of_week: 5, start_time: '07:00', duration_minutes: 60, instructor_name: 'Marco Rossi',   location: 'Box A', capacity: 15 },
  // Yoga — Tue/Thu 09:00, Sat 10:00
  { course_id: yoga.id,     day_of_week: 2, start_time: '09:00', duration_minutes: 90, instructor_name: 'Sara Bianchi',  location: 'Studio 1', capacity: 20 },
  { course_id: yoga.id,     day_of_week: 4, start_time: '09:00', duration_minutes: 90, instructor_name: 'Sara Bianchi',  location: 'Studio 1', capacity: 20 },
  { course_id: yoga.id,     day_of_week: 6, start_time: '10:00', duration_minutes: 90, instructor_name: 'Sara Bianchi',  location: 'Studio 1', capacity: 20 },
  // Boxing — Mon/Wed 18:00
  { course_id: boxing.id,   day_of_week: 1, start_time: '18:00', duration_minutes: 60, instructor_name: 'Luca Ferrari', location: 'Ring', capacity: 12 },
  { course_id: boxing.id,   day_of_week: 3, start_time: '18:00', duration_minutes: 60, instructor_name: 'Luca Ferrari', location: 'Ring', capacity: 12 },
]);
console.log(`  ${lessons.length} lessons created`);

// ── Enrollments ───────────────────────────────────────────────────────────
console.log('\nSeeding enrollments...');
await q('POST', 'enrollments', [
  { user_id: CUSTOMER_ID, course_id: crossfit.id },
  { user_id: CUSTOMER_ID, course_id: yoga.id },
]);
console.log('  Customer enrolled in CrossFit + Yoga');

// ── Bookings ──────────────────────────────────────────────────────────────
// today = 2026-04-19 (Sun).
// CrossFit lessons: Mon(1), Wed(3), Fri(5)
// Yoga lessons:     Tue(2), Thu(4), Sat(6)
// Build 4 weeks of bookings: 2 past, 2 future
console.log('\nSeeding bookings...');

function nextWeekday(fromDate, targetDay) {
  const d = new Date(fromDate);
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
function prevWeekday(fromDate, targetDay) {
  const d = new Date(fromDate);
  const diff = (d.getDay() - targetDay + 7) % 7 || 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
}

const today = '2026-04-19';

// lesson lookup by course + day
const cfMon = lessons.find(l => l.course_id === crossfit.id && l.day_of_week === 1);
const cfWed = lessons.find(l => l.course_id === crossfit.id && l.day_of_week === 3);
const cfFri = lessons.find(l => l.course_id === crossfit.id && l.day_of_week === 5);
const ygTue = lessons.find(l => l.course_id === yoga.id     && l.day_of_week === 2);
const ygThu = lessons.find(l => l.course_id === yoga.id     && l.day_of_week === 4);
const ygSat = lessons.find(l => l.course_id === yoga.id     && l.day_of_week === 6);

const bookings = await q('POST', 'bookings', [
  // Past — completed
  { user_id: CUSTOMER_ID, lesson_id: cfMon.id, date: prevWeekday(today, 1), status: 'completed' },
  { user_id: CUSTOMER_ID, lesson_id: cfWed.id, date: prevWeekday(today, 3), status: 'completed' },
  { user_id: CUSTOMER_ID, lesson_id: ygTue.id, date: prevWeekday(today, 2), status: 'completed' },
  { user_id: CUSTOMER_ID, lesson_id: ygThu.id, date: prevWeekday(today, 4), status: 'completed' },
  // Upcoming — active
  { user_id: CUSTOMER_ID, lesson_id: cfMon.id, date: nextWeekday(today, 1), status: 'active' },
  { user_id: CUSTOMER_ID, lesson_id: cfWed.id, date: nextWeekday(today, 3), status: 'active' },
  { user_id: CUSTOMER_ID, lesson_id: cfFri.id, date: nextWeekday(today, 5), status: 'active' },
  { user_id: CUSTOMER_ID, lesson_id: ygTue.id, date: nextWeekday(today, 2), status: 'active' },
  { user_id: CUSTOMER_ID, lesson_id: ygSat.id, date: nextWeekday(today, 6), status: 'active' },
]);
console.log(`  ${bookings.length} bookings created`);

// ── Swap request ──────────────────────────────────────────────────────────
console.log('\nSeeding swap request...');
const upcomingCf = bookings.find(b => b.lesson_id === cfMon.id && b.status === 'active');
await q('POST', 'swap_requests', [{
  user_id: CUSTOMER_ID,
  original_booking_id: upcomingCf.id,
  requested_lesson_id: cfWed.id,
  requested_date: nextWeekday(today, 3),
  status: 'pending',
}]);
console.log('  1 pending swap request created');

// ── Notifications ─────────────────────────────────────────────────────────
console.log('\nSeeding notifications...');
await q('POST', 'notifications', [
  {
    sender_id: OWNER_ID,
    recipient_id: CUSTOMER_ID,
    title: 'Welcome to Bunker!',
    body: 'Your account is ready. Browse courses and book your first class.',
    type: 'manual',
  },
  {
    sender_id: OWNER_ID,
    recipient_id: null,
    title: 'Holiday closure',
    body: 'The gym will be closed on 1 May. All bookings on that day are cancelled.',
    type: 'broadcast',
  },
]);
console.log('  2 notifications created');

console.log('\nDone.');
