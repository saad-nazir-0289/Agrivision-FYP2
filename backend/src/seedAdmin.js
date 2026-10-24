import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';

await connectDB(process.env.MONGO_URI);
const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;

if (await User.findOne({ email })) {
  console.log('Admin already exists');
} else {
  await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
  console.log(`Admin created: ${email}`);
}
await mongoose.disconnect();