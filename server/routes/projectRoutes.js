const express = require('express');
const {
  createProject,
  addMember,
  getUserProjects,
  getProjectById,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createProject);
router.get('/', getUserProjects);
router.get('/:id', getProjectById);
router.post('/:id/members', addMember);

module.exports = router;
