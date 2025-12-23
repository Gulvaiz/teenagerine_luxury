# Admin Courier Service Management Guide

## ❌ **Current Issue: "Tracking service unavailable: DHL API credentials not configured"**

This error occurs because courier service credentials are not properly configured. This guide helps you fix it.

---

## **🚨 Quick Fix for Current Error**

### **The Problem:**
- DHL API credentials are missing
- System tries to use DHL for tracking but fails
- Users see "ERROR" instead of tracking information

### **Immediate Solutions:**

#### **Option 1: Configure DHL Credentials (Recommended)**
Add these to your `.env` file:
```env
# DHL API Configuration
DHL_API_KEY=your_dhl_api_key_here
DHL_API_SECRET=your_dhl_api_secret_here
DHL_API_BASE_URL=https://api-eu.dhl.com
```

#### **Option 2: Configure BlueDart Only (For India orders only)**
Add these to your `.env` file:
```env
# BlueDart API Configuration
BLUEDART_API_URL=https://netconnect.bluedart.com/Ver1.10/Demo/ShippingAPI
BLUEDART_LICENSE_KEY=your_license_key_here
BLUEDART_LOGIN=your_login_id_here
BLUEDART_PASSWORD=your_password_here
BLUEDART_CUSTOMER_CODE=your_customer_code_here
```

#### **Option 3: Disable Automatic Shipment Creation (Temporary)**
Add this to your `.env` file:
```env
# Disable automatic courier integration
AUTO_CREATE_SHIPMENTS=false
```

---

## **🛠️ Admin API Endpoints**

### **Check Courier Status**
```
GET /api/admin/courier-status
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "courierStatus": {
      "bluedart": {
        "name": "BlueDart",
        "configured": false,
        "credentials": {
          "hasLicenseKey": false,
          "hasLogin": false,
          "hasCustomerCode": false
        },
        "status": "Available for domestic India orders"
      },
      "dhl": {
        "name": "DHL Express",
        "configured": false,
        "credentials": {
          "hasApiKey": false,
          "hasApiSecret": false
        },
        "status": "Available for international orders"
      }
    },
    "statistics": {
      "recentOrders": 25,
      "ordersWithTracking": 5,
      "trackingRate": 20
    },
    "recommendations": [
      {
        "type": "critical",
        "service": "System",
        "message": "No courier services are properly configured.",
        "action": "Configure at least one courier service to enable real-time tracking."
      }
    ]
  }
}
```

### **Test Courier Services**
```
POST /api/admin/courier-test
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "testResults": {
      "bluedart": {
        "name": "BlueDart",
        "status": "error",
        "message": "BlueDart API credentials not configured",
        "configured": false
      },
      "dhl": {
        "name": "DHL",
        "status": "error",
        "message": "DHL API credentials not configured",
        "configured": false
      }
    },
    "summary": {
      "totalServices": 2,
      "healthyServices": 0,
      "configuredServices": 0
    }
  }
}
```

---

## **📋 Step-by-Step Configuration**

### **Step 1: Choose Your Courier Strategy**

#### **Strategy A: Full Configuration (Recommended)**
- ✅ BlueDart for domestic India orders
- ✅ DHL for international orders
- ✅ Automatic shipment creation
- ✅ Real-time tracking

#### **Strategy B: India-Only Configuration**
- ✅ BlueDart for all orders
- ❌ No international tracking
- ⚠️ Limited to domestic India

#### **Strategy C: Manual Tracking Only**
- ❌ No automatic courier integration
- ✅ Admin manually adds tracking numbers
- ⚠️ No real-time updates

### **Step 2: Get Courier Credentials**

#### **For BlueDart:**
1. Register at [BlueDart Developer Portal](https://www.bluedart.com)
2. Get API credentials:
   - License Key
   - Login ID
   - Customer Code
   - Password (for shipment creation)

#### **For DHL:**
1. Register at [DHL Developer Portal](https://developer.dhl.com)
2. Get API credentials:
   - API Key
   - API Secret

### **Step 3: Configure Environment Variables**

Create/update your `.env` file:

```env
# === COURIER CONFIGURATION ===

# Automatic shipment creation (true/false)
AUTO_CREATE_SHIPMENTS=true

# BlueDart Configuration (for domestic India)
BLUEDART_API_URL=https://netconnect.bluedart.com/Ver1.10/Demo/ShippingAPI
BLUEDART_LICENSE_KEY=your_actual_license_key
BLUEDART_LOGIN=your_actual_login
BLUEDART_PASSWORD=your_actual_password
BLUEDART_CUSTOMER_CODE=your_actual_customer_code

# DHL Configuration (for international)
DHL_API_KEY=your_actual_api_key
DHL_API_SECRET=your_actual_api_secret
DHL_API_BASE_URL=https://api-eu.dhl.com

# Company details (for shipment creation)
COMPANY_NAME=Tangerine Luxury
COMPANY_ADDRESS1=Your Business Address
COMPANY_PINCODE=400001
COMPANY_PHONE=1234567890
```

### **Step 4: Test Configuration**

1. **Restart your application** after updating `.env`
2. **Call test endpoint:**
   ```bash
   curl -X POST /api/admin/courier-test \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```
3. **Check results:**
   - `configured: true` = Credentials added ✅
   - `status: "healthy"` = API working ✅
   - `status: "error"` = Check credentials ❌

---

## **🎮 Admin Dashboard Integration**

### **Monitor Courier Health**
Add to your admin dashboard:

```javascript
// Check courier status
const checkCourierStatus = async () => {
  const response = await fetch('/api/admin/courier-status', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const data = await response.json();

  // Display courier status cards
  displayCourierCards(data.courierStatus);

  // Show recommendations
  displayRecommendations(data.recommendations);
};
```

### **Display Courier Status Cards**
```jsx
const CourierStatusCard = ({ courier }) => (
  <div className={`card ${courier.configured ? 'success' : 'error'}`}>
    <h3>{courier.name}</h3>
    <p>Status: {courier.configured ? '✅ Configured' : '❌ Not Configured'}</p>
    <p>Type: {courier.type}</p>
    {!courier.configured && (
      <button onClick={showConfigGuide}>Configure Now</button>
    )}
  </div>
);
```

---

## **🚀 Fallback System (Current Implementation)**

When courier APIs are unavailable, the system provides:

### **Fallback Tracking Information:**
- ✅ Order status-based tracking
- ✅ Basic timeline events
- ✅ System-generated status updates
- ⚠️ Notice: "Real-time tracking temporarily unavailable"

### **Status Mapping:**
- `Pending` → "Order is being prepared for shipment"
- `Processing` → "Order is being processed"
- `Shipped` → "Package has been shipped and is in transit"
- `Delivered` → "Package has been delivered"
- `Cancelled` → "Order has been cancelled"

---

## **🎯 Troubleshooting**

### **"DHL API credentials not configured"**
**Solution:** Add `DHL_API_KEY` and `DHL_API_SECRET` to `.env`

### **"BlueDart API credentials not configured"**
**Solution:** Add `BLUEDART_LICENSE_KEY`, `BLUEDART_LOGIN`, and `BLUEDART_CUSTOMER_CODE` to `.env`

### **Orders not getting tracking numbers**
**Solutions:**
1. Check `AUTO_CREATE_SHIPMENTS=true` in `.env`
2. Verify at least one courier service is configured
3. Use manual tracking addition as backup

### **Tracking shows "ERROR" or "UNKNOWN"**
**Solutions:**
1. Check courier API credentials
2. Test courier connectivity via admin endpoint
3. Use fallback mode temporarily

### **International orders not working**
**Solutions:**
1. Configure DHL credentials
2. Or disable international orders
3. Or handle manually

---

## **📊 Monitoring & Maintenance**

### **Weekly Checks:**
1. **Test courier connectivity**
2. **Check tracking success rate**
3. **Review failed orders**
4. **Monitor API usage/quotas**

### **Monthly Reviews:**
1. **Update API credentials if needed**
2. **Review courier performance**
3. **Optimize courier selection rules**
4. **Check for new courier integrations**

---

## **🎪 Best Practices**

### **Production Configuration:**
```env
# Use production URLs
BLUEDART_API_URL=https://netconnect.bluedart.com/Ver1.10/ShippingAPI
DHL_API_BASE_URL=https://api-eu.dhl.com

# Enable automatic shipments
AUTO_CREATE_SHIPMENTS=true

# Configure proper company details
COMPANY_NAME=Your Actual Company Name
COMPANY_ADDRESS1=Your Real Address
```

### **Development/Testing:**
```env
# Use demo/sandbox URLs when available
BLUEDART_API_URL=https://netconnect.bluedart.com/Ver1.10/Demo/ShippingAPI

# Disable automatic shipments for testing
AUTO_CREATE_SHIPMENTS=false
```

### **Security:**
- ✅ Never commit credentials to version control
- ✅ Use environment variables only
- ✅ Rotate API keys regularly
- ✅ Monitor API usage for suspicious activity

---

## **💡 Quick Actions for Admin**

### **Immediate Fix (5 minutes):**
1. Add `AUTO_CREATE_SHIPMENTS=false` to `.env`
2. Restart application
3. Orders will use fallback tracking

### **Full Fix (30 minutes):**
1. Get courier API credentials
2. Add to `.env` file
3. Test via admin endpoint
4. Enable automatic shipments
5. Monitor tracking success rate

### **Emergency Mode:**
If all courier services fail, the system automatically falls back to order status-based tracking, so customers still get meaningful tracking information.

**Your tracking system is now admin-controlled and error-resistant!** 🛡️