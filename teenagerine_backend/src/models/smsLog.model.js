const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'delivered', 'pending'],
    default: 'pending'
  },
  provider: {
    type: String,
    default: 'smsgatewayhub'
  },
  type: {
    type: String,
    enum: ['order_confirmation', 'order_status', 'promotional', 'custom', 'general'],
    default: 'general'
  },
  batchId: {
    type: String,
    sparse: true
  },
  cost: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    sparse: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  error: {
    type: String
  },
  response: {
    type: mongoose.Schema.Types.Mixed
  },
  deliveryStatus: {
    status: String,
    timestamp: Date,
    reason: String
  },
  scheduled: {
    type: Boolean,
    default: false
  },
  scheduledTime: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
smsLogSchema.index({ phoneNumber: 1, createdAt: -1 });
smsLogSchema.index({ type: 1, createdAt: -1 });
smsLogSchema.index({ status: 1, createdAt: -1 });
smsLogSchema.index({ userId: 1, createdAt: -1 });
smsLogSchema.index({ orderId: 1 });
smsLogSchema.index({ batchId: 1 });

// Virtual for formatted phone number
smsLogSchema.virtual('formattedPhone').get(function() {
  if (this.phoneNumber && this.phoneNumber.length === 12 && this.phoneNumber.startsWith('91')) {
    return `+91 ${this.phoneNumber.substring(2, 7)} ${this.phoneNumber.substring(7)}`;
  }
  return this.phoneNumber;
});

// Method to update delivery status
smsLogSchema.methods.updateDeliveryStatus = function(status, reason = null) {
  this.deliveryStatus = {
    status,
    timestamp: new Date(),
    reason
  };

  if (status === 'delivered') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
  } else if (status === 'failed') {
    this.status = 'failed';
  }

  return this.save();
};

// Static method to get SMS stats
smsLogSchema.statics.getStats = async function(startDate, endDate) {
  const matchQuery = {};

  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalSent: 1,
        totalCost: 1,
        statusBreakdown: {
          $reduce: {
            input: '$byStatus',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[{
                    k: '$$this.status',
                    v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.status', input: '$$value' } }, 0] }, 1] }
                  }]]
                }
              ]
            }
          }
        },
        typeBreakdown: {
          $reduce: {
            input: '$byType',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[{
                    k: '$$this.type',
                    v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.type', input: '$$value' } }, 0] }, 1] }
                  }]]
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Static method to get user SMS count for today
smsLogSchema.statics.getUserDailyCount = async function(phoneNumber) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await this.countDocuments({
    phoneNumber,
    createdAt: { $gte: today }
  });
};

// Static method to get recent SMS for a user
smsLogSchema.statics.getUserRecentSMS = async function(userId, limit = 10) {
  return await this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('orderId', 'orderNumber')
    .select('message type status createdAt deliveryStatus cost');
};

module.exports = mongoose.model('SMSLog', smsLogSchema);