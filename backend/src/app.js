require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const classesRoutes = require('./routes/classes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const studentsRoutes = require('./routes/students.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const scoresRoutes = require('./routes/scores.routes');
const searchRoutes = require('./routes/search.routes');
const chatbotRoutes = require('./routes/chatbot.routes');

const app = express();

connectDB();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chatbot', chatbotRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend chạy tại http://localhost:${PORT}`);
  });
}

module.exports = app;
