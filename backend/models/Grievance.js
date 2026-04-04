const mongoose = require('mongoose');

// ── History entry sub-schema ─────────────────────────────
const historyEntrySchema = new mongoose.Schema({
  action:    { type: String, required: true }, // e.g. "Status changed to In Progress"
  actor:     { type: String, default: 'System' }, // official name or 'System'
  note:      { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ── Main grievance schema ────────────────────────────────
const grievanceSchema = new mongoose.Schema(
  {
    // Publicly shareable unique tracking ID (UUID v4)
    grievanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Citizen who filed the report
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // GeoJSON Point for geospatial queries ($near, 2dsphere)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    // Raw coordinates kept for easy read access
    latitude:  { type: Number, required: true, min: -90,  max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },

    // Issue classification
    category: {
      type: String,
      required: true,
      enum: ['Roads', 'Water Supply', 'Electricity', 'Others'],
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    imageURL:    { type: String, default: null },
    afterPhotoURL: { type: String, default: null },

    // Department auto-assigned by departmentMapper
    departmentId:   { type: String, required: true },
    departmentName: { type: String, required: true },

    // Official assigned to handle this grievance
    assignedOfficial: { type: String, default: null },

    // Lifecycle status
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Escalated'],
      default: 'Pending',
    },

    // 0 = normal, 1 = escalated once, etc.
    escalationLevel: { type: Number, default: 0, min: 0 },

    // ── Proximity / Master Ticket ───────────────────────
    // If this report was merged into an existing cluster, masterTicketId points
    // to the original grievanceId that acts as the "master".
    masterTicketId: { type: String, default: null },

    // If this IS the master ticket, linkedReportIds lists the duplicates
    linkedReportIds: { type: [String], default: [] },
    
    // ── Advanced Dashboard Features ──────────────────────
    deadline: { type: Date },
    locationVerified: { type: Boolean, default: false },
    isHighPriority: { type: Boolean, default: false },
    internalComments: [{
        text: String,
        author: String,
        timestamp: { type: Date, default: Date.now }
    }],
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        timestamp: { type: Date }
    },
    resourceRequests: [{
        item: String,
        quantity: String,
        status: { type: String, enum: ['Pending', 'Approved', 'Fulfilled'], default: 'Pending' },
        timestamp: { type: Date, default: Date.now }
    }],

    // ── History Timeline ────────────────────────────────
    // Append-only log: every status change, assignment, or system event
    history: { type: [historyEntrySchema], default: [] },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// 2dsphere index enables efficient $near / $geoWithin queries
grievanceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Grievance', grievanceSchema);
