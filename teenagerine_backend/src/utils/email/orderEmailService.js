const emailService = require('./emailService');
const { generateAdminOrderNotification, generateCustomerOrderConfirmation } = require('./templates/orderTemplates');

class OrderEmailService {
  constructor() {
    this.adminEmail = process.env.EMAIL_ORDER_PLACE || 'skhiredev@gmail.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'skhiredev@gmail.com';
  }

  /**
   * Send order confirmation emails to both customer and admin
   * @param {Object} order - Populated order object
   * @param {Object} orderData - Raw order data from request (includes deliveryCharge, etc.)
   */
  async sendOrderConfirmationEmails(order, orderData = {}) {
    try {
      const deliveryCharge = orderData.deliveryCharge || 0;
      const results = [];

      // Send admin notification
      const adminResult = await this.sendAdminOrderNotification(order, deliveryCharge);
      results.push({ type: 'admin', ...adminResult });

      // Send customer confirmation
      const customerResult = await this.sendCustomerOrderConfirmation(order, deliveryCharge);
      results.push({ type: 'customer', ...customerResult });

      return {
        success: results.every(r => r.success),
        results
      };
    } catch (error) {
      console.error('Error sending order confirmation emails:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Send admin order notification
   */
  async sendAdminOrderNotification(order, deliveryCharge = 0) {
    try {
      const subject = `🛍️ New Order #${order.orderNumber} - ${order.user?.name || 'Customer'}`;
      const html = generateAdminOrderNotification(order, deliveryCharge);

      return await emailService.sendEmail({
        to: this.adminEmail,
        subject,
        html
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send customer order confirmation
   */
  async sendCustomerOrderConfirmation(order, deliveryCharge = 0) {
    try {
      if (!order.user?.email) {
        return { success: false, error: 'Customer email not available' };
      }

      const subject = `✅ Order Confirmation #${order.orderNumber} - Tangerine Luxury`;
      const html = generateCustomerOrderConfirmation(order, deliveryCharge);

      return await emailService.sendEmail({
        to: order?.user?.email,
        subject,
        html
      });
    } catch (error) {
      console.error('Error sending customer confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(order, previousStatus, additionalInfo = {}) {
    try {
      if (!order.user?.email) {
        return { success: false, error: 'Customer email not available' };
      }

      const statusMessages = {
        'Processing': '🔄 Your order is now being processed',
        'Shipped': '📦 Your order has been shipped',
        'Delivered': '✅ Your order has been delivered',
        'Cancelled': '❌ Your order has been cancelled'
      };

      const statusMessage = statusMessages[order.status] || `Order status updated to ${order.status}`;
      const subject = `${statusMessage} - Order #${order.orderNumber}`;

      let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Order Status Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">${statusMessage}</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 10px 10px;">
                <p>Dear ${order.user.name || 'Valued Customer'},</p>
                
                <p>Your order <strong>#${order.orderNumber}</strong> status has been updated.</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Previous Status:</strong> ${previousStatus}</p>
                    <p><strong>Current Status:</strong> <span style="color: #007bff; font-weight: 600;">${order.status}</span></p>
                    <p><strong>Updated:</strong> ${new Date().toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                </div>
      `;

      // Add tracking info if available
      if (additionalInfo.trackingNumber) {
        html += `
          <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #155724;">📦 Tracking Information</h4>
            <p style="margin: 0; color: #155724;">
              <strong>Tracking Number:</strong> ${additionalInfo.trackingNumber}<br>
              ${additionalInfo.carrier ? `<strong>Carrier:</strong> ${additionalInfo.carrier}<br>` : ''}
              ${additionalInfo.estimatedDelivery ? `<strong>Estimated Delivery:</strong> ${additionalInfo.estimatedDelivery}` : ''}
            </p>
          </div>
        `;
      }

      html += `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://192.168.1.6:8080'}/dashboard/orders/${order._id}" 
                       style="background: linear-gradient(45deg, #007bff, #0056b3); color: white; padding: 15px 25px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block;">
                        View Order Details
                    </a>
                </div>
                
                <p>Thank you for shopping with Tangerine Luxury!</p>
                
                <hr style="border: 1px solid #dee2e6; margin: 20px 0;">
                <p style="font-size: 14px; color: #6c757d;">
                    Need help? Contact us at <a href="mailto:sales@tangerineluxury.com">sales@tangerineluxury.com</a>
                </p>
            </div>
        </body>
        </html>
      `;

      return await emailService.sendEmail({
        to: order.user.email,
        subject,
        html
      });
    } catch (error) {
      console.error('Error sending status update:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk order notifications (for admin reports, etc.)
   */
  async sendBulkOrderNotifications(orders, type = 'daily_summary') {
    try {
      const summaryTypes = {
        daily_summary: {
          subject: `📊 Daily Orders Summary - ${new Date().toLocaleDateString()}`,
          title: 'Daily Orders Summary'
        },
        weekly_summary: {
          subject: `📈 Weekly Orders Summary - ${new Date().toLocaleDateString()}`,
          title: 'Weekly Orders Summary'
        },
        low_stock_alert: {
          subject: '⚠️ Low Stock Alert - Tangerine Luxury',
          title: 'Low Stock Alert'
        }
      };

      const config = summaryTypes[type] || summaryTypes.daily_summary;
      
      let html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
                <h1>${config.title}</h1>
                <p>${new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
            </div>
            
            <div style="padding: 20px;">
                <h2>Summary</h2>
                <ul>
                    <li><strong>Total Orders:</strong> ${orders.length}</li>
                    <li><strong>Total Revenue:</strong> ₹${orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toLocaleString()}</li>
                </ul>
                
                <h3>Recent Orders</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Order #</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Customer</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Amount</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${order.orderNumber}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${order.user?.name || 'N/A'}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">₹${order.totalAmount?.toLocaleString()}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${order.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
      `;

      return await emailService.sendEmail({
        to: this.adminEmail,
        subject: config.subject,
        html
      });
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new OrderEmailService();