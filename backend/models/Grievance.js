const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
  action:    { type: String, required: true },
  actor:     { type: String, default: 'System' },
  note:      { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const grievanceSchema = new mongoose.Schema(
  {
    grievanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    latitude:  { type: Number, required: true, min: -90,  max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
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
    departmentId:   { type: String, required: true },
    departmentName: { type: String, required: true },
    assignedOfficial: { type: String, default: null },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Escalated'],
      default: 'Pending',
    },
    escalationLevel: { type: Number, default: 0, min: 0 },
    masterTicketId: { type: String, default: null },
    linkedReportIds: { type: [String], default: [] },
    deadline: { type: Date },
    locationVerified: { type: Boolean, default: false },
    isHighPriority: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    aiSeverity: { type: String, default: null },
    aiConfidence: { type: Number, default: null },
    aiSummary: { type: String, default: null },
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
    history: { type: [historyEntrySchema], default: [] },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

grievanceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Grievance', grievanceSchema);
