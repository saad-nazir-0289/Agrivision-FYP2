import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Aoi from '../src/models/Aoi.js';

process.env.NODE_ENV = 'test'; // turns the rate limiter off
const TEST_DB = 'mongodb://127.0.0.1:27017/agrivision_test_aoi';
const PASSWORD = 'password123';

let server, base, adminToken, farmerToken, otherToken, adminId, farmerId, otherId, aoiId, fakeId;

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

const square = (lng, lat, size = 0.01) => ({
  type: 'Polygon',
  coordinates: [[[lng, lat], [lng + size, lat], [lng + size, lat + size], [lng, lat + size], [lng, lat]]],
});

before(async () => {
  await mongoose.connect(TEST_DB);
  await Promise.all([User.deleteMany({}), Aoi.deleteMany({})]);
  await Aoi.init(); // make sure the unique index exists before the tests run
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = await User.create([
    { name: 'Admin', email: 'admin@test.com', role: 'admin', passwordHash },
    { name: 'Farmer', email: 'farmer@test.com', passwordHash },
    { name: 'Other Farmer', email: 'other@test.com', passwordHash },
  ]);
  [adminId, farmerId, otherId] = users.map((u) => u.id);
  adminToken = await login('admin@test.com');
  farmerToken = await login('farmer@test.com');
  otherToken = await login('other@test.com');
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

describe('Create AOI', () => {
  it('lets an admin create an AOI and calculates the area', async () => {
    const { status, data } = await call('POST', '/api/aois', { name: 'North Block', geometry: square(74.3, 31.5), assignedUsers: [farmerId] }, adminToken);
    assert.equal(status, 201);
    assert.equal(data.aoi.assignedUsers.length, 1);
    assert.equal(data.aoi.name, 'North Block');
    assert.ok(data.aoi.areaHa > 104 && data.aoi.areaHa < 108);
    aoiId = data.aoi._id;
  });

  it('ignores an area sent by the client', async () => {
    const { data } = await call('POST', '/api/aois', { name: 'Fake Area', geometry: square(74.5, 31.5), areaHa: 1 }, adminToken);
    assert.ok(data.aoi.areaHa > 104);
    fakeId = data.aoi._id;
  });

  it('rejects assigning an AOI to a non-farmer or a bad id', async () => {
    const body = { name: 'Bad Users', geometry: square(75.0, 31.5) };
    for (const assignedUsers of [[adminId], ['abc'], 'nope']) {
      assert.equal((await call('POST', '/api/aois', { ...body, assignedUsers }, adminToken)).status, 400);
    }
  });

  it('rejects a duplicate name', async () => {
    const { status } = await call('POST', '/api/aois', { name: 'North Block', geometry: square(74.6, 31.5) }, adminToken);
    assert.equal(status, 409);
  });

  it('rejects a missing name', async () => {
    const { status } = await call('POST', '/api/aois', { geometry: square(74.7, 31.5) }, adminToken);
    assert.equal(status, 400);
  });

  it('rejects a polygon outside Pakistan', async () => {
    const { status, data } = await call('POST', '/api/aois', { name: 'Abroad', geometry: square(10, 10) }, adminToken);
    assert.equal(status, 400);
    assert.match(data.message, /Pakistan/);
  });

  it('rejects an open ring and a polygon with fewer than 3 points', async () => {
    const open = { type: 'Polygon', coordinates: [square(74.8, 31.5).coordinates[0].slice(0, 4)] };
    assert.equal((await call('POST', '/api/aois', { name: 'Open', geometry: open }, adminToken)).status, 400);
    const two = { type: 'Polygon', coordinates: [[[74.8, 31.5], [74.81, 31.5], [74.8, 31.5]]] };
    assert.equal((await call('POST', '/api/aois', { name: 'Two', geometry: two }, adminToken)).status, 400);
  });

  it('does not let a farmer create an AOI', async () => {
    const { status } = await call('POST', '/api/aois', { name: 'Nope', geometry: square(74.9, 31.5) }, farmerToken);
    assert.equal(status, 403);
  });
});

describe('List AOIs', () => {
  it('requires login', async () => {
    assert.equal((await call('GET', '/api/aois')).status, 401);
  });

  it('shows a farmer only their own AOIs, without assignment details', async () => {
    const { status, data } = await call('GET', '/api/aois', undefined, farmerToken);
    assert.equal(status, 200);
    assert.deepEqual(data.aois.map((a) => a.name), ['North Block']);
    assert.equal(data.aois[0].assignedUsers, undefined);
  });

  it('shows a farmer with no assigned AOI an empty list', async () => {
    const { data } = await call('GET', '/api/aois', undefined, otherToken);
    assert.deepEqual(data.aois, []);
  });

  it('shows an admin every AOI with the names of assigned users', async () => {
    const { data } = await call('GET', '/api/aois', undefined, adminToken);
    assert.deepEqual(data.aois.map((a) => a.name), ['Fake Area', 'North Block']);
    assert.equal(data.aois[1].assignedUsers[0].name, 'Farmer');
  });
});

describe('Assign AOI to users', () => {
  const url = () => `/api/aois/${fakeId}/users`;

  it('does not let a farmer change assignments', async () => {
    assert.equal((await call('PATCH', url(), { assignedUsers: [otherId] }, farmerToken)).status, 403);
  });

  it('lets an admin assign an AOI, and that farmer then sees it', async () => {
    const { status, data } = await call('PATCH', url(), { assignedUsers: [otherId] }, adminToken);
    assert.equal(status, 200);
    assert.equal(data.aoi.assignedUsers[0].name, 'Other Farmer');
    const list = await call('GET', '/api/aois', undefined, otherToken);
    assert.deepEqual(list.data.aois.map((a) => a.name), ['Fake Area']);
  });

  it('removes access when the AOI is unassigned', async () => {
    await call('PATCH', url(), { assignedUsers: [] }, adminToken);
    const list = await call('GET', '/api/aois', undefined, otherToken);
    assert.deepEqual(list.data.aois, []);
  });

  it('rejects a bad list, a non-farmer and an unknown AOI', async () => {
    assert.equal((await call('PATCH', url(), { assignedUsers: 'x' }, adminToken)).status, 400);
    assert.equal((await call('PATCH', url(), { assignedUsers: [adminId] }, adminToken)).status, 400);
    const unknown = `/api/aois/${new mongoose.Types.ObjectId()}/users`;
    assert.equal((await call('PATCH', unknown, { assignedUsers: [] }, adminToken)).status, 404);
    assert.equal((await call('PATCH', '/api/aois/abc/users', { assignedUsers: [] }, adminToken)).status, 404);
  });
});

describe('Delete AOI', () => {
  it('does not let a farmer delete an AOI', async () => {
    assert.equal((await call('DELETE', `/api/aois/${aoiId}`, undefined, farmerToken)).status, 403);
  });

  it('lets an admin delete an AOI, then returns 404', async () => {
    assert.equal((await call('DELETE', `/api/aois/${aoiId}`, undefined, adminToken)).status, 200);
    assert.equal((await call('DELETE', `/api/aois/${aoiId}`, undefined, adminToken)).status, 404);
  });

  it('returns 404 for an invalid id', async () => {
    assert.equal((await call('DELETE', '/api/aois/abc', undefined, adminToken)).status, 404);
  });
});