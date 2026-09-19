const express = require('express');
const { createNote, addMember, getUserNotes, getNoteById, removeMember } = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createNote);
router.get('/', getUserNotes);
router.get('/:id', getNoteById);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

module.exports = router;
