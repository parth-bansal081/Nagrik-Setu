const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Grievance = require('../models/Grievance');
const { mapDepartment } = require('../utils/departmentMapper');

// Support environments without global fetch
const nodeFetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const safeFetch = typeof fetch !== 'undefined' ? fetch : nodeFetch;

const router = express.Router();

const VALID_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Escalated'];
const PROXIMITY_METERS = 100; // master-ticket clustering radius

// ─────────────────────────────────────────────────────────
// POST /api/report
// Body: { userId, latitude, longitude, category, description, imageURL }
// ─────────────────────────────────────────────────────────
router.post('/report', async (req, res) => {
  try {
    const { userId, latitude, longitude, category, description, imageURL } = req.body;

    // Validate
    const missing = [];
    if (!userId) missing.push('userId');
    if (latitude == null) missing.push('latitude');
    if (longitude == null) missing.push('longitude');
    if (!category) missing.push('category');
    if (!description) missing.push('description');
    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing: ${missing.join(', ')}` });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    let finalCategory = category;
    let priority = 0;
    let aiSeverity = null;
    let aiConfidence = null;
    let aiSummary = null;
    let baseDeadline = calculateDeadline(category);

    if (imageURL && typeof imageURL === 'string' && imageURL.startsWith('data:image')) {
      try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          console.warn('[AI Routing Warning] GOOGLE_API_KEY is missing from environment. Skipping AI analysis.');
        } else {
          const parts = imageURL.split(',');
          const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const base64Data = parts[1];

          const response = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Identify the infrastructure issue (Pothole, Water Leak, Streetlight, Garbage). Return ONLY a JSON object with: { 'category': string, 'confidence': float, 'severity': 'Low'|'Medium'|'High', 'summary': string }" },
                  { inlineData: { mimeType, data: base64Data } }
                ]
              }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error (${response.status}): ${errText.substring(0, 50)}`);
          }

          const data = await response.json();
          
          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const aiData = JSON.parse(data.candidates[0].content.parts[0].text);
          aiConfidence = aiData.confidence;
          aiSeverity = aiData.severity;
          aiSummary = aiData.summary;

          if (aiConfidence > 0.6 && aiData.category) {
            const aiCatLow = aiData.category.toLowerCase();
            if (aiCatLow.includes('pothole')) finalCategory = 'Roads';
            else if (aiCatLow.includes('water')) finalCategory = 'Water Supply';
            else if (aiCatLow.includes('streetlight')) finalCategory = 'Electricity';
            else if (aiCatLow.includes('garbage')) finalCategory = 'Others';
          }
          
          if (aiSeverity === 'High') {
            priority = 1;
            const now = Date.now();
            const timeDiff = baseDeadline.getTime() - now;
            baseDeadline = new Date(now + timeDiff * 0.5); // reduce deadline by 50%
          }
        } else {
           console.error('[Gemini API Parsing Error]', data.error || 'No valid candidate returned');
        }
      } // End of else (apiKey)
      } catch (aiErr) {
        console.error('[AI Routing Fetch Logic Error]', aiErr.message);
      }
    }

    const { departmentId, departmentName } = mapDepartment(finalCategory);

    // ── Create the grievance ─────────────────────────────
    const historyLogs = [makeHistoryEntry('Grievance filed by citizen', 'Citizen', `Category: ${category}`)];
    if (aiSummary) {
      historyLogs.push(makeHistoryEntry('AI auto-categorization applied', 'System', `Detected: ${aiSummary}`));
    }

    const grievance = await Grievance.create({
      grievanceId: uuidv4(),
      userId,
      latitude: lat,
      longitude: lng,
      location: { type: 'Point', coordinates: [lng, lat] }, // [lng, lat] for GeoJSON
      category: finalCategory,
      description,
      imageURL: imageURL || null,
      departmentId,
      departmentName,
      deadline: baseDeadline,
      priority,
      aiConfidence,
      aiSeverity,
      aiSummary,
      history: historyLogs,
    });

    // ── Proximity scan — find nearby Pending reports ─────
    // Searches within PROXIMITY_METERS of same category,
    // excluding the just-created document itself.
    let masterTicket = null;
    let proximityAlert = null;

    try {
      const nearby = await Grievance.findOne({
        _id: { $ne: grievance._id },
        category,
        status: 'Pending',
        masterTicketId: null, // only look at masters, not already-linked children
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: PROXIMITY_METERS,
          },
        },
      });

      if (nearby) {
        masterTicket = nearby;

        // Link the new report to the master
        await Grievance.findByIdAndUpdate(grievance._id, {
          $set: { masterTicketId: nearby.grievanceId },
          $push: {
            history: makeHistoryEntry(
              `Linked to Master Ticket ${nearby.grievanceId.slice(-8)}`,
              'System',
              `Duplicate detected within ${PROXIMITY_METERS}m`
            ),
          },
        });

        // Add this report to the master's linkedReportIds
        await Grievance.findByIdAndUpdate(nearby._id, {
          $push: {
            linkedReportIds: grievance.grievanceId,
            history: makeHistoryEntry(
              `Duplicate report linked — ID …${grievance.grievanceId.slice(-8)}`,
              'System',
              `New report within ${PROXIMITY_METERS}m radius`
            ),
          },
        });

        proximityAlert = {
          masterTicketId: nearby.grievanceId,
          masterShortId: `…${nearby.grievanceId.slice(-8)}`,
          distanceMeters: PROXIMITY_METERS,
          message: `Your report has been linked to an existing Master Ticket for a nearby ${category} issue.`,
        };

        console.log(`[Proximity] Linked ${grievance.grievanceId.slice(-6)} → master ${nearby.grievanceId.slice(-6)}`);
      }
    } catch (proximityErr) {
      // Non-fatal: proximity scan failure should not block the main response
      console.warn('[Proximity] Scan failed (non-fatal):', proximityErr.message);
    }

    return res.status(201).json({
      success: true,
      grievanceId: grievance.grievanceId,
      departmentId: grievance.departmentId,
      departmentName: grievance.departmentName,
      status: grievance.status,
      createdAt: grievance.createdAt,
      masterTicket: masterTicket
        ? { grievanceId: masterTicket.grievanceId, departmentName: masterTicket.departmentName }
        : null,
      proximityAlert,
      message: proximityAlert
        ? `Report filed and linked to Master Ticket ${proximityAlert.masterShortId}.`
        : 'Grievance filed successfully. Track it using your Grievance ID.',
    });

  } catch (err) {
    console.error('[POST /report]', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(err.errors).map(e => e.message).join('; ') });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/all   — Official Dashboard feed
// Optional ?status= filter
// ─────────────────────────────────────────────────────────
router.get('/reports/all', async (req, res) => {
  try {
    const query = {};
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      query.status = req.query.status;
    }

    const reports = await Grievance.find(query).sort({ createdAt: -1 }).select('-__v');

    const counts = await Grievance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const stats = { total: 0, Pending: 0, 'In Progress': 0, Resolved: 0, Rejected: 0, Escalated: 0 };
    counts.forEach(({ _id, count }) => { stats[_id] = count; stats.total += count; });

    return res.status(200).json({ success: true, count: reports.length, reports, stats });
  } catch (err) {
    console.error('[GET /reports/all]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/my-reports/:userId
// ─────────────────────────────────────────────────────────
router.get('/my-reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId?.trim()) return res.status(400).json({ success: false, error: 'userId is required' });
    const reports = await Grievance.find({ userId: userId.trim() }).sort({ createdAt: -1 }).select('-__v');
    return res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    console.error('[GET /my-reports]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/report/:grievanceId  — single lookup
// ─────────────────────────────────────────────────────────
router.get('/report/:grievanceId', async (req, res) => {
  try {
    const report = await Grievance.findOne({ grievanceId: req.params.grievanceId }).select('-__v');
    if (!report) return res.status(404).json({ success: false, error: 'Grievance not found' });
    return res.status(200).json({ success: true, report });
  } catch (err) {
    console.error('[GET /report/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/report/:grievanceId/status
// Body: { status, afterPhotoURL?, assignedOfficial?, actor?, afterLat?, afterLng? }
// ─────────────────────────────────────────────────────────
router.patch('/report/:grievanceId/status', async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { status, afterPhotoURL, assignedOfficial, actor = 'Official', afterLat, afterLng } = req.body;

    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
    }
    if (status === 'Resolved' && !afterPhotoURL) {
      return res.status(400).json({ success: false, error: 'afterPhotoURL is required to mark Resolved' });
    }

    const current = await Grievance.findOne({ grievanceId });
    if (!current) return res.status(404).json({ success: false, error: 'Grievance not found' });

    // Build the history entry
    let historyNote = '';
    if (assignedOfficial) historyNote = `Assigned to ${assignedOfficial}`;
    if (afterPhotoURL) historyNote += (historyNote ? ' · ' : '') + 'After photo uploaded';

    const update = {
      $set: { status },
      $push: {
        history: makeHistoryEntry(
          `Status changed to "${status}"`,
          actor,
          historyNote
        ),
      },
    };

    if (afterPhotoURL) update.$set.afterPhotoURL = afterPhotoURL;
    if (assignedOfficial) update.$set.assignedOfficial = assignedOfficial;

    // Location Match Logic for Resolved state
    if (status === 'Resolved' && afterLat != null && afterLng != null) {
      const dist = getDistanceMeters(current.latitude, current.longitude, parseFloat(afterLat), parseFloat(afterLng));
      if (dist <= 100) {
        update.$set.locationVerified = true;
        update.$push.history.note += ' · Location Verified';
      }
    }

    // If assigning an official for the first time, also log an assign entry
    if (assignedOfficial && current.assignedOfficial !== assignedOfficial) {
      update.$push.history = [
        makeHistoryEntry(`Assigned to ${assignedOfficial}`, 'System'),
        makeHistoryEntry(`Status changed to "${status}"`, actor, historyNote),
      ];
      // Use $each to push multiple items
      update.$push = { history: { $each: update.$push.history } };
    }

    const updated = await Grievance.findOneAndUpdate(
      { grievanceId },
      update,
      { new: true, runValidators: true, select: '-__v' }
    );

    console.log(`[PATCH] ${grievanceId.slice(-8)} → ${status}`);
    return res.status(200).json({ success: true, report: updated });

  } catch (err) {
    console.error('[PATCH /status]', err.message);
    if (err.name === 'ValidationError') return res.status(400).json({ success: false, error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/report/:grievanceId/comment
// Body: { text, author }
// ─────────────────────────────────────────────────────────
router.post('/report/:grievanceId/comment', async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { text, author = 'Official' } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

    const updated = await Grievance.findOneAndUpdate(
      { grievanceId },
      {
        $push: {
          internalComments: { text, author, timestamp: new Date() },
          history: makeHistoryEntry('Internal comment added', author, `Comment: "${text.substring(0, 30)}..."`)
        }
      },
      { new: true, select: '-__v' }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Grievance not found' });
    return res.status(200).json({ success: true, report: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/report/:grievanceId/resource
// Body: { item, quantity }
// ─────────────────────────────────────────────────────────
router.post('/report/:grievanceId/resource', async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { item, quantity } = req.body;
    if (!item || !quantity) return res.status(400).json({ success: false, error: 'Item and quantity required' });

    const updated = await Grievance.findOneAndUpdate(
      { grievanceId },
      {
        $push: {
          resourceRequests: { item, quantity, status: 'Pending', timestamp: new Date() },
          history: makeHistoryEntry('Resource Requested', 'Official', `${quantity}x ${item}`)
        }
      },
      { new: true, select: '-__v' }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Grievance not found' });
    return res.status(200).json({ success: true, report: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/report/:grievanceId/feedback
// Body: { rating, comment }
// ─────────────────────────────────────────────────────────
router.post('/report/:grievanceId/feedback', async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { rating, comment } = req.body;
    if (!rating) return res.status(400).json({ success: false, error: 'Rating is required' });

    const updated = await Grievance.findOneAndUpdate(
      { grievanceId },
      {
        $set: { feedback: { rating, comment, timestamp: new Date() } },
        $push: { history: makeHistoryEntry('Citizen Feedback Given', 'Citizen', `Rated ${rating}/5 Stars`) }
      },
      { new: true, select: '-__v' }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Grievance not found' });
    return res.status(200).json({ success: true, report: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/report/:grievanceId/mood
// Body: { mood: 'Frustrated' | 'Angry' | ... }
// ─────────────────────────────────────────────────────────
router.post('/report/:grievanceId/mood', async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { mood } = req.body;
    if (!mood) return res.status(400).json({ success: false, error: 'Mood is required' });

    // Wow Factor Logic: If mood is Frustrated/Angry we set isHighPriority to true
    const isNegative = ['Frustrated', 'Angry', 'Unhappy', 'Disappointed'].includes(mood);

    // Check if the report is already resolved
    const current = await Grievance.findOne({ grievanceId });
    if (!current) return res.status(404).json({ success: false, error: 'Grievance not found' });
    if (current.status === 'Resolved') {
      return res.status(400).json({ success: false, error: 'Cannot update mood of resolved ticket' });
    }

    const updatePlayload = {
      $push: { history: makeHistoryEntry('Citizen Mood Logged', 'Citizen', `Marked mood as: ${mood}`) }
    };
    if (isNegative) {
      updatePlayload.$set = { isHighPriority: true };
      updatePlayload.$push.history.note += ' ⚡ System flagged High Priority based on mood.';
    }

    const updated = await Grievance.findOneAndUpdate(
      { grievanceId },
      updatePlayload,
      { new: true, select: '-__v' }
    );

    return res.status(200).json({ success: true, report: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const grievances = await Grievance.find({}).lean();

    const deptStats = {};

    grievances.forEach(g => {
      const dId = g.departmentId;
      if (!deptStats[dId]) {
        deptStats[dId] = {
          departmentId: dId,
          departmentName: g.departmentName,
          totalIssues: 0,
          resolvedIssues: 0,
          totalResolutionTimeMs: 0,
          resolutionTimesCount: 0
        };
      }

      deptStats[dId].totalIssues += 1;

      if (g.status === 'Resolved') {
        deptStats[dId].resolvedIssues += 1;

        if (g.updatedAt && g.createdAt) {
          const timeMs = new Date(g.updatedAt) - new Date(g.createdAt);
          if (timeMs > 0) {
            deptStats[dId].totalResolutionTimeMs += timeMs;
            deptStats[dId].resolutionTimesCount += 1;
          }
        }
      }
    });

    const MOCK_ADDRESSES = {
      'PWD_ROADS': { address: 'Govt Complex, Block A', district: 'Nagpur', state: 'Maharashtra' },
      'JAL_SHAKTI': { address: 'Water Dept HQ, Central Ave', district: 'Nagpur', state: 'Maharashtra' },
      'DISCOM': { address: 'Power Station Rd, Sector 4', district: 'Nagpur', state: 'Maharashtra' },
      'GENERAL': { address: 'Civic Centre, Main Square', district: 'Nagpur', state: 'Maharashtra' }
    };

    const leaderboard = Object.values(deptStats).map(d => {
      const resolutionRate = d.totalIssues > 0 ? (d.resolvedIssues / d.totalIssues) * 100 : 0;
      let avgTimeMs = 0;
      let avgTimeStr = 'N/A';

      if (d.resolutionTimesCount > 0) {
        avgTimeMs = d.totalResolutionTimeMs / d.resolutionTimesCount;
        const hours = Math.floor(avgTimeMs / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) {
          avgTimeStr = `${days}d ${hours % 24}h`;
        } else {
          avgTimeStr = `${hours}h`;
        }
      }

      const mockInfo = MOCK_ADDRESSES[d.departmentId] || MOCK_ADDRESSES['GENERAL'];

      return {
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        totalIssues: d.totalIssues,
        resolvedIssues: d.resolvedIssues,
        resolutionRate: Number(resolutionRate.toFixed(1)),
        avgTimeMs,
        avgTimeStr,
        address: mockInfo.address,
        district: mockInfo.district,
        state: mockInfo.state
      };
    });

    leaderboard.sort((a, b) => {
      if (b.resolutionRate !== a.resolutionRate) return b.resolutionRate - a.resolutionRate;
      return a.avgTimeMs - b.avgTimeMs;
    });

    const activeRepairs = grievances.filter(g => g.status === 'In Progress').length;
    const totalResolved = grievances.filter(g => g.status === 'Resolved').length;

    return res.status(200).json({
      success: true,
      leaderboard,
      cityPulse: { activeRepairs, totalResolved }
    });

  } catch (err) {
    console.error('[GET /leaderboard]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function makeHistoryEntry(action, actor = 'System', note = '') {
  return { action, actor, note, timestamp: new Date() };
}

function calculateDeadline(category) {
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  switch (category) {
    case 'Water Supply': return new Date(now.getTime() + 1 * DAY_MS); // 24h
    case 'Electricity': return new Date(now.getTime() + 2 * DAY_MS); // 48h
    case 'Roads': return new Date(now.getTime() + 7 * DAY_MS); // 7d
    default: return new Date(now.getTime() + 3 * DAY_MS); // 3d
  }
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
