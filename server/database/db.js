const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use in-memory database for Vercel (serverless)
const dbPath = process.env.VERCEL ? ':memory:' : path.join(__dirname, 'fluentbuddy.db');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      level TEXT DEFAULT 'beginner',
      profile_photo TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Exercises table
    db.run(`CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT,
      hints TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Progress table
    db.run(`CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      exercise_type TEXT NOT NULL,
      score INTEGER,
      completed BOOLEAN DEFAULT 0,
      feedback TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )`);

    // Insert sample exercises (always for in-memory DB)
    if (process.env.VERCEL) {
      insertSampleExercises();
    } else {
      checkAndInsertExercises();
    }
  });

  console.log('Database initialized successfully');
}

function checkAndInsertExercises() {
  const checkExercises = `SELECT COUNT(*) as count FROM exercises`;
  
  db.get(checkExercises, (err, row) => {
    if (err) {
      console.error('Error checking exercises:', err);
      return;
    }

    if (row.count === 0) {
      insertSampleExercises();
    }
  });
}

function insertSampleExercises() {
  const exercises = [
        // Speaking exercises
        {
          type: 'speaking',
          level: 'beginner',
          title: 'Introduce Yourself',
          content: 'Practice introducing yourself. Say: "Hello, my name is [your name]. I am a student and I want to improve my English."',
          answer: 'hello my name is i am a student and i want to improve my english',
          hints: 'Speak clearly and at a moderate pace'
        },
        {
          type: 'speaking',
          level: 'intermediate',
          title: 'Describe Your Day',
          content: 'Describe what you did today. Include at least 3 activities and use past tense.',
          answer: '',
          hints: 'Use past tense verbs like: went, studied, ate, played'
        },
        {
          type: 'speaking',
          level: 'advanced',
          title: 'Express Your Opinion',
          content: 'Express your opinion on this statement: "Online learning is more effective than traditional classroom learning." Give reasons for your answer.',
          answer: '',
          hints: 'Use phrases like: In my opinion, I believe that, From my perspective'
        },
        
        // Writing exercises
        {
          type: 'writing',
          level: 'beginner',
          title: 'Complete the Sentence',
          content: 'Complete this sentence: "My favorite subject is _____ because _____."',
          answer: '',
          hints: 'Think about what you enjoy learning about'
        },
        {
          type: 'writing',
          level: 'intermediate',
          title: 'Write a Short Paragraph',
          content: 'Write a paragraph (50-75 words) about your goals for improving your English.',
          answer: '',
          hints: 'Include: what you want to achieve, why it\'s important, how you plan to practice'
        },
        {
          type: 'writing',
          level: 'advanced',
          title: 'Essay Writing',
          content: 'Write a short essay (150-200 words) discussing the advantages and disadvantages of social media for students.',
          answer: '',
          hints: 'Structure: Introduction, advantages paragraph, disadvantages paragraph, conclusion'
        },
        
        // Reading exercises
        {
          type: 'reading',
          level: 'beginner',
          title: 'Simple Comprehension',
          content: 'Read the passage: "Maria is a student. She goes to school every day. She likes mathematics and science. After school, she plays basketball with her friends." Question: What are Maria\'s favorite subjects?',
          answer: 'mathematics and science',
          hints: 'Look for the word "likes" in the passage'
        },
        {
          type: 'reading',
          level: 'intermediate',
          title: 'Understanding Context',
          content: 'Read: "Climate change is one of the most pressing issues of our time. Rising temperatures affect weather patterns, leading to more frequent extreme weather events. Scientists agree that immediate action is necessary." Question: What is the main concern discussed in this passage?',
          answer: 'climate change',
          hints: 'Look at the first sentence for the main topic'
        },
        {
          type: 'reading',
          level: 'advanced',
          title: 'Critical Analysis',
          content: 'Read: "While technology has revolutionized education by making information more accessible, critics argue that it has also reduced face-to-face interaction and critical thinking skills. The debate continues as educators seek to balance technological integration with traditional teaching methods." Question: What is the author\'s stance on technology in education?',
          answer: 'neutral or balanced presenting both advantages and disadvantages',
          hints: 'Notice the author presents both sides without taking a clear position'
        }
      ];

      const stmt = db.prepare(`INSERT INTO exercises (type, level, title, content, answer, hints) VALUES (?, ?, ?, ?, ?, ?)`);
      
      exercises.forEach(exercise => {
        stmt.run(exercise.type, exercise.level, exercise.title, exercise.content, exercise.answer, exercise.hints);
      });
      
      stmt.finalize();
      console.log('Sample exercises inserted');
}

module.exports = { db, initializeDatabase };
