console.log(`[BOOT] Nagrik Setu Server Starting at ${new Date().toISOString()}`);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true, // Reflect origin (allows all for debugging)
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
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
 
 app.get('/api/debug', async (_req, res) => {
   const uri = process.env.MONGO_URI || '';
   const maskedUri = uri.length > 20 
     ? `${uri.substring(0, 15)}...${uri.substring(uri.length - 5)}` 
     : 'Too short or empty';

   // Force verification of connection
   let errorInfo = lastMongoError;
   if (mongoose.connection.readyState !== 1) {
     try {
       await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
       errorInfo = null;
     } catch (err) {
       errorInfo = err.message;
     }
   }

   res.json({
     mongoConnected: mongoose.connection.readyState === 1,
     mongoReadyState: mongoose.connection.readyState,
     mongoError: errorInfo,
     uriPreview: maskedUri,
     env: {
       MONGO_URI: !!process.env.MONGO_URI,
       GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
       PORT: !!process.env.PORT
     },
     nodeVersion: process.version,
     vercel: !!process.env.VERCEL
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
 
// Lazy-loaded to prevent Vercel startup crashes from imported modules
const getEscalationJob = () => require('./jobs/escalationJob');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nagrik_setu';
 
let lastMongoError = "Connecting..."; // Initial state

console.log('Attempting MongoDB connection...');
mongoose
  .connect(MONGO_URI, { 
    serverSelectionTimeoutMS: 5000, 
    connectTimeoutMS: 10000
  })
  .then(() => {
    lastMongoError = null;
    console.log('✅ MongoDB Connected Successfuly');
  })
  .catch((err) => {
    lastMongoError = err.message;
    console.error('❌ MongoDB connection failed:', err.message);
  });

const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 Nagrik Setu API running on http://localhost:${PORT}`);
    console.log(`   Health:     GET  http://localhost:${PORT}/`);
    console.log(`   Submit:     POST http://localhost:${PORT}/api/report`);
    console.log(`   My Reports: GET  http://localhost:${PORT}/api/my-reports/:userId`);
    console.log(`   Track:      GET  http://localhost:${PORT}/api/report/:grievanceId`);
    
    // Now safe to load and start
    const { startEscalationJob } = getEscalationJob();
    startEscalationJob();
  });
} else {
  console.log('☁️ Running in Vercel Serverless environment. Background Cron Disabled.');
}

module.exports = app;
