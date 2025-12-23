# Gmail Email Service Setup Guide

## ✅ Optimized Configuration for Gmail

Your email service is now specifically optimized for Gmail with:

- **Gmail Service Integration**: Uses `service: 'gmail'` for automatic configuration
- **Proper SSL/TLS**: Optimized security settings for Gmail
- **Rate Limiting**: Set to Gmail's 10 emails/second limit
- **Connection Pooling**: Efficient connection reuse
- **Gmail-specific Error Handling**: Clear error messages and solutions

## 📧 Gmail Configuration Steps

### 1. Enable 2-Factor Authentication (Required)

1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. This is **required** for App Passwords

### 2. Create Gmail App Password

1. Visit: [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select **"Mail"** as the app
3. Select **"Other"** as the device and name it "Tangerine Backend" 
4. Copy the **16-character password** (e.g., `abcd efgh ijkl mnop`)
5. **Use this App Password**, not your regular Gmail password

### 3. Update Your .env File

```env
# Gmail Configuration (REQUIRED)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # App Password from step 2
EMAIL_FROM="Tangerine Luxury" <your-gmail@gmail.com>

# Optional: For debugging
NODE_ENV=development
```

## 🔧 Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `EMAIL_USER` | `john@gmail.com` | Your full Gmail address |
| `EMAIL_PASS` | `abcd efgh ijkl mnop` | **App Password** (not regular password) |
| `EMAIL_FROM` | `"Company" <john@gmail.com>` | From address (use same Gmail) |

## ✅ Testing Your Gmail Setup

### 1. Start Backend Server
```bash
cd teenagerine_backend
npm start
```

**Look for these messages:**
- ✅ `Gmail SMTP connection verified successfully`
- ✅ `Email service initialized successfully`

### 2. Frontend Connection Test
1. Navigate to: `http://localhost:3000/admin/subscriptions`
2. Click **"Connection Test"** tab
3. Click **"Test Connection"** button
4. All 4 tests should pass with green checkmarks

### 3. Send Test Email
1. Go to **"Email Campaigns"** tab
2. Select subscribers or use "all"
3. Choose template: Newsletter/Promotional/Announcement
4. Click **"Send Campaign"**

## 🚨 Common Gmail Issues & Solutions

### Issue: "Invalid login" Error
```
❌ Gmail Authentication Error: Check your EMAIL_USER and EMAIL_PASS
```
**Solution:** 
- ✅ Use **App Password**, not regular password
- ✅ Enable 2-Factor Authentication first
- ✅ Double-check EMAIL_USER is your full Gmail address

### Issue: "Less secure app" Error
```
❌ Gmail Security Error: Enable App Passwords or use OAuth2
```
**Solution:**
- ✅ Use App Password (see setup steps above)
- ❌ Don't enable "Less secure apps" (deprecated by Google)

### Issue: "Unexpected socket close"
**Solution:** ✅ Already fixed with Gmail-optimized configuration

### Issue: Rate limiting / Too many emails
**Solution:** ✅ Built-in rate limiting (10 emails/second for Gmail)

## 📊 Gmail Limits & Best Practices

### Gmail Sending Limits
- **Daily Limit**: 2,000 emails per day (Gmail apps)
- **Rate Limit**: 10 emails per second (built into our service)
- **Recipient Limit**: 500 recipients per email

### Best Practices
- ✅ Use descriptive email subject lines
- ✅ Include unsubscribe links (built into templates)
- ✅ Monitor delivery rates
- ✅ Avoid spam trigger words
- ✅ Keep email lists clean

## 🛠️ Advanced Gmail Settings

If you need higher sending limits or professional features:

### Google Workspace (Paid)
- **Daily Limit**: 10,000 emails per day
- **Rate Limit**: Higher throughput
- **Professional**: Custom domain support
- **Cost**: ~$6/user/month

### Gmail API (Alternative)
For high-volume sending, consider switching to Gmail API:
- Higher rate limits
- Better deliverability
- More detailed analytics

## ✅ Success Checklist

Your Gmail setup is complete when you see:

- ✅ **Server Console**: "Gmail SMTP connection verified successfully"
- ✅ **Connection Test**: All 4 tests pass (API, Subscriptions, Email, Templates)
- ✅ **Email Sending**: Campaigns send without errors
- ✅ **No Socket Errors**: No "unexpected socket close" messages
- ✅ **Email Delivery**: Recipients receive emails in inbox (not spam)

## 🆘 Still Having Issues?

1. **Check App Password**: Make sure you're using the 16-character App Password
2. **Verify 2FA**: 2-Factor Authentication must be enabled
3. **Test Gmail Credentials**: Try logging into Gmail with same credentials
4. **Check Firewall**: Ensure port 465/587 isn't blocked
5. **Review Console Logs**: Look for specific error messages

The email service is now fully optimized for Gmail and should work reliably!