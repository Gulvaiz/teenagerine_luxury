/**
 * Currency formatting utilities for consistent rupee display
 */

/**
 * Format amount in Indian Rupees
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount with rupee symbol
 */
const formatRupees = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }
  return `₹${amount.toFixed(2)}`;
};

/**
 * Format amount with Indian number system (with commas)
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount with rupee symbol and commas
 */
const formatRupeesWithCommas = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Convert any currency to rupees for invoice display
 * This ensures all invoices show amounts in rupees regardless of order currency
 * @param {number} amount - The amount
 * @param {Object} currency - Currency object with symbol and code
 * @returns {string} - Formatted amount in rupees
 */
const convertToRupeesForInvoice = (amount, currency = null) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }

  // Always return in rupees for invoice, regardless of original currency
  // In a real application, you might want to store exchange rates and convert
  // For now, we'll assume amounts are already in the correct value
  return formatRupeesWithCommas(amount);
};

/**
 * Parse amount and ensure it's a valid number
 * @param {any} amount - Amount to parse
 * @returns {number} - Parsed amount or 0
 */
const parseAmount = (amount) => {
  const parsed = parseFloat(amount);
  return isNaN(parsed) ? 0 : parsed;
};

module.exports = {
  formatRupees,
  formatRupeesWithCommas,
  convertToRupeesForInvoice,
  parseAmount
};