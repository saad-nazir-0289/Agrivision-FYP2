import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';

process.env.NODE_ENV = 'test'; // turns the rate limiter off
const TEST_DB = 'mongodb://127.0.0.1:27017/agrivision_test_admin';
const PASSWORD = 'password123';

let server, base;
let adminToken, aliceToken, adminId, bobId;

// Small helper: send a request to the test server and return { status, data }.
async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const login = async (email) =>
  (await call('POST', '/api/auth/login', { email, password: PASSWORD })).data.token;

before(async () => {
  await mongoose.connect(TEST_DB);
  await User.deleteMany({});
  server = app.listen(0); // port 0 = pick any free port
  base = `http://127.0.0.1:${server.address().port}`;

  // Three starting users: one admin and two farmers.
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [admin, , bob] = await User.create([
    { name: 'Admin One', email: 'admin@test.com', role: 'admin', passwordHash },
    { name: 'Alice Farmer', email: 'alice@test.com', passwordHash },
    { name: 'Bob Grower', email: 'bob@test.com', passwordHash },
  ]);
  adminId = admin.id;
  bobId = bob.id;
  adminToken = await login('admin@test.com');
  aliceToken = await login('alice@test.com');
});

after(async () => {
  await mongoose.connection.dropDatabase(); // clean up the test database
  await mongoose.disconnect();
  server.close();
});

describe('Access control', () => {
  it('rejects requests with no token', async () => {
    const { status } = await call('GET', '/api/admin/users');
    assert.equal(status, 401);
  });

  it('rejects a farmer', async () => {
    const { status } = await call('GET', '/api/admin/users', undefined, aliceToken);
    assert.equal(status, 403);
  });
});

describe('List users', () => {
  it('returns every user without sensitive fields', async () => {
    const { status, data } = await call('GET', '/api/admin/users', undefined, adminToken);
    assert.equal(status, 200);
    assert.equal(data.users.length, 3);
    for (const u of data.users) {
      assert.equal(u.passwordHash, undefined);
      assert.equal(u.resetTokenHash, undefined);
    }
  });

  it('searches by name and by email', async () => {
    const byName = await call('GET', '/api/admin/users?search=alice', undefined, adminToken);
    assert.equal(byName.data.users.length, 1);
    const byEmail = await call('GET', '/api/admin/users?search=BOB@test', undefined, adminToken);
    assert.equal(byEmail.data.users[0].name, 'Bob Grower');
  });

  it('treats special characters in search as plain text', async () => {
    const { status, data } = await call('GET', `/api/admin/users?search=${encodeURIComponent('a.b(')}`, undefined, adminToken);
    assert.equal(status, 200);
    assert.equal(data.users.length, 0);
  });

  it('filters by status', async () => {
    const { data } = await call('GET', '/api/admin/users?status=active', undefined, adminToken);
    assert.equal(data.users.length, 3);
  });
});

describe('Activate and deactivate', () => {
  it('deactivates a user, who then cannot log in', async () => {
    const { status, data } = await call('PATCH', `/api/admin/users/${bobId}/status`, { isActive: false }, adminToken);
    assert.equal(status, 200);
    assert.equal(data.user.isActive, false);

    const attempt = await call('POST', '/api/auth/login', { email: 'bob@test.com', password: PASSWORD });
    assert.equal(attempt.status, 403);

    const inactive = await call('GET', '/api/admin/users?status=inactive', undefined, adminToken);
    assert.equal(inactive.data.users.length, 1);
  });

  it('reactivates a user, who can log in again', async () => {
    const { status } = await call('PATCH', `/api/admin/users/${bobId}/status`, { isActive: true }, adminToken);
    assert.equal(status, 200);
    const attempt = await call('POST', '/api/auth/login', { email: 'bob@test.com', password: PASSWORD });
    assert.equal(attempt.status, 200);
  });

  it('stops an admin deactivating their own account', async () => {
    const { status } = await call('PATCH', `/api/admin/users/${adminId}/status`, { isActive: false }, adminToken);
    assert.equal(status, 400);
    assert.equal((await User.findById(adminId)).isActive, true);
  });

  it('returns 404 for a bad or unknown id', async () => {
    const bad = await call('PATCH', '/api/admin/users/abc/status', { isActive: false }, adminToken);
    assert.equal(bad.status, 404);
    const unknown = await call('PATCH', `/api/admin/users/${new mongoose.Types.ObjectId()}/status`, { isActive: false }, adminToken);
    assert.equal(unknown.status, 404);
  });

  it('returns 400 when isActive is not true or false', async () => {
    const { status } = await call('PATCH', `/api/admin/users/${bobId}/status`, { isActive: 'no' }, adminToken);
    assert.equal(status, 400);
  });

  it('does not let a farmer change anyone\'s status', async () => {
    const { status } = await call('PATCH', `/api/admin/users/${bobId}/status`, { isActive: false }, aliceToken);
    assert.equal(status, 403);
  });
});

describe('Add admin', () => {
  it('creates an admin who can log in and use admin routes', async () => {
    const { status, data } = await call('POST', '/api/admin/users',
      { name: 'Second Admin', email: 'admin2@test.com', password: PASSWORD }, adminToken);
    assert.equal(status, 201);
    assert.equal(data.user.role, 'admin');
    assert.equal(data.user.passwordHash, undefined);

    const token = await login('admin2@test.com');
    const list = await call('GET', '/api/admin/users', undefined, token);
    assert.equal(list.status, 200);
  });

  it('rejects a duplicate email', async () => {
    const { status } = await call('POST', '/api/admin/users',
      { name: 'Dup', email: 'ADMIN2@test.com', password: PASSWORD }, adminToken);
    assert.equal(status, 409);
  });

  it('rejects a short password or missing fields', async () => {
    const short = await call('POST', '/api/admin/users', { name: 'X', email: 'x@test.com', password: '123' }, adminToken);
    assert.equal(short.status, 400);
    const missing = await call('POST', '/api/admin/users', { email: 'y@test.com' }, adminToken);
    assert.equal(missing.status, 400);
  });

  it('does not let a farmer create an admin', async () => {
    const { status } = await call('POST', '/api/admin/users',
      { name: 'Evil', email: 'evil@test.com', password: PASSWORD }, aliceToken);
    assert.equal(status, 403);
  });
});