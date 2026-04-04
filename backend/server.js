require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Nagrik Setu API',
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

app.use('/api', reportRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, error: 'Unexpected server error' });
});

const { startEscalationJob } = require('./jobs/escalationJob');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nagrik_setu';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅ MongoDB connected → ${MONGO_URI.replace(/:\/\/[^@]+@/, '://*****@')}`);
    app.listen(PORT, () => {
      console.log(`🚀 Nagrik Setu API running on http://localhost:${PORT}`);
      console.log(`   Health:     GET  http://localhost:${PORT}/`);
      console.log(`   Submit:     POST http://localhost:${PORT}/api/report`);
      console.log(`   My Reports: GET  http://localhost:${PORT}/api/my-reports/:userId`);
      console.log(`   Track:      GET  http://localhost:${PORT}/api/report/:grievanceId`);
      
      startEscalationJob();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   → Make sure mongod is running, or set MONGO_URI in backend/.env');
    process.exit(1);
  });
