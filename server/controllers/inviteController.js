const Invite = require('../models/Invite');
const Note = require('../models/Note');
const User = require('../models/User');

const getUserInvites = async (req, res) => {
  try {
    // Find invites explicitly addressed to the user, or sent to their email address
    const email = req.user.email ? String(req.user.email).toLowerCase() : '';
    const invites = await Invite.find({
      status: 'pending',
      $or: [
        { to: req.user._id },
        ...(email ? [{ toEmail: email }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .populate('note', 'title owner')
      .populate('from', 'name email');

    return res.status(200).json({ success: true, count: invites.length, invites });
  } catch (error) {
    console.error('Get invites error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch invites at this time.' });
  }
};

const acceptInvite = async (req, res) => {
  try {
    const { id } = req.params;

    const invite = await Invite.findById(id).populate('note').populate('from');
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found.' });
    }

    // Allow acceptance if invite.to matches user, or invite.toEmail matches user's email
    const userEmail = req.user.email ? String(req.user.email).toLowerCase() : '';
    const isIntendedRecipient = (invite.to && String(invite.to) === String(req.user._id)) || (invite.toEmail && userEmail && String(invite.toEmail).toLowerCase() === userEmail);
    if (!isIntendedRecipient) {
      return res.status(403).json({ success: false, message: 'You are not authorized to accept this invite.' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invite is no longer pending.' });
    }

    // Add member to the note if not already
    const note = await Note.findById(invite.note._id);
    const isAlreadyMember = note.members.some((m) => String(m) === String(req.user._id));
    if (!isAlreadyMember) {
      note.members.push(req.user._id);
      await note.save();
    }

    invite.status = 'accepted';
    invite.respondedAt = Date.now();
    await invite.save();

    // counts: inviter's unique member count across their owned notes
    const inviterNotes = await Note.find({ owner: invite.from._id }).select('members');
    const inviterMemberSet = new Set();
    inviterNotes.forEach(n => {
      (n.members || []).forEach(m => {
        const s = String(m);
        if (s !== String(invite.from._id)) inviterMemberSet.add(s);
      });
    });

    const inviterMemberCount = inviterMemberSet.size;
    const inviteeNoteCount = await Note.countDocuments({ members: req.user._id });

    return res.status(200).json({ success: true, message: 'Invite accepted.', note, inviterMemberCount, inviteeNoteCount });
  } catch (error) {
    console.error('Accept invite error:', error);
    return res.status(500).json({ success: false, message: 'Unable to accept invite at this time.' });
  }
};

const rejectInvite = async (req, res) => {
  try {
    const { id } = req.params;

    const invite = await Invite.findById(id).populate('from');
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found.' });
    }

    if (!invite.to || String(invite.to) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to reject this invite.' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invite is no longer pending.' });
    }

    invite.status = 'rejected';
    invite.respondedAt = Date.now();
    await invite.save();

    return res.status(200).json({ success: true, message: 'Invite rejected.' });
  } catch (error) {
    console.error('Reject invite error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reject invite at this time.' });
  }
};

module.exports = {
  getUserInvites,
  acceptInvite,
  rejectInvite,
};
