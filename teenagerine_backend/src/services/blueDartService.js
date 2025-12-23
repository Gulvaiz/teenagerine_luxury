const axios = require("axios");
const { parseString } = require("xml2js");

class BlueDartService {
  constructor() {
    this.baseUrl =
      "https://apigateway.bluedart.com/in/transportation/shipment/v1";
    this.authenticationUrl =
      "https://apigateway.bluedart.com/in/transportation/token/v1/login";
    this.pickupRegistration =
      "https://apigateway.bluedart.com/in/transportation/pickup/v1";
    this.productServiceUrl =
      "https://apigateway.bluedart.com/in/transportation/allproduct/v1";
    this.pickupCancellationUrl =
      "https://apigateway.bluedart.com/in/transportation/cancel-pickup/v1";
    this.waybillServiceUrl =
      "https://apigateway.bluedart.com/in/transportation/waybill/v1";
    this.trackingServiceUrl =
      "https://apigateway.bluedart.com/in/transportation/tracking/v1";
    this.clientID = process.env.BLUEDART_CLIENT_ID;
    this.ClientSecret = process.env.BLUEDART_CLIENT_SECRET;
  }

  /**
   *
   * @returns BlueDart AuthToken
   */
  getBlueDartAuthToken = async () => {
    try {
      const response = await axios.get(this.authenticationUrl, {
        headers: {
          "Content-Type": "application/json",
          clientID: this.clientID,
          clientSecret: this.ClientSecret,
        },
      });
      if (response?.data?.JWTToken) {
        return response.data.JWTToken;
      }

      throw new Error("No JWT token received from authentication");
    } catch (error) {
      console.error("BlueDart authentication failed:", error.message);
      throw error;
    }
  };

  /**
   * Create shipment with BlueDart
   * @param {string} authToken - JWT token for authentication
   * @param {object} shipmentDetails - Shipment details
   * @returns {object} Shipment creation response
   */
  createShipment = async (authToken, shipmentDetails) => {
    try {
      const response = await axios.post(this.baseUrl, shipmentDetails, {
        headers: {
          JWTToken: authToken,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("BlueDart shipment creation failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Register pickup with BlueDart
   * @param {string} authToken - JWT token for authentication
   * @param {object} pickupData - Pickup registration data
   * @returns {object} Pickup registration response
   */
  registerPickup = async (authToken, pickupData) => {
    console.log("Registering pickup");
    // console.log(pickupData);
    // console.log(authToken);
    try {
      const payload = {
        request: {
          AWBNo: pickupData.AWBNo || [""],
          AreaCode: pickupData.AreaCode,
          CISDDN: pickupData.CISDDN || false,
          ContactPersonName: pickupData.ContactPersonName,
          CustomerAddress1: pickupData.CustomerAddress1,
          CustomerAddress2: pickupData.CustomerAddress2 || "",
          CustomerAddress3: pickupData.CustomerAddress3 || "",
          CustomerCode: pickupData.CustomerCode,
          CustomerName: pickupData.CustomerName,
          CustomerPincode: pickupData.CustomerPincode,
          CustomerTelephoneNumber: pickupData.CustomerTelephoneNumber,
          DoxNDox: pickupData.DoxNDox || "1",
          EmailID: pickupData.EmailID || "",
          IsForcePickup: pickupData.IsForcePickup || false,
          IsReversePickup: pickupData.IsReversePickup || false,
          MobileTelNo: pickupData.MobileTelNo,
          NumberofPieces: pickupData.NumberofPieces || 1,
          OfficeCloseTime: pickupData.OfficeCloseTime || "18:00",
          PackType: pickupData.PackType || "",
          ProductCode: pickupData.ProductCode || "A",
          ReferenceNo: pickupData.ReferenceNo || "",
          Remarks: pickupData.Remarks || "",
          RouteCode: pickupData.RouteCode || "",
          ShipmentPickupDate: pickupData.ShipmentPickupDate,
          ShipmentPickupTime: pickupData.ShipmentPickupTime || "16:00",
          SubProducts: pickupData.SubProducts || ["E-Tailing"],
          VolumeWeight: pickupData.VolumeWeight || 0.5,
          WeightofShipment: pickupData.WeightofShipment || 0.5,
          isToPayShipper: pickupData.isToPayShipper || false,
        },
        profile: {
          Api_type: "S",
          LicenceKey: this.ClientSecret || "kh7mnhqkmgegoksipxr0urmqesesseup",
          LoginID: this.clientID || "GG940111",
        },
      };

      const response = await axios.post(
        `${this.pickupRegistration}/RegisterPickup`,
        payload,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data,
        tokenNumber: response.data?.TokenNumber,
        status: response.data?.Status,
      };
    } catch (error) {
      console.error("BlueDart pickup registration failed:", error.message);

      // Log detailed error information for debugging
      if (error.response) {
        console.error("BlueDart API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
        statusCode: error.response?.status || null,
      };
    }
  };

  createPickup = async (authToken, pickupDetails) => {
    return this.registerPickup(authToken, pickupDetails);
  };

  /**
   * Get all available products and sub-products from BlueDart
   * @param {string} authToken - JWT token for authentication
   * @returns {object} Products and sub-products response
   */
  getAllProductsAndSubProducts = async (authToken) => {
    try {
      const payload = {
        profile: {
          Api_type: "S",
          LicenceKey: this.ClientSecret || "APIKEY",
          LoginID: this.clientID || "APIID",
        },
      };

      const response = await axios.post(
        `${this.productServiceUrl}/GetAllProductsAndSubProducts`,
        payload,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data,
        products: response.data?.Products || [],
        subProducts: response.data?.SubProducts || [],
      };
    } catch (error) {
      console.error(
        "BlueDart get products and sub-products failed:",
        error.message
      );
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Get product codes for use in pickup registration
   * @param {string} authToken - JWT token for authentication
   * @returns {object} Simplified product codes response
   */
  getProductCodes = async (authToken) => {
    try {
      const result = await this.getAllProductsAndSubProducts(authToken);

      if (!result.success) {
        return result;
      }

      const productCodes = result.products.map((product) => ({
        code: product.ProductCode,
        name: product.ProductName,
        description: product.ProductDescription,
      }));

      const subProductCodes = result.subProducts.map((subProduct) => ({
        code: subProduct.SubProductCode,
        name: subProduct.SubProductName,
        description: subProduct.SubProductDescription,
        productCode: subProduct.ProductCode,
      }));

      return {
        success: true,
        productCodes,
        subProductCodes,
        totalProducts: productCodes.length,
        totalSubProducts: subProductCodes.length,
      };
    } catch (error) {
      console.error("BlueDart get product codes failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Cancel a registered pickup
   * @param {string} authToken - JWT token for authentication
   * @param {object} cancellationData - Pickup cancellation data
   * @param {string} cancellationData.tokenNumber - Token number from pickup registration
   * @param {string} cancellationData.pickupRegistrationDate - Registration date in /Date(timestamp)/ format
   * @param {string} cancellationData.remarks - Optional remarks for cancellation
   * @returns {object} Pickup cancellation response
   */
  cancelPickup = async (authToken, cancellationData) => {
    try {
      const payload = {
        request: {
          PickupRegistrationDate: cancellationData.pickupRegistrationDate,
          Remarks: cancellationData.remarks || "",
          TokenNumber: parseInt(cancellationData.tokenNumber),
        },
        profile: {
          Api_type: "S",
          LicenceKey: this.ClientSecret || "kh7mnhqkmgegoksipxr0urmqesesseup",
          LoginID: this.clientID || "GG940111",
        },
      };

      const response = await axios.post(this.pickupCancellationUrl, payload, {
        headers: {
          JWTToken: authToken,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        data: response.data,
        status: response.data?.Status,
        message: response.data?.Message || "Pickup cancelled successfully",
      };
    } catch (error) {
      console.error("BlueDart pickup cancellation failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Helper function to format date for pickup cancellation
   * @param {Date|string} date - JavaScript Date object or date string
   * @returns {string} Formatted date string for BlueDart API
   */
  formatPickupDate = (date) => {
    const timestamp = new Date(date).getTime();
    return `/Date(${timestamp})/`;
  };

  /**
   * Generate a single waybill
   * @param {string} authToken - JWT token for authentication
   * @param {object} waybillData - Waybill generation data
   * @returns {object} Waybill generation response
   */
  generateWaybill = async (authToken, waybillData) => {
    try {
      const payload = this._buildWaybillPayload(waybillData, false);

      const response = await axios.post(
        `${this.waybillServiceUrl}/GenerateWayBill`,
        payload,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data,
        awbNumber: response.data?.AWBNo,
        status: response.data?.Status,
        message: response.data?.Message || "Waybill generated successfully",
      };
    } catch (error) {
      console.error("BlueDart waybill generation failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Import multiple waybills (bulk generation)
   * @param {string} authToken - JWT token for authentication
   * @param {array} waybillsData - Array of waybill generation data
   * @returns {object} Bulk waybill generation response
   */
  importWaybills = async (authToken, waybillsData) => {
    try {
      const requestArray = waybillsData.map((waybillData) =>
        this._buildWaybillRequest(waybillData)
      );

      const payload = {
        Request: requestArray,
        Profile: {
          Api_type: "S",
          LicenceKey: this.ClientSecret || "kh7mnhqkmgegoksipxr0urmqesesseup",
          LoginID: this.clientID || "GG940111",
        },
      };

      const response = await axios.post(
        `${this.waybillServiceUrl}/ImportData`,
        payload,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data,
        totalWaybills: waybillsData.length,
        results: response.data?.Results || [],
        message:
          response.data?.Message ||
          `${waybillsData.length} waybills processed successfully`,
      };
    } catch (error) {
      console.error("BlueDart bulk waybill generation failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Cancel a waybill
   * @param {string} authToken - JWT token for authentication
   * @param {string} awbNumber - AWB number to cancel
   * @returns {object} Waybill cancellation response
   */
  cancelWaybill = async (authToken, awbNumber) => {
    try {
      const payload = {
        Request: {
          AWBNo: awbNumber,
        },
        Profile: {
          Api_type: "S",
          LicenceKey: this.ClientSecret || "kh7mnhqkmgegoksipxr0urmqesesseup",
          LoginID: this.clientID || "GG940111",
        },
      };

      const response = await axios.post(
        `${this.waybillServiceUrl}/CancelWaybill`,
        payload,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data,
        awbNumber: awbNumber,
        status: response.data?.Status,
        message: response.data?.Message || "Waybill cancelled successfully",
      };
    } catch (error) {
      console.error("BlueDart waybill cancellation failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Update ewaybill for existing waybills
   * @param {string} authToken - JWT token for authentication
   * @param {array} waybillsData - Array of waybill data with ewaybill updates
   * @returns {object} Ewaybill update response
   */
  updateEwaybill = async (authToken, waybillsData) => {
    try {
      const requestArray = waybillsData.map((waybillData) =>
        this._buildWaybillRequest(waybillData)
      );

      const payload = {
        Request: requestArray,
        Profile: {
          Api_type: "S",
          LicenceKey: this.ClientSecret || "kh7mnhqkmgegoksipxr0urmqesesseup",
          LoginID: this.clientID || "GG940111",
        },
      };

      const response = await axios.post(
        `${this.waybillServiceUrl}/UpdateEwayBill`,
        payload,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data,
        totalUpdates: waybillsData.length,
        results: response.data?.Results || [],
        message:
          response.data?.Message ||
          `${waybillsData.length} ewaybills updated successfully`,
      };
    } catch (error) {
      console.error("BlueDart ewaybill update failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Helper function to build waybill request object
   * @param {object} waybillData - Waybill data
   * @returns {object} Formatted waybill request
   */
  _buildWaybillRequest = (waybillData) => {
    return {
      Consignee: {
        ConsigneeAddress1: waybillData.consignee.address1,
        ConsigneeAddress2: waybillData.consignee.address2 || "",
        ConsigneeAddress3: waybillData.consignee.address3 || "",
        ConsigneeAddressType: waybillData.consignee.addressType || "R",
        ConsigneeAttention: waybillData.consignee.attention || "",
        ConsigneeEmailID: waybillData.consignee.email || "",
        ConsigneeGSTNumber: waybillData.consignee.gstNumber || "",
        ConsigneeLatitude: waybillData.consignee.latitude || "",
        ConsigneeLongitude: waybillData.consignee.longitude || "",
        ConsigneeMaskedContactNumber:
          waybillData.consignee.maskedContactNumber || "",
        ConsigneeMobile: waybillData.consignee.mobile,
        ConsigneeName: waybillData.consignee.name,
        ConsigneePincode: waybillData.consignee.pincode,
        ConsigneeTelephone: waybillData.consignee.telephone || "",
      },
      Returnadds: {
        ManifestNumber: waybillData.returnAddress.manifestNumber || "",
        ReturnAddress1: waybillData.returnAddress.address1,
        ReturnAddress2: waybillData.returnAddress.address2 || "",
        ReturnAddress3: waybillData.returnAddress.address3 || "",
        ReturnContact: waybillData.returnAddress.contact,
        ReturnEmailID: waybillData.returnAddress.email || "",
        ReturnLatitude: waybillData.returnAddress.latitude || "",
        ReturnLongitude: waybillData.returnAddress.longitude || "",
        ReturnMaskedContactNumber:
          waybillData.returnAddress.maskedContactNumber || "",
        ReturnMobile: waybillData.returnAddress.mobile,
        ReturnPincode: waybillData.returnAddress.pincode,
        ReturnTelephone: waybillData.returnAddress.telephone || "",
      },
      Services: {
        AWBNo: waybillData.services.awbNo || "",
        ActualWeight: waybillData.services.actualWeight.toString(),
        Commodity: waybillData.services.commodity || {},
        CreditReferenceNo: waybillData.services.creditReferenceNo,
        Dimensions: waybillData.services.dimensions || [],
        ECCN: waybillData.services.eccn || "",
        PDFOutputNotRequired:
          waybillData.services.pdfOutputNotRequired !== false,
        PackType: waybillData.services.packType || "",
        PickupDate: waybillData.services.pickupDate,
        PickupTime: waybillData.services.pickupTime || "1600",
        PieceCount: waybillData.services.pieceCount.toString(),
        ProductCode: waybillData.services.productCode,
        ProductType: waybillData.services.productType || 0,
        RegisterPickup: waybillData.services.registerPickup || false,
        SpecialInstruction: waybillData.services.specialInstruction || "",
        SubProductCode: waybillData.services.subProductCode || "",
        OTPBasedDelivery: waybillData.services.otpBasedDelivery || 2,
        OTPCode: waybillData.services.otpCode || "",
        itemdtl: waybillData.services.itemDetails || [],
        noOfDCGiven: waybillData.services.noOfDCGiven || 0,
      },
      Shipper: {
        CustomerAddress1: waybillData.shipper.address1,
        CustomerAddress2: waybillData.shipper.address2 || "",
        CustomerAddress3: waybillData.shipper.address3 || "",
        CustomerCode: waybillData.shipper.customerCode,
        CustomerEmailID: waybillData.shipper.email || "",
        CustomerGSTNumber: waybillData.shipper.gstNumber || "",
        CustomerLatitude: waybillData.shipper.latitude || "",
        CustomerLongitude: waybillData.shipper.longitude || "",
        CustomerMaskedContactNumber:
          waybillData.shipper.maskedContactNumber || "",
        CustomerMobile: waybillData.shipper.mobile,
        CustomerName: waybillData.shipper.name,
        CustomerPincode: waybillData.shipper.pincode,
        CustomerTelephone: waybillData.shipper.telephone || "",
        IsToPayCustomer: waybillData.shipper.isToPayCustomer || false,
        OriginArea: waybillData.shipper.originArea,
        Sender: waybillData.shipper.sender,
        VendorCode: waybillData.shipper.vendorCode || "",
      },
    };
  };

  /**
   * Helper function to build complete waybill payload
   * @param {object} waybillData - Waybill data
   * @param {boolean} isMultiple - Whether this is for multiple waybills
   * @returns {object} Complete payload
   */
  _buildWaybillPayload = (waybillData, isMultiple = false) => {
    const request = this._buildWaybillRequest(waybillData);

    return {
      Request: isMultiple ? [request] : request,
      Profile: {
        Api_type: "S",
        LicenceKey: "kh7mnhqkmgegoksipxr0urmqesesseup" || "APIKEY",
        LoginID: "GG940111" || "APIID",
      },
    };
  };

  /**
   * Get detailed shipment information
   * @param {string} authToken - JWT token for authentication
   * @param {string} awbNumber - AWB number to track
   * @returns {object} Shipment details response
   */
  getShipmentDetails = async (authToken, awbNumber) => {
    try {
      const queryParams = this._buildTrackingParams(awbNumber, 0); // scan=0 for details

      const response = await axios.get(
        `${this.trackingServiceUrl}?${queryParams}`,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      const parsedData = await this._parseXMLResponse(response.data);

      return {
        success: true,
        data: parsedData,
        awbNumber: awbNumber,
        shipmentDetails: parsedData?.ShipmentDetails || null,
        message: "Shipment details retrieved successfully",
      };
    } catch (error) {
      console.error("BlueDart shipment details fetch failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Get shipment status/tracking information
   * @param {string} authToken - JWT token for authentication
   * @param {string} awbNumber - AWB number to track
   * @returns {object} Shipment status response
   */
  getShipmentStatus = async (authToken, awbNumber) => {
    try {
      const queryParams = this._buildTrackingParams(awbNumber, 1); // scan=1 for status

      const response = await axios.get(
        `${this.trackingServiceUrl}?${queryParams}`,
        {
          headers: {
            JWTToken: authToken,
            "Content-Type": "application/json",
          },
        }
      );

      const parsedData = await this._parseXMLResponse(response.data);

      return {
        success: true,
        data: parsedData,
        awbNumber: awbNumber,
        trackingEvents: parsedData?.TrackingEvents || [],
        currentStatus: parsedData?.CurrentStatus || null,
        deliveryStatus: parsedData?.DeliveryStatus || null,
        message: "Shipment status retrieved successfully",
      };
    } catch (error) {
      console.error("BlueDart shipment status fetch failed:", error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  };

  /**
   * Track multiple shipments at once
   * @param {string} authToken - JWT token for authentication
   * @param {array} awbNumbers - Array of AWB numbers to track
   * @param {boolean} getDetails - Whether to get details (true) or status (false)
   * @returns {object} Multiple shipment tracking response
   */
  trackMultipleShipments = async (
    authToken,
    awbNumbers,
    getDetails = false
  ) => {
    try {
      const trackingPromises = awbNumbers.map((awbNumber) => {
        return getDetails
          ? this.getShipmentDetails(authToken, awbNumber)
          : this.getShipmentStatus(authToken, awbNumber);
      });

      const results = await Promise.allSettled(trackingPromises);

      const successful = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      );
      const failed = results.filter(
        (result) => result.status === "rejected" || !result.value.success
      );

      return {
        success: true,
        totalRequested: awbNumbers.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          } else {
            return {
              success: false,
              error: result.reason?.message || "Unknown error",
            };
          }
        }),
        message: `Tracking completed: ${successful.length} successful, ${failed.length} failed`,
      };
    } catch (error) {
      console.error(
        "BlueDart multiple shipment tracking failed:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Helper function to build tracking query parameters
   * @param {string} awbNumber - AWB number
   * @param {number} scan - 0 for details, 1 for status
   * @returns {string} Query parameter string
   */
  _buildTrackingParams = (awbNumber, scan) => {
    const params = new URLSearchParams({
      handler: "tnt",
      action: "custawbquery",
      loginid: this.clientID || "APIID",
      awb: "awb",
      numbers: awbNumber,
      format: "xml",
      lickey: this.ClientSecret || "APIKEY",
      verno: "1",
      scan: scan.toString(),
    });

    return params.toString();
  };

  /**
   * Helper function to parse XML response from tracking API
   * @param {string} xmlData - XML response data
   * @returns {object} Parsed tracking data
   */
  _parseXMLResponse = (xmlData) => {
    return new Promise((resolve, reject) => {
      parseString(
        xmlData,
        { explicitArray: false, ignoreAttrs: false },
        (err, result) => {
          if (err) {
            reject(new Error(`XML parsing failed: ${err.message}`));
          } else {
            resolve(result);
          }
        }
      );
    });
  };
}

module.exports = new BlueDartService();
