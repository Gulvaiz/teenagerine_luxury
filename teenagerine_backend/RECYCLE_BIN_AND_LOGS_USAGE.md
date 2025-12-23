# Recycle Bin and Logs System Documentation

## Overview

This system provides two key features:
1. **Recycle Bin**: Stores all deleted data with metadata for recovery
2. **Logs**: Tracks all errors and activities from both backend and frontend

## Features

### Recycle Bin Features
- ✅ Stores complete deleted data with metadata
- ✅ Tracks who deleted, when, and why
- ✅ Records IP address and user agent
- ✅ Restore deleted items
- ✅ Auto-expiration after 90 days (configurable)
- ✅ Permanent delete option
- ✅ Statistics and filtering

### Logs Features
- ✅ Error tracking for backend and frontend
- ✅ Activity logging with user tracking
- ✅ Security event logging
- ✅ Performance monitoring
- ✅ Error statistics and dashboards
- ✅ Severity levels (critical, high, medium, low, info)
- ✅ Auto-cleanup after 180 days (configurable)

---

## API Endpoints

### Recycle Bin Endpoints

#### 1. Get All Deleted Items
```
GET /api/recycle-bin
```
**Query Parameters:**
- `modelName` - Filter by model name (e.g., "Product", "Brand")
- `includeRestored` - Include restored items (true/false)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `sortBy` - Sort field (default: "deletedAt")
- `order` - Sort order (asc/desc, default: "desc")

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "page": 1,
  "pages": 10,
  "data": [...]
}
```

#### 2. Get Deleted Items by Model
```
GET /api/recycle-bin/model/:modelName
```

#### 3. Get Single Deleted Item
```
GET /api/recycle-bin/:id
```

#### 4. Restore Deleted Item
```
POST /api/recycle-bin/:id/restore
```

#### 5. Permanently Delete Item
```
DELETE /api/recycle-bin/:id
```

#### 6. Empty Recycle Bin
```
DELETE /api/recycle-bin/empty?daysOld=90&modelName=Product
```

#### 7. Get Statistics
```
GET /api/recycle-bin/stats
```

### Logs Endpoints

#### 1. Get All Logs
```
GET /api/logs
```
**Query Parameters:**
- `logType` - Filter by type (error, warning, info, debug, activity, security, performance)
- `source` - Filter by source (backend, frontend)
- `severity` - Filter by severity (critical, high, medium, low, info)
- `environment` - Filter by environment
- `isResolved` - Filter by resolution status
- `startDate` - Start date filter
- `endDate` - End date filter
- `userId` - Filter by user
- `endpoint` - Filter by endpoint
- `page`, `limit`, `sortBy`, `order`

#### 2. Create Log (Frontend Error Logging)
```
POST /api/logs
```
**Body:**
```json
{
  "logType": "error",
  "source": "frontend",
  "severity": "high",
  "message": "Cannot read property 'x' of undefined",
  "errorCode": "TypeError",
  "stackTrace": "...",
  "pageUrl": "https://example.com/products",
  "component": "ProductList",
  "browser": "Chrome 120",
  "os": "Windows 10",
  "device": "desktop",
  "screenSize": "1920x1080",
  "metadata": {}
}
```

#### 3. Get Log by ID
```
GET /api/logs/:id
```

#### 4. Mark Log as Resolved
```
PATCH /api/logs/:id/resolve
```
**Body:**
```json
{
  "resolutionNotes": "Fixed in version 1.2.3"
}
```

#### 5. Delete Log
```
DELETE /api/logs/:id
```

#### 6. Cleanup Old Logs
```
DELETE /api/logs/cleanup?daysOld=180&logType=error&severity=low
```

#### 7. Get Error Statistics
```
GET /api/logs/stats/errors
```

#### 8. Get Dashboard Statistics
```
GET /api/logs/stats/dashboard?days=7
```

#### 9. Get Recent Activity
```
GET /api/logs/activity/recent?limit=50&userId=123
```

---

## Usage Examples

### 1. Using Recycle Bin Helper in Controllers

#### Example: Update Brand Controller with Recycle Bin

```javascript
const Brand = require("../models/brand.model");
const { deleteWithRecycleBin } = require("../utils/recycleBin.helper");
const Logger = require("../utils/logger.helper");

// DELETE brand with recycle bin support
exports.deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete with recycle bin support
    const result = await deleteWithRecycleBin(Brand, id, req, {
      reason: "Admin deleted brand",
      metadata: { controller: "brand.controller" }
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    await Logger.error({
      message: "Failed to delete brand",
      error,
      req,
      severity: "high",
    });

    res.status(500).json({
      success: false,
      message: "Error deleting brand",
      error: error.message,
    });
  }
};
```

### 2. Manual Recycle Bin Usage

```javascript
const RecycleBin = require("../models/recycleBin.model");
const { moveToRecycleBin } = require("../utils/recycleBin.helper");

// Before deleting a document
const product = await Product.findById(productId);

// Move to recycle bin
await moveToRecycleBin("Product", product, req, {
  reason: "Discontinued product",
  metadata: {
    category: product.category,
    price: product.price
  }
});

// Then delete from original collection
await Product.findByIdAndDelete(productId);
```

### 3. Using Logger Helper

#### Log an Error
```javascript
const Logger = require("../utils/logger.helper");

try {
  // Your code here
} catch (error) {
  await Logger.error({
    message: "Failed to process payment",
    error,
    req,
    severity: "critical",
    file: "payment.controller.js",
    function: "processPayment",
    line: 145,
    metadata: { orderId, amount }
  });
}
```

#### Log an Activity
```javascript
await Logger.activity({
  message: "User created new product",
  req,
  userId: req.user._id,
  severity: "info",
  metadata: {
    productId: newProduct._id,
    productName: newProduct.name
  }
});
```

#### Log a Security Event
```javascript
await Logger.security({
  message: "Multiple failed login attempts detected",
  req,
  severity: "high",
  metadata: {
    email: req.body.email,
    attempts: 5
  }
});
```

#### Log Performance
```javascript
const startTime = Date.now();
// ... your code
const responseTime = Date.now() - startTime;

await Logger.performance({
  message: "Slow API response detected",
  req,
  responseTime,
  metadata: { endpoint: req.originalUrl }
});
```

### 4. Frontend Error Logging

```javascript
// In your frontend error handler
async function logErrorToBackend(error, componentInfo) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logType: 'error',
        source: 'frontend',
        severity: 'high',
        message: error.message,
        errorCode: error.name,
        stackTrace: error.stack,
        pageUrl: window.location.href,
        component: componentInfo.componentName,
        browser: navigator.userAgent,
        os: navigator.platform,
        device: /Mobile|Android|iOS/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        metadata: {
          userState: componentInfo.userState,
          route: window.location.pathname
        }
      })
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}

// React Error Boundary Example
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logErrorToBackend(error, {
      componentName: errorInfo.componentStack,
      userState: this.props.user
    });
  }
}
```

### 5. Restoring from Recycle Bin

```javascript
const { restoreFromRecycleBin } = require("../utils/recycleBin.helper");

// Restore an item
const restoredProduct = await restoreFromRecycleBin(recycleBinId, req);

console.log(`Restored ${restoredProduct.name}`);
```

---

## Integration with Existing Controllers

### Example: Update Product Delete Function

**Before:**
```javascript
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Product deleted"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

**After (with Recycle Bin & Logging):**
```javascript
const { deleteWithRecycleBin } = require("../utils/recycleBin.helper");
const Logger = require("../utils/logger.helper");

exports.deleteProduct = async (req, res) => {
  try {
    const result = await deleteWithRecycleBin(
      Product,
      req.params.id,
      req,
      {
        reason: req.body.reason || "Deleted by admin",
        metadata: { adminId: req.user._id }
      }
    );

    res.status(200).json({
      success: true,
      message: result.message,
      recycleBinId: result.recycleBinId
    });
  } catch (error) {
    await Logger.error({
      message: "Failed to delete product",
      error,
      req,
      severity: "high",
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

## Database Collections

### RecycleBin Collection
```javascript
{
  _id: ObjectId,
  modelName: "Product",
  originalId: ObjectId("..."),
  deletedData: { /* complete product data */ },
  deletedBy: ObjectId("userId"),
  deletedAt: ISODate("2025-01-15T10:30:00Z"),
  deletionReason: "Product discontinued",
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  isRestored: false,
  restoredAt: null,
  restoredBy: null,
  expiresAt: ISODate("2025-04-15T10:30:00Z"),
  metadata: {},
  createdAt: ISODate("2025-01-15T10:30:00Z"),
  updatedAt: ISODate("2025-01-15T10:30:00Z")
}
```

### Logs Collection
```javascript
{
  _id: ObjectId,
  logType: "error",
  source: "backend",
  severity: "high",
  message: "Database connection failed",
  errorCode: "ECONNREFUSED",
  stackTrace: "Error: connect ECONNREFUSED...",
  location: {
    file: "db.js",
    function: "connectDB",
    line: 25,
    endpoint: "/api/products",
    method: "GET"
  },
  occurredAt: ISODate("2025-01-15T10:30:00Z"),
  userId: ObjectId("userId"),
  request: {
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    headers: {},
    body: {},
    query: {},
    requestId: "req-123"
  },
  response: {
    statusCode: 500,
    responseTime: 1500
  },
  isResolved: false,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNotes: "",
  tags: ["database", "critical"],
  occurrenceCount: 1,
  expiresAt: ISODate("2025-07-15T10:30:00Z"),
  environment: "production",
  metadata: {},
  createdAt: ISODate("2025-01-15T10:30:00Z"),
  updatedAt: ISODate("2025-01-15T10:30:00Z")
}
```

---

## Best Practices

### 1. Always Use Logger for Errors
```javascript
// DON'T
console.error("Error:", error);

// DO
await Logger.error({ message: "Error occurred", error, req, severity: "high" });
```

### 2. Log Important Activities
```javascript
// After creating/updating important data
await Logger.activity({
  message: "User updated profile",
  req,
  severity: "info",
  metadata: { userId, changedFields: ["email", "phone"] }
});
```

### 3. Use Appropriate Severity Levels
- `critical`: System failures, data loss
- `high`: Important errors, failed transactions
- `medium`: Recoverable errors, warnings
- `low`: Minor issues, deprecation warnings
- `info`: General information, successful operations

### 4. Include Metadata
Always include relevant context in metadata for debugging:
```javascript
await Logger.error({
  message: "Payment processing failed",
  error,
  req,
  severity: "critical",
  metadata: {
    orderId,
    amount,
    paymentGateway: "stripe",
    customerId
  }
});
```

### 5. Cleanup Old Data Regularly
Set up a cron job to clean old logs and recycle bin items:
```javascript
// In a scheduled job
const Logs = require("./models/logs.model");
const RecycleBin = require("./models/recycleBin.model");

// Clean logs older than 180 days
await Logs.permanentlyDeleteOld(180);

// Clean recycle bin older than 90 days
await RecycleBin.permanentlyDeleteOld(90);
```

---

## Environment Variables

Add these to your `.env` file if you want to customize:

```env
# Recycle bin retention (in days)
RECYCLE_BIN_RETENTION_DAYS=90

# Logs retention (in days)
LOGS_RETENTION_DAYS=180

# Enable/disable logging
ENABLE_ERROR_LOGGING=true
ENABLE_ACTIVITY_LOGGING=true
```

---

## Security Considerations

1. **Authentication Required**: All recycle bin and logs endpoints require admin authentication
2. **Data Sanitization**: Passwords and sensitive data are automatically removed from logs
3. **IP Tracking**: IP addresses are logged for security auditing
4. **Auto-Expiration**: Old data is automatically deleted to prevent storage issues
5. **Frontend Logging**: Public endpoint is available for frontend error logging (rate-limited)

---

## Testing

### Test Recycle Bin
```bash
# Delete a brand
DELETE /api/brands/:id

# View in recycle bin
GET /api/recycle-bin?modelName=Brand

# Restore it
POST /api/recycle-bin/:recycleBinId/restore

# Verify restoration
GET /api/brands/:id
```

### Test Logging
```bash
# Create a test error log
POST /api/logs
{
  "logType": "error",
  "source": "frontend",
  "message": "Test error",
  "severity": "low"
}

# View logs
GET /api/logs?logType=error&source=frontend

# View dashboard
GET /api/logs/stats/dashboard?days=7
```

---

## Monitoring Dashboard Queries

### Get Error Summary
```bash
GET /api/logs/stats/dashboard?days=7
```

### Get Recent Errors
```bash
GET /api/logs?logType=error&isResolved=false&limit=20
```

### Get Critical Errors
```bash
GET /api/logs?severity=critical&isResolved=false
```

### Get User Activity
```bash
GET /api/logs/activity/recent?userId=123&limit=50
```

---

## Troubleshooting

### Issue: Logs not being created
- Check if Logger is imported correctly
- Ensure MongoDB connection is active
- Verify environment variables

### Issue: Recycle bin not working
- Ensure user is authenticated
- Check if the model name is correct
- Verify MongoDB permissions

### Issue: Restoration fails
- Check if item with same ID already exists
- Verify data validation rules
- Check MongoDB logs for errors

---

## Support

For issues or questions, contact the development team or create an issue in the project repository.
