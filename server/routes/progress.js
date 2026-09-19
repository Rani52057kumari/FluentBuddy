const express = require('express');
const { db } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get user progress overview
router.get('/overview', verifyToken, (req, res) => {
  const userId = req.userId;

  const queries = {
    totalExercises: new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM progress WHERE user_id = ?',
        [userId],
        (err, row) => err ? reject(err) : resolve(row.count)
      );
    }),
    averageScore: new Promise((resolve, reject) => {
      db.get(
        'SELECT AVG(score) as avg FROM progress WHERE user_id = ?',
        [userId],
        (err, row) => err ? reject(err) : resolve(row.avg || 0)
      );
    }),
    byType: new Promise((resolve, reject) => {
      db.all(
        'SELECT exercise_type, COUNT(*) as count, AVG(score) as avgScore FROM progress WHERE user_id = ? GROUP BY exercise_type',
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    }),
    recentActivity: new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, e.title, e.level 
         FROM progress p 
         JOIN exercises e ON p.exercise_id = e.id 
         WHERE p.user_id = ? 
         ORDER BY p.completed_at DESC 
         LIMIT 10`,
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    })
  };

  Promise.all([
    queries.totalExercises,
    queries.averageScore,
    queries.byType,
    queries.recentActivity
  ])
    .then(([totalExercises, averageScore, byType, recentActivity]) => {
      res.json({
        totalExercises,
        averageScore: Math.round(averageScore),
        byType,
        recentActivity
      });
    })
    .catch(err => {
      res.status(500).json({ error: 'Error fetching progress data' });
    });
});

// Get all progress entries for a user
router.get('/user', verifyToken, (req, res) => {
  const userId = req.userId;

  db.all(
    `SELECT p.*, e.title, e.level 
     FROM progress p 
     JOIN exercises e ON p.exercise_id = e.id 
     WHERE p.user_id = ? 
     ORDER BY p.completed_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user progress' });
      }
      res.json(rows);
    }
  );
});

// Get progress by exercise type
router.get('/:type', verifyToken, (req, res) => {
  const { type } = req.params;
  const userId = req.userId;

  db.all(
    `SELECT p.*, e.title, e.level 
     FROM progress p 
     JOIN exercises e ON p.exercise_id = e.id 
     WHERE p.user_id = ? AND p.exercise_type = ? 
     ORDER BY p.completed_at DESC`,
    [userId, type],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching progress' });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
