const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const router = express.Router();
const JWT_SECRET = 'your-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, level } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password, level) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, level || 'beginner'],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { id: this.lastID, username, email, level: level || 'beginner' }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        message: 'Login successful',
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          level: user.level 
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Verify token middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  const bearerToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  jwt.verify(bearerToken, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.id;
    next();
  });
}

// Get user profile
router.get('/profile', verifyToken, (req, res) => {
  db.get('SELECT id, username, email, level, profile_photo, bio, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// Update user profile
router.put('/profile', verifyToken, (req, res) => {
  const { username, bio, profile_photo } = req.body;
  
  db.run(
    'UPDATE users SET username = ?, bio = ?, profile_photo = ? WHERE id = ?',
    [username, bio, profile_photo, req.userId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Error updating profile' });
      }
      
      db.get('SELECT id, username, email, level, profile_photo, bio, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Server error' });
        }
        res.json({ message: 'Profile updated successfully', user });
      });
    }
  );
});

module.exports = router;
module.exports.verifyToken = verifyToken;
