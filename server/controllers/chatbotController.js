const { GoogleGenAI } = require('@google/genai');

const SYSTEM_PROMPT = `You are Buddy, an encouraging AI study assistant for the FluentBuddy platform. Help users with platform navigation, English grammar queries, speaking practice tips, and doubt solving in clear, formal, polite English. Avoid markdown formatting, asterisks, slang, and overly casual wording. Keep answers concise, respectful, and professional.`;

const normalizeFormalAnswer = (text) => {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(?!\s)/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    return null;
  }

  return new GoogleGenAI({ apiKey: String(apiKey).trim() });
};

const extractTextFromGeminiResponse = (response) => {
  if (!response) return '';

  if (typeof response.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }

  if (Array.isArray(response.candidates)) {
    const parts = response.candidates
      .flatMap((candidate) => candidate?.content?.parts || [])
      .map((part) => part?.text)
      .filter(Boolean);

    if (parts.length) {
      return parts.join('\n').trim();
    }
  }

  if (typeof response === 'string' && response.trim()) {
    return response.trim();
  }

  return '';
};

const getFallbackChatResponse = (message, userContext = {}) => {
  const context = userContext || {};
  const level = context.englishLevel || context.level || 'beginner';
  const currentGoal = context.goal || context.currentGoal || 'practice English confidently';

  if (!message || !String(message).trim()) {
    return 'Please write your question and I will help you.';
  }

  return `Hello! I can help with your English learning on FluentBuddy. For now, focus on your ${String(level).toLowerCase()} level and your goal of ${String(currentGoal).toLowerCase()}. Try breaking your question into a small example sentence, and I can help explain the grammar or give a better way to say it.`;
};

const getFallbackTranscription = () => 'Speech transcription is temporarily unavailable. Please try again in a moment.';

const queryChatbot = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const userContext = req.body?.userContext || {};

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    const contextSummary = JSON.stringify({
      userId: req.user?._id ? String(req.user._id) : 'guest',
      englishLevel: userContext.englishLevel || userContext.level || 'beginner',
      goal: userContext.goal || userContext.currentGoal || 'practice English confidently',
      platformSection: userContext.platformSection || 'general',
      lastAction: userContext.lastAction || 'chat',
    });

    const prompt = `
System instruction: ${SYSTEM_PROMPT}

User context: ${contextSummary}

User question: ${message}

Reply in polished, formal, encouraging English. Keep the answer short, clear, and useful for a FluentBuddy learner. Do not use bullet lines with asterisks or markdown styling. Use complete sentences and a professional tone.
    `;

    const client = getGeminiClient();

    if (!client) {
      return res.json({
        success: true,
        response: getFallbackChatResponse(message, userContext),
        source: 'fallback',
      });
    }

    const response = await client.models.generateContent({
      model: process.env.GEMINI_CHATBOT_MODEL || 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
    });

    const answer = normalizeFormalAnswer(
      extractTextFromGeminiResponse(response) || getFallbackChatResponse(message, userContext)
    );

    return res.json({
      success: true,
      response: answer,
      source: 'gemini',
    });
  } catch (error) {
    console.error('Chatbot query error:', error);
    return res.status(200).json({
      success: true,
      response: getFallbackChatResponse(req.body?.message || '', req.body?.userContext || {}),
      source: 'fallback',
    });
  }
};

const transcribeAudio = async (req, res) => {
  try {
    let audioBuffer = null;
    let mimeType = 'audio/webm';

    const uploadedFile = req.file || (Array.isArray(req.files) ? req.files.find((file) => file && file.buffer) : null);
    if (uploadedFile && uploadedFile.buffer) {
      audioBuffer = uploadedFile.buffer;
      mimeType = uploadedFile.mimetype || mimeType;
    } else {
      const rawAudio = req.body?.audio || req.body?.audioBase64 || req.body?.base64Audio || req.body?.data;
      if (!rawAudio) {
        return res.status(400).json({
          success: false,
          message: 'Audio file or base64 audio is required.',
        });
      }

      let normalizedAudio = rawAudio;
      if (typeof normalizedAudio === 'string' && normalizedAudio.startsWith('data:audio')) {
        const match = normalizedAudio.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
        if (match) {
          mimeType = match[1] || mimeType;
          normalizedAudio = match[2];
        }
      }

      if (typeof normalizedAudio === 'string' && normalizedAudio.trim()) {
        audioBuffer = Buffer.from(normalizedAudio, 'base64');
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty audio payload.',
      });
    }

    const client = getGeminiClient();
    if (!client) {
      return res.json({
        success: true,
        text: getFallbackTranscription(),
        source: 'fallback',
      });
    }

    const response = await client.models.generateContent({
      model: process.env.GEMINI_STT_MODEL || 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: 'Transcribe the speech in this audio exactly and return only the spoken text without commentary.' },
          { inlineData: { mimeType, data: audioBuffer.toString('base64') } },
        ],
      }],
    });

    const transcript = extractTextFromGeminiResponse(response) || getFallbackTranscription();

    return res.json({
      success: true,
      text: transcript,
      source: 'gemini',
    });
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return res.status(200).json({
      success: true,
      text: getFallbackTranscription(),
      source: 'fallback',
    });
  }
};

module.exports = {
  queryChatbot,
  transcribeAudio,
  SYSTEM_PROMPT,
};
