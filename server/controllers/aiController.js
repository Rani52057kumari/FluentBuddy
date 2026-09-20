const { GoogleGenerativeAI } = require('@google/generative-ai');
const PracticeLog = require('../models/PracticeLog');

const getGeminiCandidates = () => {
  const configuredModel = String(process.env.GEMINI_MODEL || '').trim();
  const fallbackModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

  return [...new Set([configuredModel, ...fallbackModels].filter(Boolean))];
};

const getGeminiModel = (modelName) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

const cleanJsonResponse = (rawText) => {
  let cleaned = String(rawText || '').trim();

  if (!cleaned) {
    return {
      feedback: 'AI feedback is not available right now.',
      score: 0,
      grammarFixes: [],
      simplifiedText: '',
    };
  }

  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      feedback: parsed.feedback || parsed.summary || 'AI feedback is ready.',
      score: Number(parsed.score ?? 0),
      grammarFixes: Array.isArray(parsed.grammarFixes) ? parsed.grammarFixes : [],
      simplifiedText: parsed.simplifiedText || parsed.correctedText || '',
    };
  } catch (error) {
    return {
      feedback: cleaned,
      score: 0,
      grammarFixes: [],
      simplifiedText: cleaned,
    };
  }
};

const sendToGemini = async (prompt, fallbackBuilder) => {
  const candidates = getGeminiCandidates();

  if (!process.env.GEMINI_API_KEY) {
    return fallbackBuilder();
  }

  let lastError = null;

  for (const modelName of candidates) {
    try {
      const model = getGeminiModel(modelName);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();

      return cleanJsonResponse(rawText);
    } catch (error) {
      lastError = error;
      const isMissingModel = error?.status === 404 || /not found|no longer available/i.test(String(error?.message || ''));

      if (!isMissingModel) {
        break;
      }
    }
  }

  console.error('Gemini API error:', lastError || 'Unknown Gemini error');
  return fallbackBuilder();
};

// Send a prompt and attempt to parse the model output as JSON, returning the
// parsed object. If Gemini is not configured or parsing fails, return the
// result of `fallbackBuilder()`.
const sendToGeminiRaw = async (prompt, fallbackBuilder) => {
  const candidates = getGeminiCandidates();

  if (!process.env.GEMINI_API_KEY) {
    return fallbackBuilder();
  }

  let lastError = null;

  for (const modelName of candidates) {
    try {
      const model = getGeminiModel(modelName);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let rawText = String(response.text() || '').trim();

      if (!rawText) return fallbackBuilder();

      // Remove markdown fences if present
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      }

      try {
        const parsed = JSON.parse(rawText);
        return parsed;
      } catch (parseErr) {
        // If parsing fails, try to recover by locating the first JSON block
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const candidate = rawText.substring(jsonStart, jsonEnd + 1);
          try {
            const parsed2 = JSON.parse(candidate);
            return parsed2;
          } catch (e2) {
            // fall through to fallback
          }
        }
        // unable to parse; return fallback
        return fallbackBuilder();
      }
    } catch (error) {
      lastError = error;
      const isMissingModel = error?.status === 404 || /not found|no longer available/i.test(String(error?.message || ''));

      if (!isMissingModel) {
        break;
      }
    }
  }

  console.error('Gemini raw API error:', lastError || 'Unknown Gemini error');
  return fallbackBuilder();
};

const fallbackWritingResponse = (text, englishLevel) => ({
  feedback: `Your writing is understandable, but it will improve with clearer sentence structure and stronger word choice. Focus on using accurate grammar and simpler phrasing at your ${englishLevel.toLowerCase()} level.`,
  score: 7,
  grammarFixes: [
    'Use complete sentences with clear subject + verb structure.',
    'Replace repeated words with more natural vocabulary.',
    'Add linking words to improve flow between ideas.'
  ],
  simplifiedText: text,
});

const fallbackComprehensionResponse = (text) => ({
  feedback: 'Break the text into smaller parts, identify the main idea first, and then explain difficult words in simple English.',
  score: 7,
  grammarFixes: [],
  simplifiedText: `Main idea: ${text.substring(0, 160)}${text.length > 160 ? '...' : ''}`,
});

const evaluateWriting = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide some writing text to evaluate.',
      });
    }

    const englishLevel = req.user?.englishLevel || req.body.englishLevel || 'Beginner';

    const prompt = `
      You are an expert English language coach for FluentBuddy.
      User level: ${englishLevel}.
      Analyze the following writing and return ONLY valid JSON in this exact format:
      {
        "feedback": "short but constructive feedback",
        "score": 0-10,
        "grammarFixes": ["grammar fix 1", "grammar fix 2"],
        "simplifiedText": "a corrected or simplified version of the user text"
      }

      Requirements:
      - Check for grammar mistakes and explain them clearly.
      - Suggest better vocabulary and more natural phrasing.
      - Rate performance out of 10.
      - Keep feedback appropriate for the user's English level.
      - Keep grammarFixes as an array of useful examples.
      - The result must be valid JSON only, without Markdown fences.

      User text:
      """
      ${text}
      """
    `;

    const aiResult = await sendToGemini(prompt, () => fallbackWritingResponse(text, englishLevel));
    const normalizedScore = Number(aiResult.score) || 0;

    await PracticeLog.create({
      userId: req.user?._id,
      moduleType: 'Writing',
      sessionType: 'Writing',
      promptText: 'Writing evaluation',
      userResponseText: text,
      userInput: text,
      aiFeedback: aiResult.feedback || 'No feedback available.',
      detailedFeedback: aiResult.feedback || 'No feedback available.',
      grammarScore: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
      vocabularyScore: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
      scores: {
        grammar: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
        pronunciation: 0,
        comprehension: 0,
        vocabulary: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
      },
    });

    return res.status(200).json({
      feedback: aiResult.feedback,
      score: normalizedScore,
      grammarFixes: aiResult.grammarFixes || [],
      simplifiedText: aiResult.simplifiedText || text,
    });
  } catch (error) {
    console.error('Evaluate writing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to evaluate the writing right now.',
    });
  }
};

const comprehensionAssist = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a paragraph or question to simplify.',
      });
    }

    const englishLevel = req.user?.englishLevel || req.body.englishLevel || 'Beginner';

    const prompt = `
      You are an English comprehension coach for FluentBuddy.
      User level: ${englishLevel}.
      Simplify the following complex English text for a learner and explain key vocabulary in plain English.
      Return ONLY valid JSON in this exact format:
      {
        "feedback": "short explanation of the meaning, key ideas, and vocabulary",
        "score": 0-10,
        "grammarFixes": [],
        "simplifiedText": "the text rewritten in easier English"
      }

      Requirements:
      - Break the content into simple English.
      - Explain difficult vocabulary in plain language.
      - Keep the response clear, helpful, and suitable for the user's English level.
      - Return valid JSON only, without Markdown fences.

      Text:
      """
      ${text}
      """
    `;

    const aiResult = await sendToGemini(prompt, () => fallbackComprehensionResponse(text));
    const normalizedScore = Number(aiResult.score) || 0;

    await PracticeLog.create({
      userId: req.user?._id,
      moduleType: 'Reading',
      sessionType: 'Comprehension',
      promptText: 'Reading comprehension assistance',
      userResponseText: text,
      userInput: text,
      aiFeedback: aiResult.feedback || 'No explanation available.',
      detailedFeedback: aiResult.feedback || 'No explanation available.',
      grammarScore: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
      vocabularyScore: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
      scores: {
        grammar: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
        pronunciation: 0,
        comprehension: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
        vocabulary: Math.min(100, Math.max(0, Math.round(normalizedScore * 10))),
      },
    });

    return res.status(200).json({
      feedback: aiResult.feedback,
      score: normalizedScore,
      grammarFixes: aiResult.grammarFixes || [],
      simplifiedText: aiResult.simplifiedText || text,
    });
  } catch (error) {
    console.error('Comprehension assist error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to simplify the text right now.',
    });
  }
};

const FileMeta = require('../models/FileMeta');

const explainCode = async (req, res) => {
  try {
    let { code, filename } = req.body;

    // If no code provided but filename is present, try to use extractedText from FileMeta
    if ((!code || !String(code).trim()) && filename) {
      const meta = await FileMeta.findOne({ filename }).lean();
      if (meta) {
        // If PDF and extractedText is empty, return a helpful error so frontend can guide the user
        if (meta.mimeType === 'application/pdf' && !(meta.extractedText && String(meta.extractedText).trim())) {
          return res.status(422).json({ success: false, message: 'No text was extracted from this PDF. It may be a scanned image — upload a searchable PDF or paste the text to explain.' });
        }

        if (meta.extractedText) {
          code = meta.extractedText;
        }
      }
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'No code provided.' });
    }

    const lang = (filename || '').split('.').pop() || 'text';
    const prompt = `You are an expert software engineer. Provide a line-by-line explanation of the following ${lang} code. Return JSON with a single field "lines" which is an array of objects [{"line": 1, "code": "...", "explanation": "..."}]. Only return valid JSON.`;

    const aiParsed = await sendToGeminiRaw(`${prompt}\n\n${code}`, () => null);

    // If Gemini returned a parsed object with `lines`, use it.
    if (aiParsed && Array.isArray(aiParsed.lines)) {
      // Ensure each line item includes line, code, explanation
      const normalized = aiParsed.lines.map((item, idx) => ({
        line: item.line || idx + 1,
        code: item.code || (String(code).split('\n')[idx] || ''),
        explanation: item.explanation || String(item.explanation || item.note || '') || 'No explanation provided.'
      }));
      return res.status(200).json({ success: true, lines: normalized });
    }

    // Try a more flexible parse: if Gemini returned an object mapping line->explanation
    if (aiParsed && typeof aiParsed === 'object') {
      const linesArray = [];
      if (aiParsed.lines && Array.isArray(aiParsed.lines)) {
        // handled above
      } else if (aiParsed.byLine && typeof aiParsed.byLine === 'object') {
        // allow byLine: {"1":"...","2":"..."}
        const src = String(code).split('\n');
        for (const [k, v] of Object.entries(aiParsed.byLine)) {
          const n = Number(k) || null;
          if (n) linesArray.push({ line: n, code: src[n - 1] || '', explanation: String(v) });
        }
        if (linesArray.length) return res.status(200).json({ success: true, lines: linesArray });
      }
    }

    // Fallback: return a simple split-by-line explanation placeholder
    const fallbackLines = String(code).split('\n').map((l, idx) => ({ line: idx + 1, code: l, explanation: 'Explanation not available.' }));
    return res.status(200).json({ success: true, lines: fallbackLines });
  } catch (error) {
    console.error('Explain code error:', error);
    return res.status(500).json({ success: false, message: 'Unable to explain code right now.' });
  }
};

module.exports = {
  evaluateWriting,
  comprehensionAssist,
  explainCode,
};
