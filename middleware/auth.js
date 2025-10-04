// middleware/auth.js
const jwt = require('jsonwebtoken');
const Worker = require('../models/Worker');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long-and-random';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, JWT_SECRET);
    // decoded should be { id, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verify error:', err && err.message);
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
