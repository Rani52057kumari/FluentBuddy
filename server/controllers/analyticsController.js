const mongoose = require('mongoose');
const PracticeLog = require('../models/PracticeLog');
const Note = require('../models/Note');
const FileMeta = require('../models/FileMeta');
const Project = require('../models/Project');
const User = require('../models/User');

const normalizeModuleKey = (moduleType = '') => String(moduleType || '').trim().toLowerCase();

const computeSessionScore = (entry) => {
  const dimensionScores = [
    Number(entry?.scores?.grammar),
    Number(entry?.scores?.pronunciation),
    Number(entry?.scores?.comprehension),
    Number(entry?.scores?.vocabulary),
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (dimensionScores.length > 0) {
    const total = dimensionScores.reduce((sum, value) => sum + value, 0);
    return total / dimensionScores.length;
  }

  const fallbackScores = [
    Number(entry?.grammarScore),
    Number(entry?.vocabularyScore),
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (fallbackScores.length > 0) {
    const total = fallbackScores.reduce((sum, value) => sum + value, 0);
    return total / fallbackScores.length;
  }

  return 0;
};

const getUserProgress = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated.',
      });
    }

    const [stats, recentLogs, allLogs] = await Promise.all([
      PracticeLog.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            avgGrammarScore: { $avg: '$grammarScore' },
            avgVocabularyScore: { $avg: '$vocabularyScore' },
            recentFeedback: {
              $push: {
                feedback: '$aiFeedback',
                createdAt: '$createdAt',
                sessionType: '$sessionType',
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalSessions: 1,
            avgGrammarScore: { $ifNull: [{ $round: ['$avgGrammarScore', 2] }, 0] },
            avgVocabularyScore: { $ifNull: [{ $round: ['$avgVocabularyScore', 2] }, 0] },
            recentFeedback: { $slice: ['$recentFeedback', 5] },
          },
        },
      ]),
      PracticeLog.find({ userId }).sort({ createdAt: -1 }).limit(5).select('sessionType userInput aiFeedback grammarScore vocabularyScore createdAt').lean(),
      PracticeLog.find({ userId }).select('moduleType scores grammarScore vocabularyScore').lean(),
    ]);

    const summary = stats[0] || {
      totalSessions: 0,
      avgGrammarScore: 0,
      avgVocabularyScore: 0,
      recentFeedback: [],
    };

    const recentFeedback = recentLogs.map((entry) => ({
      sessionType: entry.sessionType,
      inputSnippet: entry.userInput ? String(entry.userInput).slice(0, 120) : 'No input recorded',
      feedback: entry.aiFeedback,
      grammarScore: entry.grammarScore,
      vocabularyScore: entry.vocabularyScore,
      createdAt: entry.createdAt,
    }));

    const moduleStatsMap = { speaking: 0, writing: 0, reading: 0 };
    const byTypeMap = {};
    let totalScore = 0;

    allLogs.forEach((entry) => {
      const moduleKey = normalizeModuleKey(entry.moduleType);
      if (moduleStatsMap[moduleKey] !== undefined) {
        moduleStatsMap[moduleKey] += 1;
      }

      if (moduleKey) {
        byTypeMap[moduleKey] = (byTypeMap[moduleKey] || 0) + 1;
      }

      totalScore += computeSessionScore(entry);
    });

    const totalExercises = allLogs.length;
    const averageScore = totalExercises > 0 ? Math.round(totalScore / totalExercises) : 0;
    const byType = Object.entries(byTypeMap).map(([exercise_type, count]) => ({ exercise_type, count }));

    return res.status(200).json({
      success: true,
      data: {
        totalSessions: summary.totalSessions,
        averageGrammarScore: summary.avgGrammarScore,
        averageVocabularyScore: summary.avgVocabularyScore,
        recentFeedback,
        totalExercises,
        averageScore,
        moduleStats: moduleStatsMap,
        byType,
        currentLevel: req.user?.englishLevel || 'Beginner',
      },
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch analytics at this time.' });
  }
};

const getContributionAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User is not authenticated.' });
    }

    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).select('_id owner members').lean();

    const projectIds = projects.map((project) => project._id).filter(Boolean);
    const teamMemberSet = new Set([String(userId)]);

    projects.forEach((project) => {
      if (project.owner) teamMemberSet.add(String(project.owner));
      (project.members || []).forEach((memberId) => teamMemberSet.add(String(memberId)));
    });

    const teamMemberIds = [...teamMemberSet];
    const teamMemberObjectIds = teamMemberIds.map((id) => new mongoose.Types.ObjectId(id));

    if (!projectIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          teamMembers: 1,
          totalNotes: 0,
          totalFiles: 0,
          totalActivities: 0,
          topContributor: {
            memberId: String(userId),
            name: req.user?.name || 'You',
            email: req.user?.email || '',
            notesCreated: 0,
            filesUploaded: 0,
            totalActivities: 0,
          },
          activityLogs: [{
            memberId: String(userId),
            name: req.user?.name || 'You',
            email: req.user?.email || '',
            notesCreated: 0,
            filesUploaded: 0,
            totalActivities: 0,
          }],
        },
      });
    }

    const [teamUsers, noteCounts, fileCounts] = await Promise.all([
      User.find({ _id: { $in: teamMemberObjectIds } }).select('name email').lean(),
      Note.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$owner', notesCreated: { $sum: 1 } } },
      ]),
      FileMeta.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$uploader', filesUploaded: { $sum: 1 } } },
      ]),
    ]);

    const userMap = new Map(teamUsers.map((user) => [String(user._id), user]));
    const noteCountMap = new Map(noteCounts.map((row) => [String(row._id), Number(row.notesCreated || 0)]));
    const fileCountMap = new Map(fileCounts.map((row) => [String(row._id), Number(row.filesUploaded || 0)]));

    const contributionByMember = teamMemberIds
      .map((memberId) => {
        const user = userMap.get(String(memberId));
        const notesCreated = noteCountMap.get(String(memberId)) || 0;
        const filesUploaded = fileCountMap.get(String(memberId)) || 0;

        return {
          memberId,
          name: user?.name || 'Unknown User',
          email: user?.email || '',
          notesCreated,
          filesUploaded,
          totalActivities: notesCreated + filesUploaded,
        };
      })
      .sort((a, b) => b.totalActivities - a.totalActivities || b.notesCreated - a.notesCreated);

    const totalNotes = contributionByMember.reduce((sum, member) => sum + member.notesCreated, 0);
    const totalFiles = contributionByMember.reduce((sum, member) => sum + member.filesUploaded, 0);

    return res.status(200).json({
      success: true,
      data: {
        teamMembers: contributionByMember.length,
        totalNotes,
        totalFiles,
        totalActivities: totalNotes + totalFiles,
        topContributor: contributionByMember[0] || null,
        activityLogs: contributionByMember,
      },
    });
  } catch (error) {
    console.error('Get contribution analytics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch contribution analytics at this time.' });
  }
};

module.exports = {
  getUserProgress,
  getContributionAnalytics,
};
