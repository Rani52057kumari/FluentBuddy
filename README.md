# FluentBuddy - AI-Powered English Learning Platform

FluentBuddy is a comprehensive, interactive English learning platform designed to help students improve their speaking, writing, and reading comprehension skills. The platform provides personalized exercises, instant feedback, and progress tracking to support students in overcoming language barriers and building confidence in English communication.

## 🎯 Problem Statement

Many students face significant challenges in understanding and communicating in English, especially in academic environments. This platform addresses:

- Difficulty comprehending English questions and instructions
- Lack of confidence in speaking and writing English
- Limited access to personalized, real-world practice
- Need for instant feedback and progress tracking

## ✨ Features

### 🎤 Speaking Practice
- Interactive speaking exercises with voice recognition
- Real-time pronunciation feedback
- Level-appropriate prompts (Beginner, Intermediate, Advanced)
- Manual text input option for compatibility

### ✍️ Writing Practice
- Structured writing exercises
- Grammar and style feedback
- Word count and character tracking
- Progressive difficulty levels

### 📖 Reading Comprehension
- Level-appropriate reading passages
- Comprehension questions
- Contextual understanding exercises
- Instant answer evaluation

### 📊 Progress Tracking
- Comprehensive performance analytics
- Exercise completion history
- Score tracking by activity type
- Recent activity timeline

### 🔐 User Management
- Secure authentication system
- Personalized user profiles
- Level-based content delivery
- Progress persistence

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup and structure
- **CSS3** - Modern, responsive design
- **JavaScript** - Interactive functionality
- **Web Speech API** - Voice recognition for speaking practice

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **SQLite3** - Lightweight database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## 📁 Project Structure

```
Project 2/
├── server/
│   ├── database/
│   │   └── db.js              # Database initialization and schema
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── exercises.js       # Exercise management routes
│   │   └── progress.js        # Progress tracking routes
│   └── server.js              # Main server file
├── public/
│   ├── css/
│   │   └── styles.css         # All styling
│   ├── js/
│   │   ├── auth.js            # Authentication logic
│   │   ├── main.js            # Landing page functionality
│   │   ├── dashboard.js       # Dashboard logic
│   │   ├── speaking.js        # Speaking practice
│   │   ├── writing.js         # Writing practice
│   │   ├── reading.js         # Reading practice
│   │   └── progress.js        # Progress tracking
│   ├── index.html             # Landing page
│   ├── dashboard.html         # User dashboard
│   ├── speaking.html          # Speaking practice page
│   ├── writing.html           # Writing practice page
│   ├── reading.html           # Reading comprehension page
│   └── progress.html          # Progress tracking page
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Step 1: Install Dependencies

```bash
cd "/home/admin-022/Project 2"
npm install
```

### Step 2: Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Step 3: Access the Application

Open your web browser and navigate to:
```
http://localhost:3000
```

## 📖 Usage Guide

### Getting Started

1. **Sign Up**
   - Click "Sign Up" on the landing page
   - Enter your username, email, and password
   - Select your current English level (Beginner, Intermediate, Advanced)
   - Click "Sign Up" to create your account

2. **Login**
   - Click "Login" on the landing page
   - Enter your email and password
   - Click "Login" to access your dashboard

### Dashboard

The dashboard provides:
- Overview of your statistics (total exercises, average score, current level)
- Quick access to all practice modules
- Recent activity summary

### Practice Modules

#### Speaking Practice
1. Select your difficulty level
2. Choose an exercise
3. Click "Start Recording" to use voice input (or type your response)
4. Submit your response for instant feedback

**Note:** Speech recognition requires a modern browser with Web Speech API support (Chrome recommended)

#### Writing Practice
1. Select your difficulty level
2. Choose an exercise
3. Write your response in the text area
4. Monitor word and character count
5. Submit for evaluation and feedback

#### Reading Comprehension
1. Select your difficulty level
2. Choose a reading exercise
3. Read the passage carefully
4. Answer the comprehension question
5. Submit for instant feedback

### Progress Tracking

View your progress:
- Overall statistics and average score
- Performance breakdown by exercise type
- Complete activity timeline with scores and feedback
- Filter activities by type (Speaking, Writing, Reading)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Exercises
- `GET /api/exercises/:type` - Get exercises by type
- `GET /api/exercises/:type/:id` - Get specific exercise
- `POST /api/exercises/:type/:id/submit` - Submit exercise answer

### Progress
- `GET /api/progress/overview` - Get user progress overview
- `GET /api/progress/:type` - Get progress by exercise type

## 🎨 Features Highlights

### Responsive Design
- Works seamlessly on desktop, tablet, and mobile devices
- Modern, intuitive user interface
- Smooth animations and transitions

### Real-time Feedback
- Instant scoring on exercise completion
- Detailed feedback messages
- Personalized improvement suggestions

### Progress Analytics
- Track improvement over time
- Identify strengths and areas for improvement
- Visualize performance metrics

### Security
- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes

## 🔐 Security Notes

**Important:** Before deploying to production:

1. Change the JWT secret in `server/routes/auth.js`:
   ```javascript
   const JWT_SECRET = 'your-secure-secret-key-here';
   ```

2. Use environment variables for sensitive data:
   ```javascript
   const JWT_SECRET = process.env.JWT_SECRET;
   const PORT = process.env.PORT || 3000;
   ```

3. Enable HTTPS in production

## 🤝 Contributing

This is an educational project. Suggestions for improvements:

1. Integration with advanced AI APIs (OpenAI, Google Cloud Speech-to-Text)
2. More sophisticated scoring algorithms
3. Gamification features (badges, leaderboards)
4. Social features (study groups, peer review)
5. Mobile applications (iOS, Android)
6. Multilingual support
7. Advanced analytics and reporting

## 📝 Sample Exercises

The platform comes pre-loaded with sample exercises:
- 3 Speaking exercises (Beginner to Advanced)
- 3 Writing exercises (Beginner to Advanced)
- 3 Reading comprehension exercises (Beginner to Advanced)

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is occupied:
```bash
# Change the port in server/server.js or set environment variable
PORT=3001 npm start
```

### Speech Recognition Not Working
- Ensure you're using a supported browser (Chrome recommended)
- Check microphone permissions
- Use the manual text input as an alternative

### Database Issues
- Delete the `fluentbuddy.db` file and restart the server to recreate the database
- Check write permissions in the `server/database/` directory

## 📄 License

MIT License - Feel free to use this project for educational purposes.

## 👨‍💻 Author

Created as an educational project to help students overcome English language barriers in academic settings.

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed with students' needs in mind
- Focused on practical, real-world English skills

---

**Start your English learning journey with FluentBuddy today! 🚀**
# FluentBuddy
