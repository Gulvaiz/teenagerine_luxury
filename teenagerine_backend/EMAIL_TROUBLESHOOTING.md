# Email Service Troubleshooting Guide

## Fixed Issues ✅

The "Unexpected socket close" error has been resolved with the following improvements:

### 1. **SMTP Configuration Fixes**
- **Port Changed**: From `465` to `587` (STARTTLS instead of SSL)
- **Connection Pooling**: Added `pool: true` with 5 max connections
- **Timeout Settings**: Added comprehensive timeout configuration
- **Rate Limiting**: Limited to 14 emails per second
- **TLS Configuration**: Added proper cipher and security settings

### 2. **Retry Logic Added**
- **Connection Testing**: 3 retry attempts with progressive delays
- **Email Sending**: 3 retry attempts per email
- **Socket Error Detection**: Automatic transporter reinitialization on socket errors
- **Progressive Delays**: 1s, 2s, 3s delays between retries

### 3. **Error Handling Improvements**
- **Specific Error Detection**: Handles "Unexpected socket close" and "ECONNRESET"
- **Transporter Reset**: Automatically reinitializes on connection failures
- **Development Fallback**: Uses Ethereal test accounts when real SMTP fails

## Environment Configuration

Make sure your `.env` file has the correct settings:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Tangerine Luxury" <newsletter@tangerineluxury.com>

# For Gmail, use App Passwords instead of regular password
# Enable 2FA and create an App Password at: https://myaccount.google.com/apppasswords
```

## Common SMTP Settings

### Gmail (Recommended)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### Outlook/Hotmail
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

### Yahoo
```
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
```

## Testing the Email Service

### 1. Backend Server Test
Start your backend server and check the console:
- ✅ Should see: "Email service initialized successfully"
- ❌ If failed: Check SMTP credentials and network connection

### 2. Frontend Connection Test
1. Navigate to: `http://localhost:3000/admin/subscriptions`
2. Click on "Connection Test" tab
3. Click "Test Connection" button
4. All tests should pass with green checkmarks

### 3. Send Test Email
1. Go to "Email Campaigns" tab
2. Select a subscriber or use "all"
3. Choose a template (Newsletter/Promotional/Announcement)
4. Send campaign

## Troubleshooting Steps

### If emails still fail to send:

1. **Check Gmail App Passwords** (if using Gmail):
   - Enable 2-Factor Authentication
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Use App Password instead of regular password

2. **Verify Network/Firewall**:
   ```bash
   telnet smtp.gmail.com 587
   ```

3. **Check Environment Variables**:
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_HOST
   echo $EMAIL_PORT
   ```

4. **Test SMTP Credentials**:
   - Use an email client (Thunderbird, Outlook) with same credentials
   - If they work in email client, they should work in the app

### If connection test fails:

1. **Backend not running**: Make sure `npm start` is running in backend folder
2. **CORS issues**: Check if frontend can reach backend
3. **Port conflicts**: Make sure port 5000 is available
4. **Authentication**: Make sure you're logged in as admin

## Performance Improvements

The updated email service now includes:

- **Connection Pooling**: Reuses connections for better performance
- **Rate Limiting**: Prevents overwhelming email providers
- **Batch Processing**: Sends emails in batches of 50
- **Timeout Management**: Prevents hanging connections
- **Automatic Recovery**: Handles temporary network issues

## Success Indicators

Your email service is working correctly when:

✅ **Server starts without SMTP errors**  
✅ **Connection test passes all checks**  
✅ **Email campaigns send successfully**  
✅ **No "socket close" errors in logs**  
✅ **Email delivery confirmations received**  

## Next Steps

If you continue to have issues:

1. **Enable Debug Mode**: Add `debug: true` to transporter config
2. **Check Email Provider Logs**: Gmail, Outlook, etc. have sending logs
3. **Try Alternative SMTP**: Test with Ethereal.email for development
4. **Contact Email Provider**: Some providers require enabling "less secure apps"

The email service is now much more robust and should handle temporary network issues gracefully!