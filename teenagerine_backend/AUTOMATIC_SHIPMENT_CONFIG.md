# Automatic Shipment Creation Configuration

This document explains how to configure automatic shipment creation for orders with your courier system integration.

## Overview

The system now supports:
- **New Order Number Format**: `ORD/2025/001`, `ORD/2025/002`, etc.
- **New Invoice Number Format**: `INV/2025/001`, `INV/2025/002`, etc.
- **Automatic Shipment Creation**: When enabled, orders are automatically registered with courier services
- **Automatic Tracking**: Orders get tracking numbers immediately upon creation

## Environment Configuration

Add these variables to your `.env` file:

```env
# === AUTOMATIC SHIPMENT CREATION ===
AUTO_CREATE_SHIPMENTS=true

# === COMPANY DETAILS (SENDER INFORMATION) ===
COMPANY_NAME=Tangerine Luxury
COMPANY_ADDRESS1=Your Business Address Line 1
COMPANY_ADDRESS2=Your Business Address Line 2
COMPANY_ADDRESS3=Your Business Address Line 3
COMPANY_PINCODE=400001
COMPANY_PHONE=1234567890
COMPANY_MOBILE=1234567890

# === BLUE DART API CONFIGURATION (For domestic India orders) ===
BLUEDART_API_URL=https://netconnect.bluedart.com/Ver1.10/Demo/ShippingAPI
BLUEDART_LICENSE_KEY=your_license_key_here
BLUEDART_LOGIN=your_login_id_here
BLUEDART_PASSWORD=your_password_here
BLUEDART_CUSTOMER_CODE=your_customer_code_here

# === DHL API CONFIGURATION (For international orders) ===
# Add DHL credentials if you have them configured
```

## How It Works

### 1. Order Placement
When a customer places an order:

1. **Order Number Generated**: `ORD/2025/001` format
2. **Order Saved**: Order is saved to database
3. **Emails Sent**: Confirmation emails to customer and admin
4. **SMS Sent**: Confirmation SMS to customer
5. **Stock Updated**: Product quantities are updated
6. **Automatic Shipment** (if enabled):
   - Shipment is created with appropriate courier (BlueDart for India, DHL for international)
   - Tracking number is assigned
   - Order status updated to "Processing"
   - Tracking URL is generated

### 2. Tracking
After automatic shipment creation:
- Orders immediately have tracking numbers
- Customers can track their orders via the tracking page
- Order status is automatically updated to "Processing"

### 3. Invoice Generation
When invoices are generated:
- **Invoice Number Generated**: `INV/2025/001` format
- PDF shows the proper invoice number instead of order number

## Admin Features

### Bulk Shipment Creation
For existing orders without tracking numbers, use the bulk creation endpoint:

**POST** `/api/orders/admin/bulk-create-shipments`

```json
{
  "orderIds": ["order_id_1", "order_id_2", "order_id_3"],
  "forceCreate": false
}
```

This will:
- Create shipments for all orders without existing tracking
- Skip orders that already have tracking (unless `forceCreate: true`)
- Return detailed results showing success/failure for each order

## Courier Service Selection

The system automatically selects courier services based on destination:

- **Domestic India (country = "IN")**: Uses BlueDart
- **International**: Uses DHL

## Troubleshooting

### Automatic Shipment Creation Not Working

1. **Check Environment Variable**:
   ```env
   AUTO_CREATE_SHIPMENTS=true
   ```

2. **Check Courier API Credentials**:
   - For India orders: Verify BlueDart credentials
   - For international: Verify DHL credentials

3. **Check Logs**:
   Look for these log messages:
   ```
   ✅ Automatic shipment created for order ORD/2025/001
   ✅ Order ORD/2025/001 updated with tracking number: 123456789
   ```

   Or error messages:
   ```
   ❌ Automatic shipment creation failed: [error message]
   ```

### Orders Not Trackable

1. **Check if shipment was created automatically**:
   - Look for tracking number in order details
   - Check order status (should be "Processing" if shipment created)

2. **Manually create shipments**:
   - Use the bulk shipment creation endpoint for existing orders
   - Or use the existing manual tracking addition feature

### API Errors

1. **BlueDart API Errors**:
   - Verify credentials in environment
   - Check if API endpoints are accessible
   - Verify customer code and license key

2. **Address Validation**:
   - Ensure shipping addresses have all required fields
   - Verify pincode format (6 digits for India)

## Manual Fallback

If automatic creation fails, the system falls back to the existing manual process:
1. Order is created successfully
2. Admin can manually add tracking via admin panel
3. Or use bulk shipment creation endpoint

## Testing

To test the system:

1. **Enable automatic creation**:
   ```env
   AUTO_CREATE_SHIPMENTS=true
   ```

2. **Configure test credentials** (use demo/sandbox APIs first)

3. **Place a test order**

4. **Check order details** for tracking information

5. **Verify tracking works** on your tracking page

## Security Notes

- Never commit API credentials to version control
- Use environment variables for all sensitive configuration
- Test with demo/sandbox APIs before using production credentials
- Monitor API usage and quotas

## Integration Status

✅ **Order Number Generation**: `ORD/2025/001` format
✅ **Invoice Number Generation**: `INV/2025/001` format
✅ **Automatic Shipment Creation**: Optional via environment variable
✅ **Bulk Shipment Creation**: Admin endpoint available
✅ **Courier Integration**: BlueDart (domestic) + DHL (international)
✅ **Tracking Integration**: Automatic tracking URL generation

The system is now ready for production use with proper courier integration!