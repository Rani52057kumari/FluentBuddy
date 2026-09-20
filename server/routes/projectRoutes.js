const express = require('express');
const {
  createProject,
  addMember,
  getUserProjects,
  getProjectById,
  generateProjectShareLink,
  getPublicProjectBySlug,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public/:slug', getPublicProjectBySlug);
router.use(protect);

router.post('/', createProject);
router.get('/', getUserProjects);
router.get('/:id', getProjectById);
router.post('/:id/share', generateProjectShareLink);
router.post('/:id/members', addMember);

module.exports = router;
