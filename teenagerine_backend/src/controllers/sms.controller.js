require('dotenv').config();
const axios = require('axios');
const smsService = require('../services/smsService');
const SMSLog = require('../models/smsLog.model');
const User = require('../models/user.model');
const moment = require('moment');
/**
 * Send custom SMS to specific users
 */
exports.sendCustomSMS = async (req, res) => {
  try {
    const {
      phoneNumbers,
      message,
      scheduleTime,
      userIds,
      forceReal
    } = req.body;
    const adminId = req.user._id;

    if (!phoneNumbers && !userIds) {
      return res.status(400).json({
        status: 'fail',
        message: 'Either phone numbers or user IDs must be provided'
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Message is required'
      });
    }

    if (message.length > 918) {
      return res.status(400).json({
        status: 'fail',
        message: 'Message exceeds 918 character limit'
      });
    }

    let targetNumbers = [];

    // Get phone numbers from user IDs if provided
    if (userIds && userIds.length > 0) {
      const users = await User.find({
        _id: {
          $in: userIds
        }
      }).select('phone name');

      // Import Address model for fallback phone lookup
      const Address = require('../models/address.model');

      for (const user of users) {
        if (user.phone) {
          targetNumbers.push(user.phone);
        } else {
          // Fallback: Get phone from user's default address
          const userAddress = await Address.findOne({
            user: user._id,
            isDefault: true
          }).select('phone');

          if (userAddress && userAddress.phone) {
            targetNumbers.push(userAddress.phone);
          }
        }
      }
    }

    // Add direct phone numbers if provided
    if (phoneNumbers && phoneNumbers.length > 0) {
      targetNumbers = [...targetNumbers, ...phoneNumbers];
    }

    if (targetNumbers.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No valid phone numbers found'
      });
    }

    // Remove duplicates
    targetNumbers = [...new Set(targetNumbers)];

    const options = {
      adminId,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : null,
      forceReal: forceReal || false
    };

    const result = await smsService.sendCustomSMS(targetNumbers, message, options);

    res.status(200).json({
      status: 'success',
      message: 'SMS sent successfully',
      data: {
        batchId: result.batchId,
        messagesSent: result.messagesSent,
        recipients: result.recipients.length,
        cost: result.cost,
        balance: result.balance
      }
    });

  } catch (error) {
    console.error('Custom SMS error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Send promotional SMS to all users
 */
exports.sendPromotionalSMS = async (req, res) => {
  try {
    const {
      message,
      targetGroup,
      scheduleTime
    } = req.body;
    const adminId = req.user._id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Message is required'
      });
    }

    let userQuery = {};

    // Define target groups
    switch (targetGroup) {
      case 'all':
        userQuery = {};
        break;
      case 'active_customers':
        // Users who have placed orders in the last 6 months
        userQuery = {
          createdAt: {
            $gte: moment().subtract(6, 'months').toDate()
          }
        };
        break;
      case 'new_users':
        // Users registered in the last 30 days
        userQuery = {
          createdAt: {
            $gte: moment().subtract(30, 'days').toDate()
          }
        };
        break;
      default:
        userQuery = {};
    }

    const users = await User.find(userQuery).select('phone _id');
    const Address = require('../models/address.model');

    let phoneNumbers = [];

    // Collect phone numbers from users and their addresses
    for (const user of users) {
      if (user.phone) {
        phoneNumbers.push(user.phone);
      } else {
        // Fallback: Get phone from user's default address
        const userAddress = await Address.findOne({
          user: user._id,
          isDefault: true
        }).select('phone');

        if (userAddress && userAddress.phone) {
          phoneNumbers.push(userAddress.phone);
        }
      }
    }

    // Remove duplicates
    phoneNumbers = [...new Set(phoneNumbers)];

    if (phoneNumbers.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No users found with phone numbers'
      });
    }

    const options = {
      adminId,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : null
    };

    const result = await smsService.sendPromotionalSMS(phoneNumbers, message, options);

    res.status(200).json({
      status: 'success',
      message: 'Promotional SMS sent successfully',
      data: {
        batchId: result.batchId,
        messagesSent: result.messagesSent,
        recipients: result.recipients.length,
        cost: result.cost,
        balance: result.balance
      }
    });

  } catch (error) {
    console.error('Promotional SMS error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get SMS logs with pagination and filters
 */
exports.getSMSLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      phoneNumber,
      startDate,
      endDate,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};

    // Apply filters
    if (type && type !== 'all') {
      query.type = type;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (phoneNumber) {
      query.phoneNumber = {
        $regex: phoneNumber,
        $options: 'i'
      };
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      query.$or = [{
        message: {
          $regex: search,
          $options: 'i'
        }
      },
      {
        phoneNumber: {
          $regex: search,
          $options: 'i'
        }
      }
      ];
    }

    const [logs, total] = await Promise.all([
      SMSLog.find(query)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name email')
        .populate('orderId', 'orderNumber')
        .populate('adminId', 'name'),
      SMSLog.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasMore: parseInt(page) < totalPages
        }
      }
    });

  } catch (error) {
    console.error('Get SMS logs error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get SMS statistics
 */
exports.getSMSStats = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      period = 'week'
    } = req.query;

    let dateFilter = {};
    let groupBy = {};

    // Set date range
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to last 30 days
      dateFilter = {
        createdAt: {
          $gte: moment().subtract(30, 'days').toDate()
        }
      };
    }

    // Set grouping based on period
    switch (period) {
      case 'day':
        groupBy = {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        };
        break;
      case 'week':
        groupBy = {
          $dateToString: {
            format: "%Y-W%U",
            date: "$createdAt"
          }
        };
        break;
      case 'month':
        groupBy = {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt"
          }
        };
        break;
      default:
        groupBy = {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        };
    }

    const [basicStats, timeSeriesStats, typeStats] = await Promise.all([
      // Basic overall stats
      SMSLog.aggregate([{
        $match: dateFilter
      },
      {
        $group: {
          _id: null,
          totalSent: {
            $sum: 1
          },
          totalCost: {
            $sum: '$cost'
          },
          sentCount: {
            $sum: {
              $cond: [{
                $eq: ['$status', 'sent']
              }, 1, 0]
            }
          },
          failedCount: {
            $sum: {
              $cond: [{
                $eq: ['$status', 'failed']
              }, 1, 0]
            }
          },
          deliveredCount: {
            $sum: {
              $cond: [{
                $eq: ['$status', 'delivered']
              }, 1, 0]
            }
          }
        }
      }
      ]),

      // Time series data
      SMSLog.aggregate([{
        $match: dateFilter
      },
      {
        $group: {
          _id: groupBy,
          count: {
            $sum: 1
          },
          cost: {
            $sum: '$cost'
          },
          sent: {
            $sum: {
              $cond: [{
                $eq: ['$status', 'sent']
              }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{
                $eq: ['$status', 'failed']
              }, 1, 0]
            }
          }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
      ]),

      // SMS by type
      SMSLog.aggregate([{
        $match: dateFilter
      },
      {
        $group: {
          _id: '$type',
          count: {
            $sum: 1
          },
          cost: {
            $sum: '$cost'
          }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
      ])
    ]);

    // Get current balance
    let balance = null;
    try {
      const balanceInfo = await smsService.getBalance();
      balance = balanceInfo.balance;
    } catch (error) {
      console.error('Error getting balance:', error.message);
    }

    res.status(200).json({
      status: 'success',
      data: {
        overview: basicStats[0] || {
          totalSent: 0,
          totalCost: 0,
          sentCount: 0,
          failedCount: 0,
          deliveredCount: 0
        },
        timeSeries: timeSeriesStats,
        byType: typeStats,
        currentBalance: balance
      }
    });

  } catch (error) {
    console.error('Get SMS stats error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get SMS templates
 */
exports.getSMSTemplates = async (req, res) => {
  try {
    // Approved SMS templates for SMS Gateway Hub
    const templates = [{
      id: 'sgh_001',
      body: 'Dear {#var#}, Thanks for shopping with Tangerine Luxury. We have receipt your order request. Your order number is {#var#}.',
      title: 'Order Receipt - SMS Gateway Hub Approved',
      senderName: process.env.SMSGATEWAYHUB_SENDER_ID || 'WEBSMS',
      provider: 'smsgatewayhub',
      variables: ['customer_name', 'order_number'],
      isApproved: true,
      usage: 'Order confirmation messages'
    }, {
      id: 'sgh_002',
      body: 'Your order #{#var#} status updated to: {#var#}. Check details at {#var#} - Tangerine Luxury',
      title: 'Order Status Update - SMS Gateway Hub Approved',
      senderName: process.env.SMSGATEWAYHUB_SENDER_ID || 'WEBSMS',
      provider: 'smsgatewayhub',
      variables: ['order_number', 'status', 'website_url'],
      isApproved: true,
      usage: 'Order status update messages'
    }];

    res.status(200).json({
      status: 'success',
      data: {
        templates
      }
    });

  } catch (error) {
    console.error('Get SMS templates error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get SMS service health and balance
 */
exports.getSMSHealth = async (req, res) => {
  try {
    const health = await smsService.checkHealth();

    res.status(200).json({
      status: 'success',
      data: health
    });

  } catch (error) {
    console.error('SMS health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update SMS delivery status (webhook endpoint)
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const {
      batch_id,
      status,
      receipts
    } = req.body;

    if (!batch_id) {
      return res.status(400).json({
        status: 'fail',
        message: 'Batch ID is required'
      });
    }

    // Find SMS logs with this batch ID
    const smsLogs = await SMSLog.find({
      batchId: batch_id
    });

    // Update delivery status for each SMS
    for (const log of smsLogs) {
      const receipt = receipts?.find(r => r.number === log.phoneNumber);
      if (receipt) {
        await log.updateDeliveryStatus(receipt.status, receipt.reason);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Delivery status updated'
    });

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Test SMS functionality
 */
exports.testSMS = async (req, res) => {
  try {
    const {
      phoneNumber,
      message
    } = {
      phoneNumber: '918851984959',
      message: 'This is a test SMS from Tangerine Luxury.'
    }; //req.body;
    const adminId = '6851b2e25a9ac8c9b452b1e5'; //req.user._id;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        status: 'fail',
        message: 'Phone number and message are required'
      });
    }

    const testMessage = `TEST SMS: ${message} - Sent by Suman kumar`;

    const result = await smsService.sendCustomSMS(phoneNumber, testMessage, {
      adminId,
      test: true
    });

    res.status(200).json({
      status: 'success',
      message: 'Test SMS sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};