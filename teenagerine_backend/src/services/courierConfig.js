/**
 * Courier Configuration Management
 * Controls how couriers are selected automatically
 */

class CourierConfig {
  constructor() {
    this.rules = this.loadDefaultRules();
  }

  /**
   * Default courier selection rules
   */
  loadDefaultRules() {
    return {
      // Country-based rules
      countries: {
        'IN': {
          primary: 'bluedart',
          secondary: 'dhl',
          reasoning: 'Blue Dart has better domestic network in India'
        },
        'US': {
          primary: 'dhl',
          secondary: null,
          reasoning: 'DHL is the only international service available'
        },
        'UK': {
          primary: 'dhl',
          secondary: null,
          reasoning: 'DHL covers international destinations'
        },
        'DEFAULT': {
          primary: 'dhl',
          secondary: null,
          reasoning: 'DHL is the default international courier'
        }
      },

      // Weight-based rules (in kg)
      weight: {
        light: { max: 2, preferred: 'bluedart', reason: 'Cost effective for light packages' },
        medium: { max: 10, preferred: 'auto', reason: 'Use country-based selection' },
        heavy: { max: 50, preferred: 'dhl', reason: 'DHL handles heavy packages better' },
        oversized: { max: 999, preferred: 'dhl', reason: 'DHL for oversized shipments' }
      },

      // Value-based rules (in INR)
      value: {
        low: { max: 5000, preferred: 'auto', reason: 'Use country-based selection' },
        medium: { max: 50000, preferred: 'auto', reason: 'Use country-based selection' },
        high: { max: 999999, preferred: 'dhl', reason: 'DHL for high-value items (better insurance)' }
      },

      // Priority-based rules
      priority: {
        standard: { preferred: 'auto', reason: 'Use country-based selection' },
        express: { preferred: 'dhl', reason: 'DHL for express delivery' },
        overnight: { preferred: 'dhl', reason: 'DHL for overnight delivery' }
      },

      // Business rules
      business: {
        enableUserChoice: true, // Allow users to override automatic selection
        showRecommendations: true, // Show why a courier is recommended
        fallbackEnabled: true, // Fall back to secondary courier if primary fails
        costOptimization: true // Consider cost in recommendations
      }
    };
  }

  /**
   * Get courier recommendation based on multiple factors
   * @param {Object} shipmentDetails - Shipment information
   * @returns {Object} Courier recommendation with reasoning
   */
  getRecommendation(shipmentDetails) {
    const {
      destination = 'IN',
      weight = 1,
      value = 1000,
      priority = 'standard',
      userPreference = null
    } = shipmentDetails;

    // If user has a preference and it's valid, respect it
    if (userPreference && this.isValidCourier(userPreference, destination)) {
      return {
        primary: userPreference,
        secondary: this.getSecondaryOption(destination, userPreference),
        reason: 'User preference',
        overridden: true
      };
    }

    // Get country-based recommendation
    let countryRule = this.rules.countries[destination] || this.rules.countries.DEFAULT;
    let recommendation = {
      primary: countryRule.primary,
      secondary: countryRule.secondary,
      reason: countryRule.reasoning,
      factors: []
    };

    // Apply weight-based rules
    const weightCategory = this.getWeightCategory(weight);
    if (weightCategory.preferred !== 'auto' && weightCategory.preferred !== recommendation.primary) {
      recommendation.factors.push(`Weight (${weight}kg): ${weightCategory.reason}`);
      if (this.shouldOverrideForWeight(weight)) {
        recommendation.primary = weightCategory.preferred;
        recommendation.reason = weightCategory.reason;
      }
    }

    // Apply value-based rules
    const valueCategory = this.getValueCategory(value);
    if (valueCategory.preferred !== 'auto' && valueCategory.preferred !== recommendation.primary) {
      recommendation.factors.push(`Value (₹${value}): ${valueCategory.reason}`);
      if (this.shouldOverrideForValue(value)) {
        recommendation.primary = valueCategory.preferred;
        recommendation.reason = valueCategory.reason;
      }
    }

    // Apply priority-based rules
    const priorityRule = this.rules.priority[priority];
    if (priorityRule.preferred !== 'auto' && priorityRule.preferred !== recommendation.primary) {
      recommendation.factors.push(`Priority (${priority}): ${priorityRule.reason}`);
      if (priority === 'express' || priority === 'overnight') {
        recommendation.primary = priorityRule.preferred;
        recommendation.reason = priorityRule.reason;
      }
    }

    return recommendation;
  }

  /**
   * Get available couriers for a destination
   * @param {string} destination - Country code
   * @returns {Array} Available courier services
   */
  getAvailableCouriers(destination = 'IN') {
    const couriers = [];

    // Always add couriers based on destination
    if (destination === 'IN' || destination === 'India') {
      couriers.push({
        code: 'bluedart',
        name: 'Blue Dart',
        type: 'domestic',
        description: 'Fast domestic delivery across India',
        estimatedDays: '1-3',
        recommended: true,
        score: 90
      });
    }

    // DHL available for all destinations
    couriers.push({
      code: 'dhl',
      name: 'DHL Express',
      type: destination === 'IN' ? 'international' : 'international',
      description: 'Global express delivery service',
      estimatedDays: destination === 'IN' ? '2-4' : '3-7',
      recommended: destination !== 'IN',
      score: destination === 'IN' ? 70 : 95
    });

    return couriers;
  }

  /**
   * Smart courier selection with business rules
   * @param {Object} shipmentDetails - Complete shipment information
   * @returns {Object} Selected courier with reasoning
   */
  selectCourier(shipmentDetails) {
    const recommendation = this.getRecommendation(shipmentDetails);
    const availableCouriers = this.getAvailableCouriers(shipmentDetails.destination);

    // Find the recommended courier in available list
    const selectedCourier = availableCouriers.find(c => c.code === recommendation.primary);

    if (!selectedCourier && recommendation.secondary) {
      // Fall back to secondary option
      const fallbackCourier = availableCouriers.find(c => c.code === recommendation.secondary);
      if (fallbackCourier) {
        return {
          courier: fallbackCourier,
          reason: `${recommendation.reason} (fallback to ${fallbackCourier.name})`,
          factors: recommendation.factors,
          isFallback: true
        };
      }
    }

    return {
      courier: selectedCourier,
      reason: recommendation.reason,
      factors: recommendation.factors,
      isFallback: false
    };
  }

  /**
   * Helper methods
   */
  getWeightCategory(weight) {
    if (weight <= this.rules.weight.light.max) return this.rules.weight.light;
    if (weight <= this.rules.weight.medium.max) return this.rules.weight.medium;
    if (weight <= this.rules.weight.heavy.max) return this.rules.weight.heavy;
    return this.rules.weight.oversized;
  }

  getValueCategory(value) {
    if (value <= this.rules.value.low.max) return this.rules.value.low;
    if (value <= this.rules.value.medium.max) return this.rules.value.medium;
    return this.rules.value.high;
  }

  shouldOverrideForWeight(weight) {
    return weight > 10; // Override for heavy packages
  }

  shouldOverrideForValue(value) {
    return value > 50000; // Override for high-value items
  }

  isValidCourier(courier, destination) {
    const available = this.getAvailableCouriers(destination);
    return available.some(c => c.code === courier);
  }

  getSecondaryOption(destination, primary) {
    const available = this.getAvailableCouriers(destination);
    return available.find(c => c.code !== primary)?.code || null;
  }

  /**
   * Update configuration rules (for admin)
   * @param {Object} newRules - New rules to merge
   */
  updateRules(newRules) {
    this.rules = { ...this.rules, ...newRules };
    console.log('Courier configuration updated:', newRules);
  }

  /**
   * Get current configuration (for admin interface)
   */
  getCurrentConfig() {
    return this.rules;
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    this.rules = this.loadDefaultRules();
    console.log('Courier configuration reset to defaults');
  }
}

module.exports = new CourierConfig();