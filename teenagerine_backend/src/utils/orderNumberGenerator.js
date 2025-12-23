const mongoose = require('mongoose');

/**
 * Get the financial year based on the current date
 * Financial year starts from April 1st
 * @returns {string} Financial year in YYYY format
 */
const getFinancialYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1

  // If current month is January, February, or March, financial year is previous year
  if (currentMonth <= 3) {
    return (currentYear - 1).toString();
  } else {
    return currentYear.toString();
  }
};

/**
 * Generate the next order number in format ORD/YYYY/XXX
 * @returns {Promise<string>} Generated order number
 */
const generateOrderNumber = async () => {
  try {
    const financialYear = getFinancialYear();
    const prefix = `ORD/${financialYear}/`;

    // Import the Order model
    const Order = mongoose.model('Order');

    // Find the last order number for the current financial year
    const lastOrder = await Order.findOne({
      orderNumber: { $regex: `^${prefix}` }
    }).sort({ orderNumber: -1 });

    let nextNumber = 1;

    if (lastOrder && lastOrder.orderNumber) {
      // Extract the last number from the order number
      const lastOrderNumber = lastOrder.orderNumber;
      const lastNumberPart = lastOrderNumber.split('/')[2];
      const lastNumber = parseInt(lastNumberPart, 10);

      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format the number with leading zeros (3 digits)
    const formattedNumber = nextNumber.toString().padStart(3, '0');

    return `${prefix}${formattedNumber}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    throw new Error('Failed to generate order number');
  }
};

/**
 * Validate order number format
 * @param {string} orderNumber - Order number to validate
 * @returns {boolean} True if valid format
 */
const validateOrderNumber = (orderNumber) => {
  const pattern = /^ORD\/\d{4}\/\d{3}$/;
  return pattern.test(orderNumber);
};

/**
 * Extract financial year from order number
 * @param {string} orderNumber - Order number
 * @returns {string|null} Financial year or null if invalid format
 */
const extractFinancialYear = (orderNumber) => {
  if (!validateOrderNumber(orderNumber)) {
    return null;
  }

  const parts = orderNumber.split('/');
  return parts[1];
};

/**
 * Extract sequence number from order number
 * @param {string} orderNumber - Order number
 * @returns {number|null} Sequence number or null if invalid format
 */
const extractSequenceNumber = (orderNumber) => {
  if (!validateOrderNumber(orderNumber)) {
    return null;
  }

  const parts = orderNumber.split('/');
  return parseInt(parts[2], 10);
};

module.exports = {
  generateOrderNumber,
  getFinancialYear,
  validateOrderNumber,
  extractFinancialYear,
  extractSequenceNumber
};