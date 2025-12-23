# BlueDart Integration Setup Guide

This guide explains how to set up BlueDart integration for automatic pickup registration and shipment management.

## Environment Variables

Add the following environment variables to your `.env` file:

### BlueDart API Credentials
```env
# BlueDart API Authentication
BLUEDART_CLIENT_ID=your_bluedart_client_id
BLUEDART_CLIENT_SECRET=your_bluedart_client_secret
BLUEDART_API_KEY=your_bluedart_api_key
BLUEDART_LOGIN_ID=your_bluedart_login_id
```

### Pickup Location Configuration (SECURE - NOT SHARED WITH CLIENT)
```env
# BlueDart Pickup Location Details
BLUEDART_PICKUP_CONTACT="Tangerine Warehouse"
BLUEDART_PICKUP_ADDRESS1="House No. 1473"
BLUEDART_PICKUP_ADDRESS2="Sector 14"
BLUEDART_PICKUP_ADDRESS3="Faridabad"
BLUEDART_PICKUP_PINCODE="121007"
BLUEDART_PICKUP_PHONE="9999999999"
BLUEDART_PICKUP_MOBILE="9999999999"
BLUEDART_PICKUP_AREA="DEL"
BLUEDART_PICKUP_COMPANY="Tangerine Luxury"
BLUEDART_PICKUP_EMAIL="warehouse@tangerine.com"
BLUEDART_CUSTOMER_CODE="099960"
```

## How It Works

### Automatic Pickup Registration
1. **Order Creation**: User places an order
2. **Admin Confirmation**: When admin changes order status to "Processing"
3. **Automatic Pickup**: System automatically registers pickup with BlueDart
4. **Secure Location**: Uses configured pickup location (House No. 1473, Sector 14, Faridabad 121007)
5. **Notification**: System logs success/failure, updates order with pickup information

### Order Workflow Integration
```
Order Created (Pending)
    ↓
Admin Changes Status to "Processing"
    ↓
🚚 BlueDart Pickup Automatically Registered
    ↓
Pickup Scheduled (Tomorrow 4 PM by default)
    ↓
BlueDart Collects Package from Warehouse
    ↓
Package Delivered to Customer
```

## API Endpoints

### Admin Endpoints
- `POST /api/orders/:orderId/bluedart/pickup` - Manually register pickup
- `DELETE /api/orders/:orderId/bluedart/pickup` - Cancel pickup
- `POST /api/orders/:orderId/bluedart/waybill` - Generate waybill

### User/Admin Endpoints
- `GET /api/orders/:orderId/bluedart/pickup` - Get pickup status

## Order Model Updates

New fields added to Order model:
```javascript
blueDartPickup: {
  tokenNumber: String,          // BlueDart pickup token
  status: String,               // Pickup status
  registeredAt: Date,           // When pickup was registered
  pickupDate: String,           // Scheduled pickup date
  pickupTime: String,           // Scheduled pickup time
  numberOfPieces: Number,       // Number of items
  weight: Number,               // Estimated weight
  cancelled: Boolean,           // Is pickup cancelled
  cancellationReason: String    // Why was it cancelled
},
blueDartWaybill: {
  awbNumber: String,            // Air Waybill number
  status: String,               // Waybill status
  generatedAt: Date,            // When waybill was generated
  waybillData: Object           // Full waybill response
},
blueDartErrors: [{
  type: String,                 // Error type
  error: String,                // Error message
  timestamp: Date               // When error occurred
}]
```

## Features

### 🔄 Automatic Operations
- **Auto Pickup Registration**: When order status changes to "Processing"
- **Auto Pickup Cancellation**: When order is cancelled
- **Error Handling**: Logs failures without breaking order flow
- **Retry Logic**: Built-in error handling and logging

### 📦 Pickup Management
- **Secure Location**: Pickup address never exposed to client
- **Smart Scheduling**: Next day pickup by default at 4 PM
- **Weight Estimation**: Automatic weight calculation (0.5kg per item)
- **Multiple Items**: Handles multiple items in single pickup

### 📋 Waybill Generation
- **AWB Numbers**: Automatic Air Waybill number generation
- **Tracking Integration**: Links with existing tracking system
- **PDF Generation**: Waybill documents for shipping

### 🔍 Tracking & Status
- **Real-time Status**: Track pickup registration status
- **Error Logging**: Comprehensive error tracking
- **Admin Controls**: Manual pickup management for admins

## Security Features

### 🔒 Information Protection
- **Hidden Pickup Location**: Warehouse address never sent to client
- **Secure API Keys**: All credentials stored in environment variables
- **Admin-Only Controls**: Sensitive operations restricted to admins
- **Error Isolation**: API failures don't affect order processing

### 🛡️ Error Handling
- **Graceful Failures**: Orders still process if BlueDart API fails
- **Detailed Logging**: All errors logged with timestamps
- **Retry Capability**: Manual retry options for failed operations
- **Status Tracking**: Clear status indicators for all operations

## Configuration Examples

### Development Environment
```env
# Use test credentials for development
BLUEDART_CLIENT_ID=test_client_id
BLUEDART_CLIENT_SECRET=test_client_secret
BLUEDART_API_KEY=TEST_API_KEY
BLUEDART_LOGIN_ID=TEST_LOGIN
```

### Production Environment
```env
# Use live credentials for production
BLUEDART_CLIENT_ID=live_client_id
BLUEDART_CLIENT_SECRET=live_client_secret
BLUEDART_API_KEY=LIVE_API_KEY
BLUEDART_LOGIN_ID=LIVE_LOGIN
```

## Testing

### Manual Testing
1. Create a test order
2. Change order status to "Processing"
3. Check console logs for pickup registration
4. Verify order has `blueDartPickup` data
5. Test pickup cancellation by changing status to "Cancelled"

### Admin Testing
Use admin endpoints to manually test:
```bash
# Register pickup manually
POST /api/orders/ORDER_ID/bluedart/pickup

# Check pickup status
GET /api/orders/ORDER_ID/bluedart/pickup

# Cancel pickup
DELETE /api/orders/ORDER_ID/bluedart/pickup
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check `BLUEDART_CLIENT_ID` and `BLUEDART_CLIENT_SECRET`
   - Verify API credentials are active

2. **Pickup Registration Fails**
   - Check pickup location configuration
   - Verify `BLUEDART_CUSTOMER_CODE` is correct
   - Check BlueDart service availability

3. **Orders Not Triggering Pickup**
   - Ensure status change is to "Processing"
   - Check if pickup already exists for order
   - Verify order has shipping address

### Debug Logs
Enable detailed logging by checking console output:
- ✅ Success messages start with checkmark
- ❌ Error messages start with X mark
- ℹ️ Info messages for skipped operations
- 🚚 BlueDart-specific operations

## Support

For BlueDart API issues:
- Check BlueDart developer documentation
- Verify account status and API limits
- Contact BlueDart support for API problems

For integration issues:
- Check environment variables
- Verify order model updates
- Review console logs for errors