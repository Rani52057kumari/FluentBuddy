const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { isValidEmail, normalizeEmail, validatePassword } = require('../utils/authHelpers');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.name,
  email: user.email || null,
  phone: user.phone || null,
  bio: user.bio || '',
  profilePhoto: user.profilePhoto || '',
  profile_photo: user.profilePhoto || '',
  englishLevel: user.englishLevel || 'Beginner',
  level: user.englishLevel || 'Beginner',
  authProvider: user.authProvider,
  googleId: user.googleId || null,
  createdAt: user.createdAt,
  created_at: user.createdAt,
});

const invalidEmailMessage = 'This email is invalid. Please enter a valid real email address.';
const passwordMessage = 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.';

const normalizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
};

const resolveIdentifier = (email, phone) => {
  const normalizedEmail = email ? normalizeEmail(email) : '';
  const normalizedPhone = phone ? normalizePhone(phone) : '';

  if (normalizedEmail) return { type: 'email', value: normalizedEmail };
  if (normalizedPhone) return { type: 'phone', value: normalizedPhone };
  return null;
};

const generateOtpCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const sendOtpEmail = async (toEmail, otp, purpose) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Gmail SMTP is not configured. Set SMTP_USER and SMTP_PASS in your .env file.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `${purpose === 'signup' ? 'Your signup OTP' : 'Your login OTP'} - FluentBuddy`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin-bottom:16px;color:#1f2937;">FluentBuddy OTP</h2>
        <p style="font-size:16px;color:#374151;">Your verification code is:</p>
        <div style="margin:18px 0;padding:18px 20px;background:#eef2ff;border-radius:10px;text-align:center;font-size:32px;font-weight:700;letter-spacing:6px;color:#312e81;">${otp}</div>
        <p style="font-size:14px;color:#4b5563;">This code is valid for 5 minutes. Use it to complete your ${purpose} request.</p>
      </div>
    `,
  });
};

const validateOtpCode = async (identifier, otp, purpose) => {
  if (!identifier || !otp) {
    throw new Error('OTP is required.');
  }

  const otpRecord = await Otp.findOne({
    identifier: String(identifier).toLowerCase().trim(),
    purpose,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new Error('OTP not found. Please request a new code.');
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    throw new Error('OTP has expired. Please request a new code.');
  }

  if (String(otpRecord.otp) !== String(otp).trim()) {
    throw new Error('Invalid OTP. Please enter the correct code.');
  }

  otpRecord.verified = true;
  await otpRecord.save();
  return true;
};

const sendOtp = async (req, res) => {
  try {
    const { email, phone, purpose = 'login' } = req.body;
    const identifier = resolveIdentifier(email, phone);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email or phone number.',
      });
    }

    if (identifier.type === 'email' && !isValidEmail(identifier.value)) {
      return res.status(400).json({
        success: false,
        message: invalidEmailMessage,
      });
    }

    if (identifier.type === 'phone' && !/^\d{10,15}$/.test(identifier.value)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.',
      });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ identifier: identifier.value, purpose });
    await Otp.create({
      identifier: identifier.value,
      otp: otpCode,
      purpose,
      expiresAt,
      verified: false,
    });

    const destination = identifier.type === 'email' ? 'email' : 'phone';

    if (identifier.type === 'email') {
      await sendOtpEmail(identifier.value, otpCode, purpose);
    } else {
      throw new Error('SMS delivery is not configured. Please use an email address for OTP delivery.');
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to your ${destination}.`,
      otp: process.env.NODE_ENV === 'production' ? undefined : otpCode,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to send OTP right now.',
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, phone, otp, purpose = 'login' } = req.body;
    const identifier = resolveIdentifier(email, phone);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email or phone number.',
      });
    }

    await validateOtpCode(identifier.value, otp, purpose);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid OTP. Please try again.',
    });
  }
};

// @desc    Register a new local user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, username, email, phone, password, otp } = req.body;
    const userName = (name || username || '').trim();
    const normalizedEmail = email ? normalizeEmail(email) : '';
    const normalizedPhone = phone ? normalizePhone(phone) : '';

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name and password are required.',
      });
    }

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email or phone number.',
      });
    }

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: invalidEmailMessage,
      });
    }

    if (normalizedPhone && !/^\d{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: passwordMessage,
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required before creating your account.',
      });
    }

    const identifier = normalizedEmail || normalizedPhone;
    await validateOtpCode(identifier, otp, 'signup');

    const existingUser = await User.findOne({
      $or: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({
      name: userName,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      password,
      authProvider: 'local',
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Register user error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to register user at this time.',
    });
  }
};

// @desc    Login a local user using email or phone + password
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = resolveIdentifier(email, phone);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone and password are required.',
      });
    }

    if (identifier.type === 'email' && !isValidEmail(identifier.value)) {
      return res.status(400).json({
        success: false,
        message: invalidEmailMessage,
      });
    }

    if (identifier.type === 'phone' && !/^\d{10,15}$/.test(identifier.value)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.',
      });
    }

    const userQuery = identifier.type === 'email'
      ? { email: identifier.value }
      : { phone: identifier.value };

    const user = await User.findOne(userQuery).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    const isGoogleOnlyAccount = user.authProvider === 'google' && !user.password;
    if (isGoogleOnlyAccount) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google Sign-In. Please click 'Continue with Google'.",
      });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please double-check and try again.',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login user error:', error);

    return res.status(401).json({
      success: false,
      message: error.message || 'Unable to log in at this time.',
    });
  }
};

// @desc    Authenticate user using Google ID token
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const googleToken = req.body.idToken || req.body.token || req.body.credential || req.body.googleToken;
    const manualEmail = req.body.email;
    const manualName = req.body.name;

    let email;
    let googleId;
    let name;

    if (googleToken) {
      const audience = process.env.GOOGLE_CLIENT_ID;
      if (!audience) {
        return res.status(500).json({
          success: false,
          message: 'Google Sign-In is not configured on this server.',
        });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        return res.status(400).json({
          success: false,
          message: 'Google profile information could not be verified.',
        });
      }

      email = normalizeEmail(payload.email);
      googleId = payload.sub;
      name = payload.name || payload.given_name || 'Google User';
    } else if (manualEmail) {
      email = normalizeEmail(manualEmail);
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid Google email address.',
        });
      }

      googleId = req.body.googleId || `manual-google-${Date.now()}`;
      name = manualName || email.split('@')[0];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Google sign-in token is required.',
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        googleId,
      });
    } else {
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }

      await user.save();
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Google sign-in successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Google auth error:', error);

    return res.status(401).json({
      success: false,
      message: 'Google authentication failed. Please try again.',
    });
  }
};

// @desc    Get current authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch profile at this time.',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch profile details.',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, bio, profilePhoto } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (typeof username === 'string' && username.trim()) {
      user.name = username.trim();
    }

    if (typeof bio === 'string') {
      user.bio = bio.trim();
    }

    if (typeof profilePhoto === 'string') {
      user.profilePhoto = profilePhoto.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  googleAuth,
  getMe,
  getProfile,
  updateProfile,
};
