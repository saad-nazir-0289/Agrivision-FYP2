import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Aoi from '../src/models/Aoi.js';
import NdviResult from '../src/models/NdviResult.js';
import { removeAoiFolder } from '../src/services/ndviStore.js';

process.env.NODE_ENV = 'test'; // turns the rate limiter off
const TEST_DB = 'mongodb://127.0.0.1:27017/agrivision_test_ndvi';
const PASSWORD = 'password123';
const DAY = '2025-05-18';

let server, base, adminToken, farmerToken, otherToken, aoi, resultId;

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
const calculate = (token, body) => call('POST', '/api/ndvi/calculate', body, token);

before(async () => {
  await mongoose.connect(TEST_DB);
  await Promise.all([User.deleteMany({}), Aoi.deleteMany({}), NdviResult.deleteMany({})]);
  await NdviResult.init(); // make sure the unique index exists before the tests run
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [admin, farmer] = await User.create([
    { name: 'Admin', email: 'admin@test.com', role: 'admin', passwordHash },
    { name: 'Farmer', email: 'farmer@test.com', passwordHash },
    { name: 'Other Farmer', email: 'other@test.com', passwordHash },
  ]);
  // A small AOI near Lahore, assigned to the first farmer only.
  aoi = await Aoi.create({
    name: 'Test Field',
    geometry: { type: 'Polygon', coordinates: [[[74.3, 31.5], [74.31, 31.5], [74.31, 31.51], [74.3, 31.51], [74.3, 31.5]]] },
    areaHa: 105.7,
    assignedUsers: [farmer._id],
    createdBy: admin._id,
  });
  adminToken = await login('admin@test.com');
  farmerToken = await login('farmer@test.com');
  otherToken = await login('other@test.com');
});

after(async () => {
  await removeAoiFolder(aoi._id); // delete the pixel files this test wrote
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

describe('Calculate NDVI', () => {
  it('requires login', async () => {
    assert.equal((await calculate(undefined, { aoiId: aoi.id, date: DAY })).status, 401);
  });

  it('gives an assigned farmer an average, a pixel grid and no file path', async () => {
    const { status, data } = await calculate(farmerToken, { aoiId: aoi.id, date: DAY });
    assert.equal(status, 200);
    assert.ok(data.result.avgNdvi >= -1 && data.result.avgNdvi <= 1);
    assert.equal(data.result.source, 'mock');
    assert.equal(data.result.file, undefined);
    assert.equal(data.pixels.length, data.result.rows);
    assert.equal(data.pixels[0].length, data.result.cols);
    resultId = data.result.id;
  });

  it('returns the saved result for the same AOI and date instead of making a second one', async () => {
    const first = await calculate(farmerToken, { aoiId: aoi.id, date: DAY });
    assert.equal(first.data.result.id, resultId);
    assert.equal(await NdviResult.countDocuments({ aoi: aoi._id, date: DAY }), 1);
  });

  it('lets an admin calculate for any AOI', async () => {
    assert.equal((await calculate(adminToken, { aoiId: aoi.id, date: '2025-05-19' })).status, 200);
  });

  it('hides an AOI that is not assigned to the farmer', async () => {
    assert.equal((await calculate(otherToken, { aoiId: aoi.id, date: DAY })).status, 404);
  });

  it('rejects an unknown or invalid AOI id', async () => {
    assert.equal((await calculate(farmerToken, { aoiId: new mongoose.Types.ObjectId(), date: DAY })).status, 404);
    assert.equal((await calculate(farmerToken, { aoiId: 'abc', date: DAY })).status, 404);
    assert.equal((await calculate(farmerToken, { date: DAY })).status, 404);
  });

  it('rejects a bad, impossible or future date', async () => {
    for (const date of [undefined, 'yesterday', '2025-02-30', '18-05-2025', '2999-01-01']) {
      assert.equal((await calculate(farmerToken, { aoiId: aoi.id, date })).status, 400, `date ${date}`);
    }
  });

  it('accepts today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal((await calculate(farmerToken, { aoiId: aoi.id, date: today })).status, 200);
  });
});

describe('Re-open a result', () => {
  it('returns the same pixels to the farmer', async () => {
    const { status, data } = await call('GET', `/api/ndvi/${resultId}`, undefined, farmerToken);
    assert.equal(status, 200);
    assert.equal(data.result.date, DAY);
    assert.ok(Array.isArray(data.pixels));
  });

  it('hides the result from another farmer and from a bad id', async () => {
    assert.equal((await call('GET', `/api/ndvi/${resultId}`, undefined, otherToken)).status, 404);
    assert.equal((await call('GET', '/api/ndvi/abc', undefined, farmerToken)).status, 404);
  });
});

describe('NDVI history', () => {
  before(async () => {
    for (const date of ['2025-05-10', '2025-05-12', '2025-05-14']) await calculate(farmerToken, { aoiId: aoi.id, date });
  });

  it('lists saved results oldest first, without pixels', async () => {
    const { status, data } = await call('GET', `/api/ndvi?aoiId=${aoi.id}`, undefined, farmerToken);
    assert.equal(status, 200);
    const dates = data.results.map((r) => r.date);
    assert.deepEqual(dates, [...dates].sort());
    assert.ok(dates.includes('2025-05-10') && dates.includes(DAY));
    assert.equal(data.results[0].pixels, undefined);
  });

  it('filters by date range', async () => {
    const { data } = await call('GET', `/api/ndvi?aoiId=${aoi.id}&from=2025-05-11&to=2025-05-14`, undefined, farmerToken);
    assert.deepEqual(data.results.map((r) => r.date), ['2025-05-12', '2025-05-14']);
  });

  it('rejects a bad range and hides an AOI that is not assigned', async () => {
    assert.equal((await call('GET', `/api/ndvi?aoiId=${aoi.id}&from=nope`, undefined, farmerToken)).status, 400);
    assert.equal((await call('GET', `/api/ndvi?aoiId=${aoi.id}`, undefined, otherToken)).status, 404);
  });
});

describe('Deleting an AOI', () => {
  it('removes its NDVI results', async () => {
    assert.ok((await NdviResult.countDocuments({ aoi: aoi._id })) > 0);
    assert.equal((await call('DELETE', `/api/aois/${aoi.id}`, undefined, adminToken)).status, 200);
    assert.equal(await NdviResult.countDocuments({ aoi: aoi._id }), 0);
  });
});