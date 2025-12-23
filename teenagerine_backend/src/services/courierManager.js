const DhlTrackingService = require('./dhlTrackingService');
const BlueDartService = require('./blueDartService');
const CourierConfig = require('./courierConfig');

class CourierManager {
  constructor() {
    this.services = {
      dhl: DhlTrackingService,
      bluedart: BlueDartService
    };

    console.log('Courier Manager initialized with services:', Object.keys(this.services));
  }

  /**
   * Get the appropriate courier service based on shipment type or destination
   * @param {string} destination - Destination country code (IN for India, others for international)
   * @param {string} serviceType - Optional specific service type
   * @returns {Object} Courier service instance
   */
  getCourierService(destination = 'IN', serviceType = null) {
    // If specific service type is requested
    if (serviceType && this.services[serviceType.toLowerCase()]) {
      return this.services[serviceType.toLowerCase()];
    }

    // Auto-select based on destination
    if (destination === 'IN' || destination === 'India') {
      return this.services.bluedart; // Blue Dart for domestic India
    } else {
      return this.services.dhl; // DHL for international
    }
  }

  /**
   * Track a shipment using the appropriate courier service
   * @param {string} trackingNumber - Tracking number
   * @param {string} courier - Optional courier service ('dhl' or 'bluedart')
   * @param {string} destination - Destination country code
   * @returns {Promise<Object>} Tracking information
   */
  async trackShipment(trackingNumber, courier = null, destination = 'IN') {
    try {
      if (!trackingNumber) {
        throw new Error('Tracking number is required');
      }

      let service;

      // If courier is specified, use it
      if (courier && this.services[courier.toLowerCase()]) {
        service = this.services[courier.toLowerCase()];
      } else {
        // Auto-detect courier based on tracking number format or destination
        service = this.detectCourierService(trackingNumber, destination);
      }

      console.log(`Tracking shipment ${trackingNumber} using ${service.constructor.name}`);

      const result = await service.trackShipment(trackingNumber);

      // Add courier service info to result
      return {
        ...result,
        courierService: service === this.services.dhl ? 'DHL' : 'BlueDart',
        trackingSource: service === this.services.dhl ? 'dhl' : 'bluedart'
      };

    } catch (error) {
      console.error('Courier Manager tracking error:', error.message);
      return {
        trackingNumber,
        status: 'ERROR',
        statusDescription: error.message,
        events: [],
        lastUpdate: new Date(),
        courierService: 'Unknown',
        error: error.message
      };
    }
  }

  /**
   * Check serviceability for a location
   * @param {string} pincode - Pincode/postal code
   * @param {string} country - Country code
   * @param {string} courier - Optional specific courier
   * @returns {Promise<Object>} Serviceability information
   */
  async checkServiceability(pincode, country = 'IN', courier = null) {
    try {
      const service = courier
        ? this.services[courier.toLowerCase()]
        : this.getCourierService(country);

      if (!service || !service.checkServiceability) {
        throw new Error('Serviceability check not available for selected courier');
      }

      const result = await service.checkServiceability(pincode);

      return {
        ...result,
        courierService: service === this.services.dhl ? 'DHL' : 'BlueDart'
      };

    } catch (error) {
      console.error('Serviceability check error:', error.message);
      return {
        pincode,
        serviceable: false,
        services: [],
        error: error.message,
        courierService: 'Unknown'
      };
    }
  }

  /**
   * Create a shipment
   * @param {Object} shipmentData - Shipment details
   * @param {string} courier - Optional specific courier
   * @returns {Promise<Object>} Shipment creation result
   */
  async createShipment(shipmentData, courier = null) {
    try {
      const { receiverDetails } = shipmentData;
      const destination = receiverDetails?.country || 'IN';

      const service = courier
        ? this.services[courier.toLowerCase()]
        : this.getCourierService(destination);

      if (!service || !service.createShipment) {
        throw new Error('Shipment creation not available for selected courier');
      }

      console.log(`Creating shipment using ${service.constructor.name}`);

      const result = await service.createShipment(shipmentData);

      return {
        ...result,
        courierService: service === this.services.dhl ? 'DHL' : 'BlueDart'
      };

    } catch (error) {
      console.error('Shipment creation error:', error.message);
      return {
        success: false,
        error: error.message,
        courierService: 'Unknown'
      };
    }
  }

  /**
   * Calculate shipping rates
   * @param {Object} rateData - Rate calculation parameters
   * @param {string} courier - Optional specific courier
   * @returns {Promise<Object>} Rate information
   */
  async calculateRates(rateData, courier = null) {
    try {
      const { destinationPincode, destinationCountry = 'IN' } = rateData;

      const service = courier
        ? this.services[courier.toLowerCase()]
        : this.getCourierService(destinationCountry);

      if (!service || !service.calculateRates) {
        throw new Error('Rate calculation not available for selected courier');
      }

      const result = await service.calculateRates(rateData);

      return {
        ...result,
        courierService: service === this.services.dhl ? 'DHL' : 'BlueDart'
      };

    } catch (error) {
      console.error('Rate calculation error:', error.message);
      return {
        success: false,
        error: error.message,
        courierService: 'Unknown'
      };
    }
  }

  /**
   * Detect courier service based on tracking number format
   * @param {string} trackingNumber - Tracking number
   * @param {string} destination - Destination country
   * @returns {Object} Courier service instance
   */
  detectCourierService(trackingNumber, destination) {
    // DHL tracking numbers are typically 10-11 digits
    // Blue Dart AWB numbers are typically 10-12 digits starting with specific patterns

    // For domestic India shipments, prefer Blue Dart
    if (destination === 'IN' || destination === 'India') {
      return this.services.bluedart;
    }

    // For international shipments, prefer DHL
    return this.services.dhl;
  }

  /**
   * Get available courier services for a destination
   * @param {string} destination - Destination country code
   * @returns {Array} Available courier services
   */
  getAvailableServices(destination = 'IN') {
    return CourierConfig.getAvailableCouriers(destination);
  }

  /**
   * Check health of all courier services
   * @returns {Promise<Object>} Health status of all services
   */
  async checkServicesHealth() {
    const healthStatus = {};

    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        if (service.checkAPIHealth) {
          healthStatus[serviceName] = await service.checkAPIHealth();
        } else {
          healthStatus[serviceName] = true; // Assume healthy if no health check method
        }
      } catch (error) {
        console.error(`${serviceName} health check failed:`, error);
        healthStatus[serviceName] = false;
      }
    }

    return {
      overall: Object.values(healthStatus).some(status => status === true),
      services: healthStatus,
      timestamp: new Date()
    };
  }

  /**
   * Get courier service recommendations based on shipment details
   * @param {Object} shipmentDetails - Shipment information
   * @returns {Array} Recommended courier services with reasons
   */
  getRecommendations(shipmentDetails) {
    const { destination, weight, urgency, value, userPreference } = shipmentDetails;

    // Use advanced configuration for smart recommendations
    const smartSelection = CourierConfig.selectCourier({
      destination,
      weight,
      value,
      priority: urgency || 'standard',
      userPreference
    });

    // Get all available couriers with scores
    const availableCouriers = CourierConfig.getAvailableCouriers(destination);

    // Mark the recommended courier
    const recommendations = availableCouriers.map(courier => ({
      service: courier.code,
      name: courier.name,
      score: courier.score,
      reasons: this.generateReasons(courier, smartSelection, shipmentDetails),
      estimatedDays: courier.estimatedDays,
      recommended: courier.code === smartSelection.courier?.code,
      isFallback: smartSelection.isFallback && courier.code === smartSelection.courier?.code,
      smartReason: smartSelection.reason,
      factors: smartSelection.factors || []
    }));

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate detailed reasons for courier recommendation
   * @param {Object} courier - Courier service
   * @param {Object} selection - Smart selection result
   * @param {Object} shipmentDetails - Shipment details
   * @returns {Array} Array of reasons
   */
  generateReasons(courier, selection, shipmentDetails) {
    const reasons = [];
    const { destination, weight, value } = shipmentDetails;

    // Base reasons
    if (courier.code === 'bluedart') {
      reasons.push('Domestic specialist for India');
      reasons.push('Extensive local network');
      if (weight <= 5) reasons.push('Cost-effective for light packages');
      if (destination === 'IN') reasons.push('Faster delivery within India');
    }

    if (courier.code === 'dhl') {
      reasons.push('Global express network');
      reasons.push('Reliable international tracking');
      if (weight > 10) reasons.push('Better for heavy packages');
      if (value > 50000) reasons.push('Superior insurance coverage');
      if (destination !== 'IN') reasons.push('International delivery specialist');
    }

    // Add smart selection factors
    if (selection.factors && selection.factors.length > 0) {
      reasons.push(...selection.factors);
    }

    return reasons.slice(0, 4); // Limit to 4 reasons for UI
  }
}

module.exports = new CourierManager();