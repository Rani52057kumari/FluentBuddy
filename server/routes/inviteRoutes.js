const express = require('express');
const { getUserInvites, acceptInvite, rejectInvite } = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getUserInvites);
router.post('/:id/accept', acceptInvite);
router.post('/:id/reject', rejectInvite);

module.exports = router;
