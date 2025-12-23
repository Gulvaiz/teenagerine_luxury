const axios = require('axios');

class DHLTrackingService {
  constructor() {
    // DHL API configuration
    this.baseUrl = process.env.DHL_API_BASE_URL || 'https://api-eu.dhl.com';
    this.apiKey = process.env.DHL_API_KEY;
    this.apiSecret = process.env.DHL_API_SECRET;
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Get basic authentication header for DHL API
   * @returns {string} Base64 encoded credentials
   */
  getAuthHeader() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('DHL API credentials not configured');
    }
    return Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
  }

  /**
   * Track a shipment using DHL Unified Tracking API
   * @param {string} trackingNumber - DHL tracking number
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} Tracking information
   */
  async trackShipment(trackingNumber, language = 'en') {
    try {
      if (!trackingNumber) {
        throw new Error('Tracking number is required');
      }

      const response = await axios.get(`${this.baseUrl}/track/shipments`, {
        params: {
          trackingNumber: trackingNumber,
          language: language
        },
        headers: {
          'Authorization': `Basic ${this.getAuthHeader()}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      if (response.status === 200 && response.data) {
        return this.formatTrackingResponse(response.data, trackingNumber);
      }

      throw new Error('No tracking data found');
    } catch (error) {
      console.error('DHL Tracking API Error:', error.message);

      if (error.response) {
        console.error('Error Response:', error.response.data);
        throw new Error(`DHL API Error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      }

      throw new Error(`Tracking service unavailable: ${error.message}`);
    }
  }

  /**
   * Format DHL API response to standardized format
   * @param {Object} dhlResponse - Raw DHL API response
   * @param {string} trackingNumber - Original tracking number
   * @returns {Object} Formatted tracking data
   */
  formatTrackingResponse(dhlResponse, trackingNumber) {
    try {
      const shipment = dhlResponse.shipments && dhlResponse.shipments[0];

      if (!shipment) {
        return {
          trackingNumber,
          status: 'NOT_FOUND',
          statusDescription: 'Tracking information not available',
          events: [],
          estimatedDelivery: null,
          lastUpdate: new Date()
        };
      }

      const events = shipment.events || [];
      const latestEvent = events[0];

      // Map DHL status to standard status
      const status = this.mapDHLStatus(shipment.status);

      return {
        trackingNumber,
        status: status,
        statusDescription: latestEvent?.description || shipment.status?.description || 'In Transit',
        location: latestEvent?.location?.address || null,
        events: events.map(event => ({
          timestamp: event.timestamp,
          status: event.status,
          description: event.description,
          location: event.location?.address || null
        })),
        estimatedDelivery: shipment.estimatedDeliveryDate || null,
        actualDelivery: shipment.actualDeliveryDate || null,
        serviceType: shipment.service,
        lastUpdate: new Date(),
        origin: shipment.origin?.address || null,
        destination: shipment.destination?.address || null
      };
    } catch (error) {
      console.error('Error formatting DHL response:', error);
      return {
        trackingNumber,
        status: 'ERROR',
        statusDescription: 'Error processing tracking information',
        events: [],
        estimatedDelivery: null,
        lastUpdate: new Date()
      };
    }
  }

  /**
   * Map DHL status codes to standardized status
   * @param {Object} dhlStatus - DHL status object
   * @returns {string} Standardized status
   */
  mapDHLStatus(dhlStatus) {
    if (!dhlStatus) return 'UNKNOWN';

    const statusCode = dhlStatus.statusCode?.toLowerCase() || '';

    const statusMap = {
      'pre-transit': 'PENDING',
      'transit': 'IN_TRANSIT',
      'out-for-delivery': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'exception': 'EXCEPTION',
      'unknown': 'UNKNOWN',
      'failure': 'FAILED'
    };

    return statusMap[statusCode] || 'IN_TRANSIT';
  }

  /**
   * Track multiple shipments at once
   * @param {string[]} trackingNumbers - Array of tracking numbers
   * @param {string} language - Language code
   * @returns {Promise<Object[]>} Array of tracking results
   */
  async trackMultipleShipments(trackingNumbers, language = 'en') {
    const results = [];

    for (const trackingNumber of trackingNumbers) {
      try {
        const result = await this.trackShipment(trackingNumber, language);
        results.push(result);
      } catch (error) {
        results.push({
          trackingNumber,
          status: 'ERROR',
          statusDescription: error.message,
          events: [],
          estimatedDelivery: null,
          lastUpdate: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Check if DHL API is available
   * @returns {Promise<boolean>} API availability status
   */
  async checkAPIHealth() {
    try {
      // Use a dummy tracking number to test API connectivity
      await this.trackShipment('1234567890');
      return true;
    } catch (error) {
      // If it's an authentication error or valid API response, API is healthy
      if (error.message.includes('DHL API Error: 4')) {
        return true;
      }
      return false;
    }
  }
}

module.exports = new DHLTrackingService();