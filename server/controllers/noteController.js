const Note = require('../models/Note');
const User = require('../models/User');
const Invite = require('../models/Invite');
const { normalizeEmail } = require('../utils/authHelpers');

const populateNoteFields = async (note) => {
  if (!note) return null;

  return await Note.findById(note._id)
    .populate('owner', 'name email')
    .populate('members', 'name email');
};

const createNote = async (req, res) => {
  try {
    const { title, content, isPublic } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Note title is required.' });
    }

    const note = await Note.create({
      title: String(title).trim(),
      content: content ? String(content) : '',
      owner: req.user._id,
      members: [req.user._id],
      isPublic: Boolean(isPublic),
    });

    const createdNote = await populateNoteFields(note);

    return res.status(201).json({ success: true, message: 'Note created successfully.', note: createdNote });
  } catch (error) {
    console.error('Create note error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create note at this time.' });
  }
};

const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, userId } = req.body;

    if (!email && !userId) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email or userId to add a member.' });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    // Previously only owners could add members; allow any authenticated user to invite by email/userId.

    let invitedUser = null;
    let toEmail = '';

    if (userId) {
      invitedUser = await User.findById(userId);
      if (invitedUser) toEmail = invitedUser.email || '';
    } else {
      toEmail = normalizeEmail(email);
      invitedUser = await User.findOne({ email: toEmail });
    }

    // If user exists and is already a member, reject
    if (invitedUser) {
      const isAlreadyMember = note.members.some((memberId) => String(memberId) === String(invitedUser._id));
      if (isAlreadyMember) {
        return res.status(400).json({ success: false, message: 'User is already a member of this note.' });
      }
    }

    // Create an invitation; invitee must accept to become a member
    const invite = await Invite.create({
      note: note._id,
      from: req.user._id,
      to: invitedUser ? invitedUser._id : null,
      toEmail: toEmail || (invitedUser ? invitedUser.email : ''),
    });

    return res.status(201).json({ success: true, message: 'Invitation sent.', invite });
  } catch (error) {
    console.error('Add member error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add member at this time.' });
  }
};

const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    if (String(note.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only note owner can remove members.' });
    }

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Please provide a memberId to remove.' });
    }

    // Prevent removing the owner
    if (String(memberId) === String(note.owner)) {
      return res.status(400).json({ success: false, message: 'Cannot remove the owner from the note.' });
    }

    const existingIndex = note.members.findIndex((m) => String(m) === String(memberId));
    if (existingIndex === -1) {
      return res.status(404).json({ success: false, message: 'Member not found in this note.' });
    }

    note.members.splice(existingIndex, 1);
    await note.save();

    const updatedNote = await populateNoteFields(note);
    return res.status(200).json({ success: true, message: 'Member removed successfully.', note: updatedNote });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ success: false, message: 'Unable to remove member at this time.' });
  }
};

const getUserNotes = async (req, res) => {
  try {
    const notes = await Note.find({ $or: [{ owner: req.user._id }, { members: req.user._id }] })
      .sort({ createdAt: -1 })
      .populate('owner', 'name email')
      .populate('members', 'name email');

    return res.status(200).json({ success: true, count: notes.length, notes });
  } catch (error) {
    console.error('Get user notes error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch notes at this time.' });
  }
};

const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id).populate('owner', 'name email').populate('members', 'name email');

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    const isOwner = String(note.owner?._id || note.owner) === String(req.user._id);
    const isMember = note.members.some((member) => String(member._id) === String(req.user._id));

    if (!isOwner && !isMember && !note.isPublic) {
      return res.status(403).json({ success: false, message: 'You do not have access to this note.' });
    }

    return res.status(200).json({ success: true, note });
  } catch (error) {
    console.error('Get note by id error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch note details at this time.' });
  }
};

module.exports = {
  createNote,
  addMember,
  getUserNotes,
  getNoteById,
  removeMember,
};
