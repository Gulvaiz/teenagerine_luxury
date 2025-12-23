const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generate an invoice PDF for an order
 * @param {Object} order - The order object with populated fields
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateInvoicePDF = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      if (!order) throw new Error("Order data is required");
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        throw new Error("Order must have items");
      }

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // ✅ Load Unicode fonts (make sure the .ttf files exist in /fonts)
      const fontRegular = path.join(__dirname, "fonts", "NotoSans-Regular.ttf");
      const fontBold = path.join(__dirname, "fonts", "NotoSans-Bold.ttf");

      // ==============================
      // HEADER
      // ==============================
      doc.font(fontBold).fontSize(20).fillColor("#000000").text("Tangerine Luxury", 50, 60);
      doc.font(fontRegular).fontSize(10).fillColor("#666666").text("100% authentic preloved luxury", 51, 88);

      // ==============================
      // INVOICE INFO BOX
      // ==============================
      const boxX = 320, boxY = 60, boxWidth = 220, boxHeight = 90;
      doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

      const invoiceNumber = order.invoice?.invoiceNumber || order.orderNumber;
      const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-US", {
        day: "2-digit", month: "short", year: "numeric",
      });
      const dueDate = order.invoice?.dueDate
        ? new Date(order.invoice.dueDate).toLocaleDateString("en-US", {
            day: "2-digit", month: "short", year: "numeric",
          })
        : invoiceDate;

      const invoiceData = [
        { label: "Invoice#", value: invoiceNumber },
        { label: "Invoice Date", value: invoiceDate },
        // { label: "Terms", value: "Due on Receipt" },
        // { label: "Due Date", value: dueDate },
      ];

      let currentY = boxY + 10;
      invoiceData.forEach((item) => {
        doc.font(fontRegular).fillColor("#555555").fontSize(9)
          .text(item.label, boxX + 10, currentY, { width: 90 });
        doc.font(fontBold).fillColor("#000000").fontSize(9)
          .text(item.value, boxX + 110, currentY, { width: 100, align: "left" });
        currentY += 18;
      });

      // ==============================
      // BILL TO & SHIP TO
      // ==============================
      const billToY = boxY + boxHeight + 30;
      doc.font(fontBold).fontSize(11).fillColor("#000000").text("Bill To", 50, billToY);
      doc.font(fontBold).fontSize(10).text(order.user?.name || "N/A", 50, billToY + 20);

      doc.fillColor("#000000").font(fontBold).fontSize(11).text("Ship To", 320, billToY);
      if (order.shippingAddress) {
        const address = order.shippingAddress;
        let addrY = billToY + 20;
        if (address.addressLine1) {
          doc.font(fontRegular).fillColor("#2E5C8F").fontSize(9).text(address.addressLine1, 320, addrY);
          addrY += 14;
        }
        if (address.city) {
          doc.text(address.city, 320, addrY);
          addrY += 14;
        }
        if (address.postalCode) {
          doc.text(`${address.postalCode} ${address.state || ""}`, 320, addrY);
        }
      }

      // ==============================
      // ORDER ITEMS TABLE
      // ==============================
      const tableStartY = billToY + 90;
      const startX = 50;
      const tableWidth = 500;

      // Column positions & widths
      const col1X = startX + 8, col1W = 25;
      const col2X = startX + 35, col2W = 250;
      const col3X = startX + 305, col3W = 50;
      const col4X = startX + 365, col4W = 60;
      const col5X = startX + 435, col5W = 60;

      // Table Header
      doc.rect(startX, tableStartY, tableWidth, 25).fillAndStroke("#1E3A8A", "#1E3A8A");
      doc.fillColor("#FFFFFF").font(fontBold).fontSize(10);
      doc.text("#", col1X, tableStartY + 8, { width: col1W, align: "center" });
      doc.text("Item & Description", col2X, tableStartY + 8, { width: col2W });
      doc.text("Qty", col3X, tableStartY + 8, { width: col3W, align: "center" });
      doc.text("Rate", col4X, tableStartY + 8, { width: col4W, align: "center" });
      doc.text("Amount", col5X, tableStartY + 8, { width: col5W, align: "right" });

      let tableY = tableStartY + 25;
      let calculatedSubtotal = 0;

      order.items.forEach((item, index) => {
        const productName = item.productId?.name || item.name || "Product (Deleted)";
        const itemTotal = item.price * item.quantity;
        calculatedSubtotal += itemTotal;

        // Dynamic height for wrapped text
        doc.font(fontBold).fontSize(8);
        const descHeight = doc.heightOfString(productName.toUpperCase(), { width: col2W });
        const rowHeight = Math.max(30, descHeight + 10);

        // Row border
        doc.rect(startX, tableY, tableWidth, rowHeight).stroke("#E0E0E0");

        // Columns
        doc.fillColor("#000000").font(fontRegular).fontSize(10)
          .text((index + 1).toString(), col1X, tableY + 10, { width: col1W, align: "center" });

        doc.font(fontBold).fontSize(8)
          .text(productName.toUpperCase(), col2X, tableY + 8, { width: col2W, align: "left" });

        doc.font(fontRegular).fontSize(10)
          .text(item.quantity.toString(), col3X, tableY + 10, { width: col3W, align: "center" });

        doc.font(fontRegular).fontSize(9)
          .text(`₹${item.price.toFixed(2)}`, col4X, tableY + 10, { width: col4W, align: "center" });

        doc.font(fontRegular).fontSize(9)
          .text(`₹${itemTotal.toFixed(2)}`, col5X, tableY + 10, { width: col5W, align: "right" });

        tableY += rowHeight;
      });

      // ==============================
      // SUMMARY SECTION
      // ==============================
      const summaryY = tableY + 15;
      const summaryX = 355, summaryWidth = 195;

      const subtotal = order.subtotal || calculatedSubtotal;
      const deliveryCharge = order.deliveryCharge || 0;
      const totalAmount = subtotal + deliveryCharge;

      let sumY = summaryY;
      const lineSpacing = 22;

      doc.font(fontRegular).fontSize(10).text("Sub Total", summaryX, sumY, { width: 95 });
      doc.text(`₹${subtotal.toFixed(2)}`, summaryX + 95, sumY, { width: 100, align: "right" });
      sumY += lineSpacing;

      if (deliveryCharge > 0) {
        doc.text("Delivery Charge", summaryX, sumY, { width: 95 });
        doc.text(`₹${deliveryCharge.toFixed(2)}`, summaryX + 95, sumY, { width: 100, align: "right" });
        sumY += lineSpacing;
      }

      doc.rect(summaryX, sumY, summaryWidth, 24).fillAndStroke("#E8F4FF", "#D0D0D0");
      doc.fillColor("#000000").font(fontBold).fontSize(11)
        .text("Balance Due", summaryX + 10, sumY + 6);
      doc.text(`₹${totalAmount.toFixed(2)}`, summaryX + 105, sumY + 6, { width: 80, align: "right" });

      // ==============================
      // FOOTER
      // ==============================
      doc.fillColor("#666666").font(fontRegular).fontSize(9)
        .text("Thanks for shopping with us.", 50, summaryY, { width: 285 });

      const termsStartY = summaryY + 25;
      // doc.fillColor("#000000").font(fontBold).fontSize(11)
      //   .text("Terms & Conditions", 50, termsStartY, { width: 285 });
      // doc.fillColor("#2E5C8F").font(fontRegular).fontSize(9)
      //   .text("Full payment is due upon receipt of this invoice.", 50, termsStartY + 20, { width: 285 })
      //   .text("Late payments may incur additional charges or", 50, termsStartY + 33, { width: 285 })
      //   .text("interest as per the applicable laws.", 50, termsStartY + 46, { width: 285 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};


/**
 * Save invoice PDF to local storage
 * @param {Buffer} pdfBuffer - The PDF buffer
 * @param {String} orderNumber - The order number for the filename
 * @returns {Promise<Object>} - Local storage result
 */
const saveInvoiceToLocal = async (pdfBuffer, orderNumber, orderId) => {
  return new Promise((resolve, reject) => {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, "../../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Generate filename - sanitize by replacing all slashes and special characters
      const sanitizedOrderNumber = orderNumber.replace(/[\/\\:*?"<>|]/g, "_");
      const filename = `invoice_${sanitizedOrderNumber}.pdf`;
      const filePath = path.join(invoicesDir, filename);

      // Save file
      fs.writeFileSync(filePath, pdfBuffer);

      // Return result similar to Cloudinary format
      resolve({
        secure_url: `/api/orders/${orderId}/invoice/download`,
        public_id: filename,
        local_path: filePath,
      });
    } catch (error) {
      console.error("Local storage error:", error);
      reject(error);
    }
  });
};

/**
 * Generate and save an invoice for an order
 * @param {Object} order - The order object with populated fields
 * @returns {Promise<Object>} - Invoice data with URL and public ID
 */
const generateAndSaveInvoice = async (order) => {
  try {
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(order);
    // Use invoice number if available, otherwise use order number
    const invoiceNumber = order.invoice?.invoiceNumber || order.orderNumber;
    // Save to local storage, passing invoice number and orderId
    const saveResult = await saveInvoiceToLocal(
      pdfBuffer,
      invoiceNumber,
      order._id
    );
    return {
      url: saveResult.secure_url,
      publicId: saveResult.public_id,
      localPath: saveResult.local_path,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error generating invoice:", error);
    throw error;
  }
};

module.exports = {
  generateInvoicePDF,
  saveInvoiceToLocal,
  generateAndSaveInvoice,
};
