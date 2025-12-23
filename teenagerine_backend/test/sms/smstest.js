// Placeholder implementation for smstest.js

module.exports = {
    sendTestSMS: (phoneNumber, message) => {
        console.log(`Sending test SMS to ${phoneNumber}: ${message}`);
        return Promise.resolve({ success: true });
    },
};