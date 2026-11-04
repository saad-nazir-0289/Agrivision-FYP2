import mongoose from 'mongoose';
import Aoi from '../models/Aoi.js';
import User from '../models/User.js';
import { validatePolygon } from '../utils/geo.js';

// Checks a list of user ids. Returns the ids if every one is a real farmer, otherwise null.
async function farmerIds(ids = []) {
  if (!Array.isArray(ids) || !ids.every((id) => mongoose.isValidObjectId(id))) return null;
  const farmers = await User.find({ _id: { $in: ids }, role: 'farmer' }).select('_id');
  return farmers.length === new Set(ids.map(String)).size ? farmers.map((f) => f._id) : null;
}

// GET /api/aois  Admins get every AOI. A farmer gets only the AOIs assigned to them.
export async function listAois(req, res) {
  const isAdmin = req.user.role === 'admin';
  const query = Aoi.find(isAdmin ? {} : { assignedUsers: req.user._id }).sort({ name: 1 });
  // Only admins may see who else an AOI is assigned to.
  const aois = await (isAdmin ? query.populate('assignedUsers', 'name email') : query.select('-assignedUsers'));
  res.json({ aois });
}

// POST /api/aois  (admin)  body: { name, geometry, assignedUsers?: [userId] }
export async function createAoi(req, res) {
  const { name, geometry } = req.body;
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Name is required' });

  const { error, areaHa } = validatePolygon(geometry);
  if (error) return res.status(400).json({ message: error });

  const assignedUsers = await farmerIds(req.body.assignedUsers);
  if (!assignedUsers) return res.status(400).json({ message: 'assignedUsers must be a list of existing farmers' });

  if (await Aoi.findOne({ name: name.trim() })) {
    return res.status(409).json({ message: 'An AOI with this name already exists' });
  }

  // Store only the validated fields; the area is calculated here, never trusted from the client.
  const aoi = await Aoi.create({
    name,
    geometry: { type: 'Polygon', coordinates: geometry.coordinates },
    areaHa,
    assignedUsers,
    createdBy: req.user._id,
  });
  res.status(201).json({ aoi });
}

// PATCH /api/aois/:id/users  (admin)  body: { assignedUsers: [userId] }  (an empty list unassigns everyone)
export async function setAoiUsers(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'AOI not found' });
  if (!Array.isArray(req.body.assignedUsers)) return res.status(400).json({ message: 'assignedUsers must be a list' });

  const assignedUsers = await farmerIds(req.body.assignedUsers);
  if (!assignedUsers) return res.status(400).json({ message: 'assignedUsers must be a list of existing farmers' });

  const aoi = await Aoi.findByIdAndUpdate(id, { assignedUsers }, { new: true }).populate('assignedUsers', 'name email');
  if (!aoi) return res.status(404).json({ message: 'AOI not found' });
  res.json({ aoi });
}

// DELETE /api/aois/:id  (admin)
export async function deleteAoi(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id) || !(await Aoi.findByIdAndDelete(id))) {
    return res.status(404).json({ message: 'AOI not found' });
  }
  res.json({ message: 'AOI deleted' });
}