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
 * Generate the next invoice number in format INV/YYYY/XXX
 * @returns {Promise<string>} Generated invoice number
 */
const generateInvoiceNumber = async () => {
  try {
    const financialYear = getFinancialYear();
    const prefix = `INV/${financialYear}/`;

    // Import the Order model
    const Order = mongoose.model('Order');

    // Find the last invoice number for the current financial year
    const lastInvoice = await Order.findOne({
      'invoice.invoiceNumber': { $regex: `^${prefix}` }
    }).sort({ 'invoice.invoiceNumber': -1 });

    let nextNumber = 1;

    if (lastInvoice && lastInvoice.invoice && lastInvoice.invoice.invoiceNumber) {
      // Extract the last number from the invoice number
      const lastInvoiceNumber = lastInvoice.invoice.invoiceNumber;
      const lastNumberPart = lastInvoiceNumber.split('/')[2];
      const lastNumber = parseInt(lastNumberPart, 10);

      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format the number with leading zeros (3 digits)
    const formattedNumber = nextNumber.toString().padStart(3, '0');

    return `${prefix}${formattedNumber}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
};

/**
 * Validate invoice number format
 * @param {string} invoiceNumber - Invoice number to validate
 * @returns {boolean} True if valid format
 */
const validateInvoiceNumber = (invoiceNumber) => {
  const pattern = /^INV\/\d{4}\/\d{3}$/;
  return pattern.test(invoiceNumber);
};

/**
 * Extract financial year from invoice number
 * @param {string} invoiceNumber - Invoice number
 * @returns {string|null} Financial year or null if invalid format
 */
const extractFinancialYear = (invoiceNumber) => {
  if (!validateInvoiceNumber(invoiceNumber)) {
    return null;
  }

  const parts = invoiceNumber.split('/');
  return parts[1];
};

/**
 * Extract sequence number from invoice number
 * @param {string} invoiceNumber - Invoice number
 * @returns {number|null} Sequence number or null if invalid format
 */
const extractSequenceNumber = (invoiceNumber) => {
  if (!validateInvoiceNumber(invoiceNumber)) {
    return null;
  }

  const parts = invoiceNumber.split('/');
  return parseInt(parts[2], 10);
};

module.exports = {
  generateInvoiceNumber,
  getFinancialYear,
  validateInvoiceNumber,
  extractFinancialYear,
  extractSequenceNumber
};