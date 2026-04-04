require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns').promises;

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
 
// Serverless Connection Singleton
let cachedConnection = null;

const connectDB = async (uri) => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // If already connecting, wait for the existing promise
  if (mongoose.connection.readyState === 2) {
    console.log('⏳ Already connecting, waiting...');
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose.connection));
      mongoose.connection.once('error', (err) => reject(err));
    });
  }

  console.log('🚀 Initiating new MongoDB connection...');
  cachedConnection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    dbName: 'nagrik_setu',
    maxPoolSize: 1,
    family: 4
  });
  
  return cachedConnection;
};

// Define routes in a separate router to support multiple mount points
const apiRouter = express.Router();

// Middleware to ensure DB connection for all API routes
apiRouter.use(async (req, res, next) => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nagrik_setu';
    await connectDB(uri);
    next();
  } catch (err) {
    console.error('DB Connection Middleware Error:', err.message);
    res.status(503).json({ success: false, error: 'Database connection failed' });
  }
});

// Attach the existing report routes to the common apiRouter
apiRouter.use('/', reportRoutes);

// Mount the apiRouter on standard paths
app.use('/api', apiRouter);
app.use('/_/backend/api', apiRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, error: 'Unexpected server error' });
});
 
// Initial trigger (only in non-Vercel environment)
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;

if (!isVercel) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nagrik_setu';
  connectDB(MONGO_URI)
    .then(() => console.log('✅ Local MongoDB Connected'))
    .catch(err => console.error('❌ Local MongoDB Failed:', err.message));

  app.listen(PORT, () => {
    console.log(`🚀 Nagrik Setu API running on http://localhost:${PORT}`);
    // Now safe to load and start background jobs
    const { startEscalationJob } = require('./jobs/escalationJob');
    startEscalationJob();
  });
} else {
  console.log('☁️ Running in Vercel Serverless environment.');
}

module.exports = app;
