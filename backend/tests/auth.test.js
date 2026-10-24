import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';

process.env.NODE_ENV = 'test';
const TEST_DB = 'mongodb://127.0.0.1:27017/agrivision_test';
const A = '/api/auth';
const farmer = { name: 'Test Farmer', email: 'farmer@test.com', password: 'password123' };

let server, base, farmerToken;

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// The dev reset link is only printed to the console, so capture it from there.
async function getResetToken(email) {
  const original = console.log;
  let logged = '';
  console.log = (...args) => { logged += args.join(' '); };
  try { await call('POST', `${A}/forgot-password`, { email }); }
  finally { console.log = original; }
  return logged.match(/reset-password\/(\w+)/)?.[1];
}

const days = (token) => { const { exp, iat } = jwt.decode(token); return (exp - iat) / 86400; };

before(async () => {
  await mongoose.connect(TEST_DB);
  await User.deleteMany({});
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

describe('Health', () => {
  it('reports the database as connected', async () => {
    const { status, data } = await call('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(data.db, 'connected');
  });
});

describe('Signup', () => {
  it('creates a farmer and returns a token', async () => {
    const { status, data } = await call('POST', `${A}/register`, farmer);
    assert.equal(status, 201);
    assert.ok(data.token);
    assert.equal(data.user.role, 'farmer');
  });

  it('stores a hashed password, not plain text', async () => {
    const user = await User.findOne({ email: farmer.email });
    assert.notEqual(user.passwordHash, farmer.password);
    assert.ok(user.passwordHash.startsWith('$2'));
  });

  it('rejects a duplicate email', async () => {
    const { status, data } = await call('POST', `${A}/register`, farmer);
    assert.equal(status, 409);
    assert.match(data.message, /already registered/);
  });

  it('ignores a role sent in the request body', async () => {
    const { status, data } = await call('POST', `${A}/register`, {
      name: 'Sneaky', email: 'sneaky@test.com', password: 'password123', role: 'admin',
    });
    assert.equal(status, 201);
    assert.equal(data.user.role, 'farmer');
    assert.equal((await User.findOne({ email: 'sneaky@test.com' })).role, 'farmer');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const { status } = await call('POST', `${A}/register`, { name: 'Short', email: 'short@test.com', password: '123' });
    assert.equal(status, 400);
  });

  it('rejects missing fields', async () => {
    const { status } = await call('POST', `${A}/register`, { email: 'nobody@test.com' });
    assert.equal(status, 400);
  });
});

describe('Login', () => {
  it('logs in with the correct password', async () => {
    const { status, data } = await call('POST', `${A}/login`, { email: farmer.email, password: farmer.password });
    assert.equal(status, 200);
    assert.ok(data.token);
    farmerToken = data.token;
  });

  it('treats the email as case-insensitive', async () => {
    const { status } = await call('POST', `${A}/login`, { email: 'FARMER@Test.com', password: farmer.password });
    assert.equal(status, 200);
  });

  it('rejects a wrong password', async () => {
    const { status, data } = await call('POST', `${A}/login`, { email: farmer.email, password: 'wrong' });
    assert.equal(status, 401);
    assert.equal(data.message, 'Invalid email or password');
  });

  it('gives the same error for an unknown email', async () => {
    const { status, data } = await call('POST', `${A}/login`, { email: 'ghost@test.com', password: 'password123' });
    assert.equal(status, 401);
    assert.equal(data.message, 'Invalid email or password');
  });

  it('gives a 30-day token with Remember me and 1 day without', async () => {
    const creds = { email: farmer.email, password: farmer.password };
    const long = await call('POST', `${A}/login`, { ...creds, rememberMe: true });
    const short = await call('POST', `${A}/login`, creds);
    assert.equal(days(long.data.token), 30);
    assert.equal(days(short.data.token), 1);
  });

  it('logs in a seeded-style admin with the admin role', async () => {
    await User.create({
      name: 'Admin', email: 'admin@test.com', role: 'admin',
      passwordHash: await bcrypt.hash('adminpass123', 10),
    });
    const { status, data } = await call('POST', `${A}/login`, { email: 'admin@test.com', password: 'adminpass123' });
    assert.equal(status, 200);
    assert.equal(data.user.role, 'admin');
  });
});

describe('Current user (/me)', () => {
  it('returns the user for a valid token', async () => {
    const { status, data } = await call('GET', `${A}/me`, undefined, farmerToken);
    assert.equal(status, 200);
    assert.equal(data.user.email, farmer.email);
  });

  it('rejects a missing token', async () => {
    const { status } = await call('GET', `${A}/me`);
    assert.equal(status, 401);
  });

  it('rejects an invalid token', async () => {
    const { status } = await call('GET', `${A}/me`, undefined, 'not-a-real-token');
    assert.equal(status, 401);
  });
});

describe('Deactivated accounts', () => {
  it('blocks login for a deactivated user', async () => {
    await User.updateOne({ email: farmer.email }, { isActive: false });
    const { status, data } = await call('POST', `${A}/login`, { email: farmer.email, password: farmer.password });
    assert.equal(status, 403);
    assert.match(data.message, /deactivated/);
  });

  it('stops an existing token from working, then works again after reactivation', async () => {
    const blocked = await call('GET', `${A}/me`, undefined, farmerToken);
    assert.equal(blocked.status, 401);
    await User.updateOne({ email: farmer.email }, { isActive: true });
    const allowed = await call('GET', `${A}/me`, undefined, farmerToken);
    assert.equal(allowed.status, 200);
  });
});

describe('Forgot and reset password', () => {
  it('gives the same response for known and unknown emails', async () => {
    const known = await call('POST', `${A}/forgot-password`, { email: farmer.email });
    const unknown = await call('POST', `${A}/forgot-password`, { email: 'ghost@test.com' });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(known.data.message, unknown.data.message);
  });

  it('changes the password with a valid token', async () => {
    const token = await getResetToken(farmer.email);
    assert.ok(token, 'reset link was not printed');
    const reset = await call('POST', `${A}/reset-password`, { token, password: 'newpassword123' });
    assert.equal(reset.status, 200);
    const fresh = await call('POST', `${A}/login`, { email: farmer.email, password: 'newpassword123' });
    assert.equal(fresh.status, 200);
    const old = await call('POST', `${A}/login`, { email: farmer.email, password: farmer.password });
    assert.equal(old.status, 401);
  });

  it('does not let a reset token be used twice', async () => {
    const token = await getResetToken(farmer.email);
    await call('POST', `${A}/reset-password`, { token, password: 'secondpass123' });
    const again = await call('POST', `${A}/reset-password`, { token, password: 'thirdpass123' });
    assert.equal(again.status, 400);
  });

  it('rejects an expired reset token', async () => {
    const token = await getResetToken(farmer.email);
    await User.updateOne({ email: farmer.email }, { resetTokenExpires: new Date(Date.now() - 1000) });
    const { status } = await call('POST', `${A}/reset-password`, { token, password: 'expiredpass123' });
    assert.equal(status, 400);
  });

  it('rejects a short new password', async () => {
    const token = await getResetToken(farmer.email);
    const { status } = await call('POST', `${A}/reset-password`, { token, password: '123' });
    assert.equal(status, 400);
  });
});