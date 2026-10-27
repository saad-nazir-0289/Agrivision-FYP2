import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Fields that must never be sent to the browser.
const SAFE_FIELDS = '-passwordHash -resetTokenHash -resetTokenExpires';

// True only for a non-empty string. Stops objects/arrays sneaking in through JSON.
const isText = (value) => typeof value === 'string' && value.trim() !== '';

// Escape characters with special meaning in regular expressions, so a search
// such as "a.b(" is treated as plain text instead of crashing or matching everything.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * GET /api/admin/users?search=ali&status=active
 * Lists users, newest first. Both query parameters are optional.
 */
export async function listUsers(req, res) {
  const { search, status } = req.query;
  const filter = {};

  // Search matches part of the name OR the email, ignoring upper/lower case ('i').
  if (isText(search)) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  // Any other value (such as "all") means "do not filter by status".
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const users = await User.find(filter)
    .select(SAFE_FIELDS)
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({ users });
}

/**
 * PATCH /api/admin/users/:id/status      body: { "isActive": true | false }
 * Activates or deactivates an account. A deactivated user cannot log in, and
 * their existing token stops working immediately (the protect middleware checks).
 */
export async function setUserStatus(req, res) {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!mongoose.isValidObjectId(id)) 
    return res.status(404).json({ message: 'User not found' });
  if (typeof isActive !== 'boolean') 
    return res.status(400).json({ message: 'isActive must be true or false' });

  // Safety rule: an admin cannot lock themselves out of the system.
  if (id === req.user.id && !isActive) {
    return res.status(400).json({ message: 'You cannot deactivate your own account' });
  }

  // { new: true } makes Mongoose return the updated document, not the old one.
  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select(SAFE_FIELDS);
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ user });
}

/**
 * POST /api/admin/users      body: { name, email, password }
 * Creates another admin. Because public signup always creates farmers.
 */
export async function createAdmin(req, res) {
  const { name, email, password } = req.body;

  if (!isText(name) || !isText(email) || !isText(password) || password.length < 8) {
    return res.status(400).json({ message: 'Name, email and a password of 8+ characters are required' });
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const created = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10), // never store the plain password
    role: 'admin',
  });

  // Read it back through SAFE_FIELDS so the response has the same shape as the list.
  const user = await User.findById(created._id).select(SAFE_FIELDS);
  res.status(201).json({ user });
}