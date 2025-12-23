const { prisma } = require("../config/prisma");
const nodemailer = require("nodemailer");

// Generate unique contract code
const generateContractCode = async () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `CON${timestamp}${random}`;
};

// Create contract for vendor (covering all their approved products)
const createContractForVendor = async (req, res) => {
  try {
    const { vendorId, contractDays = 120 } = req.body;
    const adminUsername = req.user?.username || req.user?.email || "Admin";

    // Check if vendor exists
    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(vendorId) },
      include: {
        product: true,
      },
    });
    // console.log(vendor);
    if (!vendor) {
      return res.status(404).json({
        status: "error",
        message: "Vendor not found",
      });
    }
    // Also fetch products from MongoDB that are assigned to this vendor
    const Product = require("../models/product.model");
    const mongoProducts = await Product.find({ vendorId: parseInt(vendor.id) })
      .populate("primaryCategory", "name")
      .populate("primaryBrand", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Convert MongoDB products to match Prisma product structure
    const convertedMongoProducts = mongoProducts.map((mp) => ({
      id: mp._id.toString(),
      name: mp.name,
      brand: mp.primaryBrand?.name || "Unknown",
      type: mp.primaryCategory?.name || "Uncategorized",
      description: mp.description || "",
      sellingPrice: mp.price || 0,
      ERPrice: mp.retailPrice || mp.price || 0,
      price: mp.price || 0,
      condition: mp.condition || "GOOD",
      status: "APPROVED", // MongoDB products are considered approved when assigned
      vendorId: parseInt(vendorId),
      isApproved: true,
      createdAt: mp.createdAt,
      updatedAt: mp.updatedAt,
      images: mp.image ? [{ url: mp.image }] : [],
      sku: mp.sku || "",
      source: "MONGODB", // Add flag to identify source
    }));

    vendor.product = [...vendor.product, ...convertedMongoProducts];

    // Allow creating contracts even without products
    // The email will include whatever products exist at the time of sending

    // Check if there's already an active or pending contract for this vendor
    const existingContract = await prisma.vendor_contract_su.findFirst({
      where: {
        vendorId: parseInt(vendorId),
        status: {
          in: ["PENDING", "ACCEPTED"],
        },
      },
    });

    if (existingContract) {
      return res.status(400).json({
        status: "error",
        message:
          "Vendor already has an active or pending contract. Please wait for it to expire or complete before creating a new one.",
      });
    }

    // Generate contract code
    const contractCode = await generateContractCode();

    // Calculate expiry date
    const contractDate = new Date();
    const expiresAt = new Date(contractDate);
    expiresAt.setDate(expiresAt.getDate() + parseInt(contractDays));

    // Create contract
    const contract = await prisma.vendor_contract_su.create({
      data: {
        contractCode,
        vendorId: parseInt(vendorId),
        contractDays: parseInt(contractDays),
        contractDate,
        expiresAt,
        createdBy: adminUsername,
      },
      include: {
        vendor: true,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Contract created successfully",
      data: { contract, productCount: vendor.product.length },
    });
  } catch (error) {
    console.error("Create contract error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create contract",
    });
  }
};

// Send contract email to vendor with product snapshots
const sendContractEmail = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await prisma.vendor_contract_su.findUnique({
      where: { id: parseInt(contractId) },
      include: {
        vendor: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        status: "error",
        message: "Contract not found",
      });
    }

    if (contract.emailSent) {
      return res.status(400).json({
        status: "error",
        message: "Email already sent for this contract",
      });
    }

    // Combine products from both sources
    const allProducts = contract.vendor.product;

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Contract acceptance URL
    const contractUrl = `${process.env.FRONTEND_URL}/vendor/contract/${contract.contractCode}`;

    // Parse vendor emails
    const vendorEmails = contract.vendor.email
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);

    // Add admin consignment email
    const adminEmail = "consign@tangerineluxury.com";
    const allRecipients = [...vendorEmails, adminEmail];

    // Calculate total value
    const totalValue = allProducts.reduce((sum, p) => sum + p.sellingPrice, 0);
    const productCount = allProducts.length;

    // Email template
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: allRecipients.join(", "), // Change to allRecipients.join(', ') in production
      // to: allRecipients.join(', '),
      subject: `Tangerine: Vendor Contract Agreement${
        productCount > 0 ? ` - ${productCount} Products` : ""
      }`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .email-container {
              max-width: 700px;
              margin: 20px auto;
              background: #ffffff;
            }
            .email-body {
              padding: 30px;
              font-size: 14px;
            }
            .greeting {
              margin-bottom: 20px;
            }
            .vendor-name {
              font-weight: bold;
            }
            .intro-text {
              margin-bottom: 20px;
            }
            .product-summary {
              background: #f9f9f9;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
              border: 2px solid #e0e0e0;
            }
            .product-summary h3 {
              margin-top: 0;
              margin-bottom: 15px;
              font-size: 16px;
              color: #333;
            }
            .summary-stats {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 15px;
            }
            .stat-box {
              background: white;
              padding: 12px;
              border-radius: 4px;
              border: 1px solid #ddd;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
            }
            .stat-value {
              font-size: 18px;
              font-weight: bold;
              color: #ff6600;
            }
            .contract-highlights {
              margin: 25px 0;
            }
            .contract-highlights h3 {
              font-size: 14px;
              margin-bottom: 10px;
            }
            .contract-list {
              margin: 10px 0;
              padding-left: 0;
              list-style-position: inside;
            }
            .contract-list li {
              margin: 8px 0;
              padding-left: 10px;
            }
            .payment-terms {
              margin-left: 20px;
              margin-top: 5px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .accept-button {
              display: inline-block;
              padding: 14px 50px;
              background: #ff6600;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
            }
            .accept-button:hover {
              background: #e55a00;
            }
            .note {
              background: #fff3cd;
              padding: 15px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-body">
              <div class="greeting">
                Hi, <span class="vendor-name">${contract.vendor.username.toUpperCase()}</span>,
              </div>

              <div class="intro-text">
                Greetings from Tangerine Luxury!
              </div>

              <div class="intro-text">
                We thank you for selling with us.
              </div>
               <div class="intro-text">
                 Please find attached The  <a href="${contractUrl}" target="_blank">Final Price Agreement</a> along with Tangerine's Terms and Condition Request you to please go through the contract and give your Acceptance for the same.
              </div>
              <div class="contract-highlights">
                <p><strong>Please note the highlights of the Contract:</strong></p>
                <ol class="contract-list">
                  <li>Our contract is for 4 months (until unless these is a change)</li>
                  <li>You will be paid within 24 hours once any product is sold</li>
                  <li>Payment Terms:
                    <div class="payment-terms">
                      - Bank Transfer for all Delhi/ NCR/outstation clients<br>
                      - Cash: If requested and approved
                    </div>
                  </li>
                </ol>
              </div>
              <div style="margin-top: 30px;">
                <p>Kindly get in touch with our Consignment Team should you have any further queries.</p>
              </div>
              <div style="margin-top: 30px;">
                <p style="margin: 5px 0;">Best regards,</p>
                <p style="margin: 5px 0;"><strong>Tangerine Luxury Team</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Update contract
    await prisma.vendor_contract_su.update({
      where: { id: parseInt(contractId) },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });

    res.status(200).json({
      status: "success",
      message: `Contract email sent successfully to vendor and consign@tangerineluxury.com${
        productCount > 0 ? ` covering ${productCount} products` : ""
      }`,
    });
  } catch (error) {
    console.error("Send contract email error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send contract email",
    });
  }
};

// Get contract by code (for vendor) - shows all product snapshots + current MongoDB products
const getContractByCode = async (req, res) => {
  try {
    const { contractCode } = req.params;

    const contract = await prisma.vendor_contract_su.findUnique({
      where: { contractCode },
      include: {
        vendor: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        productSnapshots: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        status: "error",
        message: "Contract not found",
      });
    }

    // Check if expired
    if (
      new Date() > new Date(contract.expiresAt) &&
      contract.status === "PENDING"
    ) {
      await prisma.vendor_contract_su.update({
        where: { id: contract.id },
        data: {
          status: "EXPIRED",
          isActive: false,
        },
      });

      return res.status(400).json({
        status: "error",
        message: "Contract has expired",
      });
    }

    // Also fetch MongoDB products assigned to this vendor
    const Product = require("../models/product.model");
    const mongoProducts = await Product.find({
      vendorId: parseInt(contract.vendor.id),
    })
      .populate("primaryCategory", "name")
      .populate("primaryBrand", "name")
      .lean();

    // console.log('=== GET CONTRACT BY CODE DEBUG ===');
    // console.log('Contract Code:', contractCode);
    // console.log('Vendor ID:', contract.vendor.id);
    // console.log('Product Snapshots (from email):', contract.productSnapshots.length);
    // console.log('PostgreSQL products:', contract.vendor.product.length);
    // console.log('MongoDB products found:', mongoProducts.length);

    // Convert MongoDB products to snapshot format
    const mongoProductSnapshots = mongoProducts.map((mp) => ({
      id: mp._id.toString(),
      productId: mp._id.toString(),
      productName: mp.name,
      brand: mp.primaryBrand?.name || "Unknown",
      type: mp.primaryCategory?.name || "Uncategorized",
      description: mp.description || "",
      sellingPrice: mp.price || 0,
      ERPrice: mp.retailPrice || mp.price || 0,
      price: mp.price || 0,
      condition: mp.condition || "Good Condition",
      imageUrl: mp.image || null,
      qty: 1,
      remarks: "(MIGHT ASK FOR REDUCTION LATER)",
      acceptStatus: "PENDING",
      updatedAt: new Date(),
      source: "MONGODB",
    }));

    // Convert PostgreSQL products to snapshot format
    const pgProductSnapshots = contract.vendor.product.map((p) => ({
      id: p.id.toString(),
      productId: p.id.toString(),
      productName: p.name,
      brand: p.brand || "Unknown",
      type: p.type || "Uncategorized",
      description: p.description || "",
      sellingPrice: p.sellingPrice || 0,
      ERPrice: p.ERPrice || 0,
      price: p.price || 0,
      condition: p.condition || "GOOD",
      imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null,
      qty: 1,
      remarks: "(MIGHT ASK FOR REDUCTION LATER)",
      acceptStatus: "PENDING",
      updatedAt: new Date(),
      source: "POSTGRESQL",
    }));

    // Combine all products: saved snapshots + current MongoDB products + current PostgreSQL products
    // Use a Map to avoid duplicates based on productId
    const allProductsMap = new Map();

    // Add saved snapshots first (these have historical data from when email was sent)
    contract.productSnapshots.forEach((snap) => {
      allProductsMap.set(`snapshot-${snap.id}`, snap);
    });

    // Add current MongoDB products
    mongoProductSnapshots.forEach((p) => {
      allProductsMap.set(`mongo-${p.productId}`, p);
    });

    // Add current PostgreSQL products
    pgProductSnapshots.forEach((p) => {
      allProductsMap.set(`pg-${p.productId}`, p);
    });

    const allProducts = Array.from(allProductsMap.values());

    // console.log('Total combined products:', allProducts.length);
    // console.log('=== END DEBUG ===');

    // Return contract with combined product list
    const contractResponse = {
      ...contract,
      productSnapshots: allProducts,
    };

    res.status(200).json({
      status: "success",
      data: { contract: contractResponse },
    });
  } catch (error) {
    console.error("Get contract by code error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve contract",
    });
  }
};

// Vendor accepts/rejects contract
const respondToContract = async (req, res) => {
  try {
    const { contractCode } = req.params;
    const { response } = req.body;

    if (!response || !["ACCEPTED", "REJECTED"].includes(response)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid response. Must be ACCEPTED or REJECTED",
      });
    }

    const contract = await prisma.vendor_contract_su.findUnique({
      where: { contractCode },
    });
    console.log(contract);
    if (!contract) {
      return res.status(404).json({
        status: "error",
        message: "Contract not found",
      });
    }

    if (contract.status !== "PENDING") {
      return res.status(400).json({
        status: "error",
        message: `Contract already ${contract.status.toLowerCase()}`,
      });
    }

    if (new Date() > new Date(contract.expiresAt)) {
      await prisma.vendor_contract_su.update({
        where: { id: contract.id },
        data: {
          status: "EXPIRED",
          isActive: false,
        },
      });

      return res.status(400).json({
        status: "error",
        message: "Contract has expired",
      });
    }

    // Update contract - set isActive to true only if accepted
    const updatedContract = await prisma.vendor_contract_su.update({
      where: { contractCode },
      data: {
        status: response === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
        vendorResponse: response,
        respondedAt: new Date(),
        isActive: response === "ACCEPTED",
      },
      include: {
        vendor: true,
        productSnapshots: true,
      },
    });

    //Update all products of vendor approved status to active true

    await prisma.product_su.updateMany({
      where: {
        vendorId: contract.vendorId,
      },
      data: {
        approvedAt: new Date(),
        approvedBy: req.user?.username || req.user?.email || "Admin",
        isApproved: true,
        status: response === "ACCEPTED" ? "APPROVED" : "REJECTED",
      },
    });

    await prisma.contract_product_snapshot.updateMany({
      where: {
        contractId: contract.id,
        acceptStatus: "PENDING",
      },
      data: {
        acceptStatus: response === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      status: "success",
      message: `Contract ${response.toLowerCase()} successfully`,
      data: { contract: updatedContract },
    });
  } catch (error) {
    console.error("Respond to contract error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to respond to contract",
    });
  }
};

// Get all contracts (admin)
const getAllContracts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      vendorId,
      search,
      isActive,
    } = req.query;

    const skip = (page - 1) * limit;
    let where = {};

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = parseInt(vendorId);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { contractCode: { contains: search } },
        { vendor: { username: { contains: search } } },
        { vendor: { email: { contains: search } } },
      ];
    }

    const [contracts, totalCount] = await Promise.all([
      prisma.vendor_contract_su.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          vendor: true,
          productSnapshots: {
            select: {
              id: true,
              productName: true,
              brand: true,
              imageUrl: true,
            },
          },
          _count: {
            select: {
              productSnapshots: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vendor_contract_su.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        contracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all contracts error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve contracts",
    });
  }
};

// Get contracts by vendor ID
const getContractsByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params;
    

    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(vendorId) },
      include: {
        product: true,
        contracts: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            product: true,
            contracts: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data:vendor
    });
  } catch (error) {
    console.error("Get contracts by vendor ID error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve contracts",
    });
  }
};

// Extend contract (create new contract when old one expires)
const extendContract = async (req, res) => {
  try {
    const { vendorId, contractDays = 120 } = req.body;
    const adminUsername = req.user?.username || req.user?.email || "Admin";

    // Get vendor with products
    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(vendorId) },
      include: {
        product: {
          where: { isApproved: true },
        },
        contracts: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({
        status: "error",
        message: "Vendor not found",
      });
    }

    if (vendor.product.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Vendor has no approved products",
      });
    }

    // Check if there's an active contract
    const activeContract = vendor.contracts.find(
      (c) =>
        c.isActive &&
        c.status === "ACCEPTED" &&
        new Date(c.expiresAt) > new Date()
    );

    if (activeContract) {
      return res.status(400).json({
        status: "error",
        message:
          "Vendor already has an active contract. Wait for it to expire before extending.",
      });
    }

    // Deactivate old contracts
    await prisma.vendor_contract_su.updateMany({
      where: {
        vendorId: parseInt(vendorId),
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Generate new contract code
    const contractCode = await generateContractCode();

    // Calculate dates
    const contractDate = new Date();
    const expiresAt = new Date(contractDate);
    expiresAt.setDate(expiresAt.getDate() + parseInt(contractDays));

    // Create new contract
    const contract = await prisma.vendor_contract_su.create({
      data: {
        contractCode,
        vendorId: parseInt(vendorId),
        contractDays: parseInt(contractDays),
        contractDate,
        expiresAt,
        createdBy: adminUsername,
      },
      include: {
        vendor: true,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Contract extended successfully",
      data: { contract, productCount: vendor.product.length },
    });
  } catch (error) {
    console.error("Extend contract error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to extend contract",
    });
  }
};

// Check if vendor has active contract
const checkVendorContract = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const activeContract = await prisma.vendor_contract_su.findFirst({
      where: {
        vendorId: parseInt(vendorId),
        isActive: true,
        status: "ACCEPTED",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        hasActiveContract: !!activeContract,
        contract: activeContract,
      },
    });
  } catch (error) {
    console.error("Check vendor contract error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check vendor contract",
    });
  }
};

// Cron job to deactivate expired contracts
const deactivateExpiredContracts = async () => {
  try {
    const result = await prisma.vendor_contract_su.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
        status: "EXPIRED",
      },
    });

    //console.log(`Deactivated ${result.count} expired contracts`);
    return result.count;
  } catch (error) {
    console.error("Deactivate expired contracts error:", error);
    return 0;
  }
};

// Delete a pending contract (admin only)
const deleteContract = async (req, res) => {
  try {
    const { contractId } = req.params;

    // Find the contract
    const contract = await prisma.vendor_contract_su.findUnique({
      where: { id: parseInt(contractId) },
    });

    if (!contract) {
      return res.status(404).json({
        status: "error",
        message: "Contract not found",
      });
    }

    // Only allow deleting PENDING contracts
    if (contract.status !== "PENDING") {
      return res.status(400).json({
        status: "error",
        message: `Cannot delete ${contract.status.toLowerCase()} contract. Only pending contracts can be deleted.`,
      });
    }

    // Delete the contract (product snapshots will be cascade deleted)
    await prisma.vendor_contract_su.delete({
      where: { id: parseInt(contractId) },
    });

    res.status(200).json({
      status: "success",
      message: "Contract deleted successfully",
    });
  } catch (error) {
    console.error("Delete contract error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete contract",
    });
  }
};

module.exports = {
  createContractForVendor,
  sendContractEmail,
  getContractByCode,
  respondToContract,
  getAllContracts,
  getContractsByVendorId,
  extendContract,
  checkVendorContract,
  deactivateExpiredContracts,
  deleteContract,
};
