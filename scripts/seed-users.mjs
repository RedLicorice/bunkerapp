#!/usr/bin/env node
// Seeds owner + customer test users via Supabase Admin API.
// If user already exists, updates password to testuser123.
// Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-users.mjs

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
};

const users = [
  {
    email: 'owner@test.com',
    password: 'testuser123',
    email_confirm: true,
    user_metadata: { full_name: 'Test Owner', role: 'owner' },
  },
  {
    email: 'customer@test.com',
    password: 'testuser123',
    email_confirm: true,
    user_metadata: { full_name: 'Test Customer', role: 'customer' },
  },
];

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
  const data = await res.json();
  return data.users ?? [];
}

const existing = await listUsers();

for (const user of users) {
  const found = existing.find(u => u.email === user.email);
  if (found) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: user.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed to update ${user.email}:`, data.message ?? data);
    } else {
      console.log(`Updated password for ${user.email} — id: ${found.id}`);
    }
  } else {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed to create ${user.email}:`, data.message ?? data);
    } else {
      console.log(`Created ${user.email} (${user.user_metadata.role}) — id: ${data.id}`);
    }
  }
}
