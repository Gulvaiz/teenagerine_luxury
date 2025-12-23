const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAddressHtml = (address, title) => {
  if (!address) return `<p><strong>${title}:</strong> Not provided</p>`;

  return `
    <div style="margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
      <h4 style="margin: 0 0 10px 0; color: #333;">${title}</h4>
      <div style="line-height: 1.6;">
        <strong>${address.name || ""}</strong><br>
        ${address.addressLine1 || ""}<br>
        ${address.addressLine2 ? `${address.addressLine2}<br>` : ""}
        ${address.city || ""}, ${address.state || ""} ${
    address.postalCode || ""
  }<br>
        ${address.country || ""}<br>
        ${address.phone ? `<strong>Phone:</strong> ${address.phone}<br>` : ""}
        ${address.email ? `<strong>Email:</strong> ${address.email}` : ""}
      </div>
    </div>
  `;
};

const getProductTableHtml = (items) => {
  if (!items || items.length === 0) {
    return "<p>No items found</p>";
  }

  const productRows = items
    .map((item) => {
      const product = item.productId;
      const subtotal = item.quantity * item.price;

      return `
      <tr style="border-bottom: 1px solid #e9ecef;">
        <td style="padding: 12px; text-align: left;">
          <div>
            <strong>${product?.name || "Unknown Product"}</strong>
            ${
              product?.sku
                ? `<br><small style="color: #666;">SKU: ${product.sku}</small>`
                : ""
            }
          </div>
        </td>
        <td style="padding: 12px; text-align: center; font-weight: 500;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; text-align: right; font-weight: 500;">
          ${formatCurrency(item.price)}
        </td>
        <td style="padding: 12px; text-align: right; font-weight: 600;">
          ${formatCurrency(subtotal)}
        </td>
      </tr>
    `;
    })
    .join("");

  return `
    <div style="margin: 20px 0;">
      <h3 style="color: #333; margin-bottom: 15px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #007bff; color: white;">
            <th style="padding: 15px; text-align: left; font-weight: 600;">Product</th>
            <th style="padding: 15px; text-align: center; font-weight: 600;">Qty</th>
            <th style="padding: 15px; text-align: right; font-weight: 600;">Price</th>
            <th style="padding: 15px; text-align: right; font-weight: 600;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${productRows}
        </tbody>
      </table>
    </div>
  `;
};

const getOrderSummaryHtml = (order, deliveryCharge = 0) => {
  const couponDiscount = order.coupon?.discountAmount || 0;
  const subtotal = order.subtotal || 0;
  const total = order.totalAmount || 0;

  return `
    <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
      <h3 style="color: #333; margin-bottom: 15px; text-align: center;">Order Summary</h3>
      <div style="max-width: 400px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
          <span>Subtotal:</span>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>
        
        ${
          couponDiscount > 0
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; color: #28a745;">
          <span>Discount (${order.coupon?.code}):</span>
          <strong>-${formatCurrency(couponDiscount)}</strong>
        </div>
        `
            : ""
        }
        
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
          <span>Delivery Charge:</span>
          <strong>${
            deliveryCharge > 0 ? formatCurrency(deliveryCharge) : "FREE"
          }</strong>
        </div>
        
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #007bff; margin-top: 10px; font-size: 18px; font-weight: 700; color: #007bff;">
          <span>Total Amount:</span>
          <span>${formatCurrency(total + deliveryCharge)}</span>
        </div>
      </div>
    </div>
  `;
};

const getOrderStatusBadge = (status) => {
  const statusColors = {
    Pending: "#ffc107",
    Processing: "#17a2b8",
    Shipped: "#007bff",
    Delivered: "#28a745",
    Cancelled: "#dc3545",
  };

  const color = statusColors[status] || "#6c757d";

  return `
    <span style="
      background-color: ${color}; 
      color: white; 
      padding: 6px 12px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
    ">
      ${status}
    </span>
  `;
};

// Admin notification email template
exports.generateAdminOrderNotification = (order, deliveryCharge = 0) => {
  const orderDate = formatDate(order.createdAt);
  const user = order.user;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Notification - ${order.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; line-height: 1.6;">
        <div style="max-width: 800px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🛍️ New Order Received!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">A customer has placed a new order on Tangerine Luxury</p>
            </div>
            
            <!-- Order Details -->
            <div style="padding: 30px;">
                
                <!-- Order Info -->
                <div style="margin-bottom: 30px; text-align: center;">
                    <h2 style="color: #333; margin-bottom: 15px;">Order #${
                      order.orderNumber
                    }</h2>
                    <div style="margin-bottom: 10px;">
                        <strong>Status:</strong> ${getOrderStatusBadge(
                          order.status
                        )}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Order Date:</strong> ${orderDate}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Payment Method:</strong> <span style="color: #007bff; font-weight: 600;">${
                          order.paymentMethod
                        }</span>
                    </div>
                </div>
                
                <!-- Customer Info -->
                <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 10px; border-left: 5px solid #28a745;">
                    <h3 style="color: #333; margin-bottom: 15px;">👤 Customer Information</h3>
                    <div style="line-height: 1.8;">
                        <strong>Name:</strong> ${
                          user?.name || "Not provided"
                        }<br>
                        <strong>Email:</strong> ${
                          user?.email || "Not provided"
                        }<br>
                        <strong>Phone:</strong> ${
                          user?.phone || "Not provided"
                        }<br>
                        <strong>Customer Since:</strong> ${
                          user?.createdAt
                            ? formatDate(user.createdAt)
                            : "Unknown"
                        }
                    </div>
                </div>
                
                <!-- Addresses -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
                    <div>
                        ${getAddressHtml(
                          order.shippingAddress,
                          "📦 Shipping Address"
                        )}
                    </div>
                    <div>
                        ${getAddressHtml(
                          order.billingAddress,
                          "📋 Billing Address"
                        )}
                    </div>
                </div>
                
                <!-- Products -->
                ${getProductTableHtml(order.items)}
                
                <!-- Order Summary -->
                ${getOrderSummaryHtml(order, deliveryCharge)}
                
                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${
                      process.env.ADMIN_URL || "http://192.168.1.6:3000"
                    }/admin/orders/${order._id}" 
                       style="background: linear-gradient(45deg, #007bff, #0056b3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 5px; box-shadow: 0 4px 8px rgba(0,123,255,0.3);">
                        📋 View Full Order
                    </a>
                    <a href="${
                      process.env.ADMIN_URL || "http://192.168.1.6:3000"
                    }/admin/orders" 
                       style="background: linear-gradient(45deg, #28a745, #1e7e34); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 5px; box-shadow: 0 4px 8px rgba(40,167,69,0.3);">
                        📊 All Orders
                    </a>
                </div>
                
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                    This is an automated notification from Tangerine Luxury Admin System<br>
                    Please do not reply to this email
                </p>
            </div>
            
        </div>
    </body>
    </html>
  `;
};

// Customer confirmation email template
exports.generateCustomerOrderConfirmation = (order, deliveryCharge = 0) => {
  const orderDate = formatDate(order.createdAt);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${order.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; line-height: 1.6;">
        <div style="max-width: 700px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700;">✅ Order Confirmed!</h1>
                <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Thank you for shopping with Tangerine Luxury</p>
            </div>
            
            <!-- Order Success Message -->
            <div style="padding: 30px; text-align: center; background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
                <h2 style="margin: 0 0 10px 0; color: #155724;">🎉 Your order has been placed successfully!</h2>
                <p style="margin: 0; font-size: 16px;">Order #${
                  order.orderNumber
                } • Placed on ${orderDate}</p>
            </div>
            
            <!-- Order Details -->
            <div style="padding: 30px;">
                
                <!-- Order Status -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="color: #333; margin-bottom: 10px;">Current Status</h3>
                    ${getOrderStatusBadge(order.status)}
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">
                        We'll send you updates as your order progresses
                    </p>
                </div>
                
                <!-- Shipping Address -->
                ${getAddressHtml(order.shippingAddress, "📦 Delivery Address")}
                
                <!-- Products -->
                ${getProductTableHtml(order.items)}
                
                <!-- Order Summary -->
                ${getOrderSummaryHtml(order, deliveryCharge)}
                
                <!-- Payment Info -->
                <div style="margin: 20px 0; padding: 15px; background-color: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
                    <strong>💳 Payment Method:</strong> ${order.paymentMethod}
                </div>
                
                <!-- What's Next -->
                <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 10px; border-left: 5px solid #ffc107;">
                    <h4 style="color: #856404; margin: 0 0 15px 0;">📋 What happens next?</h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li>We'll process your order within 1-2 business days</li>
                        <li>You'll receive a shipping notification with tracking details</li>
                        <li>Your order will be delivered to the address provided above</li>
                        <li>Any questions? Contact our support team</li>
                    </ul>
                </div>
                
                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${
                      process.env.CLIENT_URL || "http://192.168.1.6:8080"
                    }/dashboard/orders/${order._id}" 
                       style="background: linear-gradient(45deg, #007bff, #0056b3); color: white; padding: 15px 25px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 5px; box-shadow: 0 4px 8px rgba(0,123,255,0.3);">
                        📋 Track Order
                    </a>
                    <a href="${
                      process.env.CLIENT_URL || "http://192.168.1.6:8080"
                    }/dashboard" 
                       style="background: linear-gradient(45deg, #28a745, #1e7e34); color: white; padding: 15px 25px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 5px; box-shadow: 0 4px 8px rgba(40,167,69,0.3);">
                        👤 My Account
                    </a>
                </div>
                
            </div>
            
            <!-- Footer -->
            <div style="background-color: #343a40; color: white; padding: 30px; text-align: center;">
                <h4 style="margin: 0 0 15px 0;">Need Help?</h4>
                <p style="margin: 0 0 15px 0; line-height: 1.6;">
                    📧 Email: sales@tangerineluxury.com<br>
                    📞 Phone: +91-70420 39009<br>
                    🌐 Website: www.tangerineluxury.com
                </p>
                <div style="border-top: 1px solid #495057; padding-top: 20px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 14px; opacity: 0.8;">
                        Thank you for choosing Tangerine Luxury!<br>
                        © ${new Date().getFullYear()} Tangerine Luxury. All rights reserved.
                    </p>
                </div>
            </div>
            
        </div>
    </body>
    </html>
  `;
};
