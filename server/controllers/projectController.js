const crypto = require('crypto');
const Project = require('../models/Project');
const User = require('../models/User');
const Note = require('../models/Note');
const FileMeta = require('../models/FileMeta');
const { normalizeEmail } = require('../utils/authHelpers');

const generateProjectSlug = async () => {
  const base = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const existing = await Project.findOne({ publicSlug: base });

  if (existing) {
    return generateProjectSlug();
  }

  return base;
};

const sanitizeUserSummary = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email || null,
  };
};

const populateProjectFields = async (project) => {
  if (!project) return null;

  return await Project.findById(project._id)
    .populate('owner', 'name email')
    .populate('members', 'name email');
};

const createProject = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required.',
      });
    }

    const publicSlug = Boolean(isPublic) ? await generateProjectSlug() : null;

    const project = await Project.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      owner: req.user._id,
      members: [req.user._id],
      isPublic: Boolean(isPublic),
      publicSlug,
    });

    const createdProject = await populateProjectFields(project);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project: createdProject,
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create project at this time.',
    });
  }
};

const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, userId } = req.body;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email or userId to add a member.',
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (String(project.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can add members.',
      });
    }

    let invitedUser = null;

    if (userId) {
      invitedUser = await User.findById(userId);
    } else {
      invitedUser = await User.findOne({ email: normalizeEmail(email) });
    }

    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const isAlreadyMember = project.members.some(
      (memberId) => String(memberId) === String(invitedUser._id)
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project.',
      });
    }

    project.members.push(invitedUser._id);
    await project.save();

    const updatedProject = await populateProjectFields(project);

    return res.status(200).json({
      success: true,
      message: 'Member added successfully.',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Add member error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to add member at this time.',
    });
  }
};

const getUserProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate('owner', 'name email')
      .populate('members', 'name email');

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch projects at this time.',
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const isOwner = String(project.owner?._id || project.owner) === String(req.user._id);
    const isMember = project.members.some(
      (member) => String(member._id) === String(req.user._id)
    );

    if (!isOwner && !isMember && !project.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project.',
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Get project by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch project details at this time.',
    });
  }
};

const generateProjectShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (String(project.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can generate a public share link.',
      });
    }

    if (!project.publicSlug) {
      project.publicSlug = await generateProjectSlug();
      project.isPublic = true;
      await project.save();
    }

    const shareUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/project/${project.publicSlug}`;

    return res.status(200).json({
      success: true,
      shareUrl,
      slug: project.publicSlug,
      project,
    });
  } catch (error) {
    console.error('Generate project share link error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to generate project share link at this time.',
    });
  }
};

const getPublicProjectBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Public project slug is required.',
      });
    }

    const project = await Project.findOne({ publicSlug: slug })
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Public project not found.',
      });
    }

    const [notes, files] = await Promise.all([
      Note.find({
        $or: [{ isPublic: true }, { owner: { $in: project.members } }, { members: { $in: project.members } }],
      })
        .populate('owner', 'name email')
        .populate('members', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      FileMeta.find({
        uploader: { $in: project.members },
      })
        .populate('uploader', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        owner: project.owner,
        members: project.members,
        isPublic: project.isPublic,
        publicSlug: project.publicSlug,
        createdAt: project.createdAt,
      },
      notes: notes.filter((note) => note.isPublic || String(note.owner?._id || note.owner) === String(project.owner) || (note.members || []).some((member) => String(member?._id || member) === String(project.owner))),
      files,
      summary: {
        totalNotes: notes.length,
        totalFiles: files.length,
      },
    });
  } catch (error) {
    console.error('Get public project by slug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch public project details at this time.',
    });
  }
};

module.exports = {
  createProject,
  addMember,
  getUserProjects,
  getProjectById,
  generateProjectShareLink,
  getPublicProjectBySlug,
};
