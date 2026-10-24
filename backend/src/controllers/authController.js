import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/User.js';

const sign = (user, remember) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: remember ? '30d' : '1d' });
const publicUser = ({ _id, name, email, role }) => ({ id: _id, name, email, role });
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ message: 'Name, email and a password of 8+ characters are required' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ message: 'Email already registered' });
  // Role is never read from the request, so signup always creates a farmer.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ message: 'Invalid email or password' });
  if (!user.isActive) return res.status(403).json({ message: 'Your account has been deactivated' });
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: sign(user, rememberMe), user: publicUser(user) });
}

export const me = (req, res) => res.json({ user: publicUser(req.user) });

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hash(token);
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    console.log(`[DEV] Reset link: ${process.env.CLIENT_URL}/reset-password/${token}`);
  }
  res.json({ message: 'If that email exists, a reset link has been sent' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8)
    return res.status(400).json({ message: 'Token and a password of 8+ characters are required' });
  const user = await User.findOne({ resetTokenHash: hash(token), resetTokenExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Reset link is invalid or expired' });
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated' });
}