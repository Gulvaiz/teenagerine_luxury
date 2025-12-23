const { prisma } = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const { generateConsignNumber } = require('./sellWithUs.controller');
// Removed top-level synchronous read preventing server crash
// const rawData = fs.readFileSync(path.join(__dirname, "../../test/vendor/vendor.json"));
// const oldVendors=JSON.parse(rawData).data;
// Get all vendors with product counts
const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let where = {};

    if (search) {
      where = {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { cosignNumber: { contains: search } }
        ]
      };
    }

    const [vendors, totalCount] = await Promise.all([
      prisma.vendor_su.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          product: {
            select: {
              id: true,
              status: true,
              isApproved: true,
            }
          },
          _count: {
            select: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vendor_su.count({ where })
    ]);

    // Calculate product statistics for each vendor
    const vendorsWithStats = vendors.map(vendor => {
      const productStats = vendor.product.reduce((stats, product) => {
        stats.total++;
        // Count by status only
        const status = product.status.toLowerCase();
        if (stats[status] !== undefined) {
          stats[status]++;
        }
        return stats;
      }, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        published: 0,
        sold: 0
      });

      return {
        ...vendor,
        productStats,
        product: undefined // Remove full product array from response
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        vendors: vendorsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve vendors'
    });
  }
};

// Get single vendor with detailed product information
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(id) },
      include: {
        product: {
          include: {
            images: true
          },
          orderBy: { createdAt: 'desc' }
        },
        contracts: true
      }
    });

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Combine both product lists
    const allProducts = vendor.product;

    // Calculate product statistics from combined list
    const productStats = allProducts.reduce((stats, product) => {
      stats.total++;
      // Count by status only
      const status = product.status.toLowerCase();
      if (stats[status] !== undefined) {
        stats[status]++;
      }
      return stats;
    }, {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      published: 0,
      sold: 0
    });

    res.status(200).json({
      status: 'success',
      data: {
        vendor: {
          ...vendor,
          product: allProducts,
          productStats
        }
      }
    });
  } catch (error) {
    console.error('Get vendor by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve vendor'
    });
  }
};

// Get all products with vendor information for admin
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      isApproved,
      search,
      vendorId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    let where = {};

    // Filter by status
    if (status) {
      where.status = status.toUpperCase();
    }

    // Filter by approval status
    if (isApproved !== undefined) {
      if (isApproved === 'true') {
        where.isApproved = true;
      } else if (isApproved === 'false') {
        where.isApproved = false;
      } else if (isApproved === 'null') {
        where.isApproved = null;
      }
    }

    // Filter by vendor
    if (vendorId) {
      where.vendorId = parseInt(vendorId);
    }

    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { description: { contains: search } },
        { vendor: { username: { contains: search } } }
      ];
    }

    const [products, totalCount] = await Promise.all([
      prisma.product_su.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          vendor: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true
            }
          },
          images: true
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.product_su.count({ where })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve products'
    });
  }
};

// Approve a product and create contract
const approveProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { adminNotes, contractDays = 120 } = req.body;

    const adminUsername = req.user?.username || req.user?.email || 'Admin';

    // Approve the product
    const product = await prisma.product_su.update({
      where: { id: parseInt(productId) },
      data: {
        isApproved: true,
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: adminUsername,
        adminNotes: adminNotes || null,
        // Clear rejection fields if previously rejected
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null
      },
      include: {
        vendor: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });

    // Generate contract code
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const contractCode = `CON${timestamp}${random}`;

    // Calculate expiry date
    const contractDate = new Date();
    const expiresAt = new Date(contractDate);
    expiresAt.setDate(expiresAt.getDate() + parseInt(contractDays));

    // Create contract for the approved product
    const contract = await prisma.vendor_contract_su.create({
      data: {
        contractCode,
        vendorId: product.vendorId,
        productId: parseInt(productId),
        contractDays: parseInt(contractDays),
        contractDate,
        expiresAt,
        createdBy: adminUsername
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Product approved and contract created successfully',
      data: {
        product,
        contract
      }
    });
  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve product'
    });
  }
};

// Reject a product
const rejectProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }

    const adminUsername = req.user.username || req.user.email;

    const product = await prisma.product_su.update({
      where: { id: parseInt(productId) },
      data: {
        isApproved: false,
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: adminUsername,
        rejectionReason,
        adminNotes: adminNotes || null,
        // Clear approval fields if previously approved
        approvedAt: null,
        approvedBy: null
      },
      include: {
        vendor: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Product rejected successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Reject product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject product'
    });
  }
};

// Publish an approved product (requires active vendor contract)
const publishProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists and is approved
    const existingProduct = await prisma.product_su.findUnique({
      where: { id: parseInt(productId) },
      include: {
        vendor: {
          include: {
            contracts: {
              where: {
                isActive: true,
                status: 'ACCEPTED',
                expiresAt: {
                  gt: new Date()
                }
              },
              take: 1
            }
          }
        }
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    if (!existingProduct.isApproved) {
      return res.status(400).json({
        status: 'error',
        message: 'Product must be approved before publishing'
      });
    }

    // Check if vendor has an active contract
    const activeContract = existingProduct.vendor.contracts[0];

    if (!activeContract) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot publish product. Vendor does not have an active accepted contract. Please create and send a new contract to the vendor.'
      });
    }

    // Check if contract has expired
    if (new Date() > new Date(activeContract.expiresAt)) {
      // Mark contract as expired
      await prisma.vendor_contract_su.update({
        where: { id: activeContract.id },
        data: {
          status: 'EXPIRED',
          isActive: false
        }
      });

      return res.status(400).json({
        status: 'error',
        message: 'Cannot publish product. Vendor contract has expired. Please extend the contract.'
      });
    }

    // Publish the product
    const product = await prisma.product_su.update({
      where: { id: parseInt(productId) },
      data: {
        status: 'PUBLISHED'
      },
      include: {
        vendor: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Product published successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Publish product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to publish product'
    });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalVendors,
      totalProducts,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      publishedProducts,
      recentVendors,
      recentProducts
    ] = await Promise.all([
      // Total counts
      prisma.vendor_su.count(),
      prisma.product_su.count(),
      prisma.product_su.count({ where: { status: 'PENDING' } }),
      prisma.product_su.count({ where: { isApproved: true } }),
      prisma.product_su.count({ where: { isApproved: false } }),
      prisma.product_su.count({ where: { status: 'PUBLISHED' } }),

      // Recent data
      prisma.vendor_su.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          _count: {
            select: { product: true }
          }
        }
      }),
      prisma.product_su.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              username: true
            }
          }
        }
      })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          vendors: {
            total: totalVendors
          },
          products: {
            total: totalProducts,
            pending: pendingProducts,
            approved: approvedProducts,
            rejected: rejectedProducts,
            published: publishedProducts
          }
        },
        recent: {
          vendors: recentVendors,
          products: recentProducts
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve dashboard statistics'
    });
  }
};
const seedsVendors = async (req, res) => {
  try {
    const vendorFilePath = path.join(__dirname, "../../test/vendor/vendor.json");
    if (!fs.existsSync(vendorFilePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor seed file not found'
      });
    }
    const rawData = fs.readFileSync(vendorFilePath);
    const oldVendors = JSON.parse(rawData).data;

    const createdVendors = [];
    const skippedVendors = [];

    for (let index = 0; index < oldVendors.length; index++) {
      const vendorData = oldVendors[index];

      // Check if vendor already exists by email, phone, or username
      const existingVendor = await prisma.vendor_su.findFirst({
        where: {
          OR: [
            { email: vendorData.vendor_email },
            { phone: vendorData.vendor_contact },
            { username: vendorData.vendor_name || "Unknown" }
          ]
        }
      });

      if (existingVendor) {
        skippedVendors.push({
          data: vendorData,
          reason: 'Already exists',
          existingId: existingVendor.id
        });
        continue;
      }

      const cosignNumber = await generateConsignNumber();

      const vendor = await prisma.vendor_su.create({
        data: {
          username: vendorData.vendor_name || "Unknown",
          email: vendorData.vendor_email,
          phone: vendorData.vendor_contact,
          address: vendorData.vendor_address || "",
          cosignNumber: cosignNumber
        }
      });

      createdVendors.push(vendor);
    }

    res.status(201).json({
      status: 'success',
      message: `Successfully seeded ${createdVendors.length} vendors, skipped ${skippedVendors.length} duplicates`,
      data: {
        created: createdVendors,
        skipped: skippedVendors
      }
    });

  } catch (error) {
    console.error('Seed vendors error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to seed vendors'
    });
  }
}

// Create a new vendor
const createVendor = async (req, res) => {
  try {
    const { username, email, phone, address } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !address) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required: username, email, phone, and address'
      });
    }

    // Check if vendor already exists by email or phone
    const existingVendor = await prisma.vendor_su.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone },
          { username: username }
        ]
      }
    });

    if (existingVendor) {
      return res.status(400).json({
        status: 'error',
        message: 'A vendor with this email, phone number, or username already exists'
      });
    }

    // Generate unique consign number
    const cosignNumber = await generateConsignNumber();

    // Create vendor
    const vendor = await prisma.vendor_su.create({
      data: {
        username,
        email,
        phone,
        address,
        cosignNumber
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Vendor created successfully',
      data: { vendor }
    });

  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create vendor'
    });
  }
};

// Update a vendor
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone, address } = req.body;

    // Validate at least one field is provided
    if (!username && !email && !phone && !address) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field must be provided to update'
      });
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingVendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Check if email or phone is being changed and already exists in another vendor
    const conflictingVendor = await prisma.vendor_su.findFirst({
      where: {
        AND: [
          { id: { not: parseInt(id) } },
          {
            OR: [
              email ? { email: email } : {},
              phone ? { phone: phone } : {}
            ].filter(condition => Object.keys(condition).length > 0)
          }
        ]
      }
    });

    if (conflictingVendor) {
      return res.status(400).json({
        status: 'error',
        message: 'A vendor with this email or phone number already exists'
      });
    }

    // Build update data object with only provided fields
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    // Update vendor
    const vendor = await prisma.vendor_su.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(200).json({
      status: 'success',
      message: 'Vendor updated successfully',
      data: { vendor }
    });

  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update vendor'
    });
  }
};

// Admin creates product for vendor
const createVendorProduct = async (req, res) => {
  try {
    const {
      vendorId,
      name,
      brand,
      type,
      description,
      sellingPrice,
      ERPrice,
      price,
      condition,
      images
    } = req.body;

    // Validate required fields
    if (!vendorId || !name || !brand || !type || !description || !price) {
      return res.status(400).json({
        status: 'error',
        message: 'All required fields must be provided: vendorId, name, brand, type, description, price'
      });
    }

    // Use price for all three price fields if not provided
    const finalSellingPrice = sellingPrice || price;
    const finalERPrice = ERPrice || price;
    const finalCondition = condition || 'GOOD'; // Default to GOOD if not provided

    // Verify vendor exists
    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(vendorId) }
    });

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Validate images array
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one product image is required'
      });
    }

    // Create product
    const product = await prisma.product_su.create({
      data: {
        vendorId: parseInt(vendorId),
        name,
        brand,
        type,
        description,
        sellingPrice: parseFloat(finalSellingPrice),
        ERPrice: parseFloat(finalERPrice),
        price: parseFloat(price),
        condition: finalCondition,
        status: 'PENDING', // Default status
        isApproved: false,
        images: {
          create: images.map((url) => ({ url }))
        }
      },
      include: {
        vendor: true,
        images: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Create vendor product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create product'
    });
  }
};

// Get products without vendor (from MongoDB)
const getProductsWithoutVendor = async (req, res) => {
  try {
    const { page = 1, limit = 12, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Import MongoDB Product model
    const Product = require('../models/product.model');

    // Build query for products without vendorId
    let query = {
      $or: [
        { vendorId: { $exists: false } },
        { vendorId: null }
      ]
    };

    // Add search if provided
    if (search) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }

    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .populate('primaryCategory', 'name')
        .populate('primaryBrand', 'name')
        .select('name image price retailPrice sku condition stockQuantity categories brands gender')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get products without vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve products'
    });
  }
};

// Assign existing products to vendor with SKU generation
const assignExistingProducts = async (req, res) => {
  try {
    const { vendorId, productIds } = req.body;

    if (!vendorId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'vendorId and productIds array are required'
      });
    }

    // Verify vendor exists in Prisma
    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(vendorId) }
    });

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Import MongoDB Product model
    const Product = require('../models/product.model');
    const mongoose = require('mongoose');

    // Convert string IDs to ObjectIds
    const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));

    // Fetch products from MongoDB
    const products = await Product.find({
      _id: { $in: objectIds },
      $or: [
        { vendorId: { $exists: false } },
        { vendorId: null }
      ]
    }).populate('primaryCategory', 'name').lean();

    if (products.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No valid products found for assignment'
      });
    }

    // Get current highest SKU counter for this vendor
    const existingProducts = await Product.find({
      vendorId: parseInt(vendorId),
      sku: { $regex: `^TLV${vendorId}-` }
    }).select('sku').lean();

    // Extract counter numbers from existing SKUs
    let highestCounter = -1;
    existingProducts.forEach(p => {
      const match = p.sku.match(/-(\d+)$/);
      if (match) {
        const counter = parseInt(match[1]);
        if (counter > highestCounter) {
          highestCounter = counter;
        }
      }
    });

    // Start counter from next available number (00, 01, 02, etc.)
    let currentCounter = highestCounter + 1;

    // Update each product with vendor assignment and new SKU
    const updatedProducts = [];

    for (const product of products) {
      try {
        // Generate SKU: TLV{vendorId}-{gender[0]}-{category}-{counter}
        const genderInitial = product.gender ? product.gender[0].toUpperCase() : 'U';

        // Get category abbreviation (first 2 letters of category name)
        let categoryCode = 'XX';
        if (product.primaryCategory && product.primaryCategory.name) {
          const catName = product.primaryCategory.name.replace(/\s+/g, '');
          categoryCode = catName.substring(0, 2).toUpperCase();
        }

        const paddedCounter = currentCounter.toString().padStart(2, '0');
        const newSKU = `TLV${vendorId}-${genderInitial}-${categoryCode}-${paddedCounter}`;

        // Update product in MongoDB
        const updated = await Product.findByIdAndUpdate(
          product._id,
          {
            vendorId: parseInt(vendorId),
            sku: newSKU
          },
          { new: true }
        ).populate('primaryCategory', 'name').populate('primaryBrand', 'name');

        updatedProducts.push(updated);
        await prisma.product_su.create({
          data: {
            vendorId: parseInt(vendorId),
            name: updated.name,
            brand: updated.primaryBrand?.name || 'Unknown',
            type: updated.primaryCategory?.name || 'Uncategorized',
            description: updated.description || '',
            sellingPrice: updated.price || 0,
            ERPrice: updated.retailPrice || updated.price || 0,
            price: updated.price || 0,
            condition: updated.condition || 'GOOD',
            status: 'APPROVED', // Assigned products are considered approved
            isApproved: true,
            sku: updated.sku,
            images: updated.image ? { create: [{ url: updated.image }] } : undefined
          }
        });
        currentCounter++;

      } catch (updateError) {
        console.error(`Error updating product ${product._id}:`, updateError);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully assigned ${updatedProducts.length} products to vendor`,
      data: {
        vendor,
        assignedCount: updatedProducts.length,
        products: updatedProducts
      }
    });

  } catch (error) {
    console.error('Assign existing products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign products to vendor'
    });
  }
};

// Unassign products from vendor (remove vendorId and clear SKU)
const unassignProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'productIds array is required'
      });
    }

    // Import MongoDB Product model
    const Product = require('../models/product.model');
    const mongoose = require('mongoose');

    // Convert string IDs to ObjectIds
    const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));

    // Fetch products from MongoDB to verify they exist and are assigned
    const products = await Product.find({
      _id: { $in: objectIds },
      vendorId: { $exists: true, $ne: null }
    }).lean();

    if (products.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No valid assigned products found for unassignment'
      });
    }

    // Update each product to remove vendor assignment
    const unassignedProducts = [];

    for (const product of products) {
      try {
        // Remove vendorId and clear SKU
        const updated = await Product.findByIdAndUpdate(
          product._id,
          {
            $unset: { vendorId: "" },
            sku: null // Clear the SKU when unassigning
          },
          { new: true }
        ).populate('primaryCategory', 'name').populate('primaryBrand', 'name');

        unassignedProducts.push(updated);

      } catch (updateError) {
        console.error(`Error unassigning product ${product._id}:`, updateError);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully unassigned ${unassignedProducts.length} products from vendor`,
      data: {
        unassignedCount: unassignedProducts.length,
        products: unassignedProducts
      }
    });

  } catch (error) {
    console.error('Unassign products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unassign products'
    });
  }
};

// Delete a vendor product (admin only - for record keeping)
const deleteVendorProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product_su.findUnique({
      where: { id: parseInt(productId) },
      include: {
        images: true
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Delete product (cascade will delete images)
    await prisma.product_su.delete({
      where: { id: parseInt(productId) }
    });

    res.status(200).json({
      status: 'success',
      message: 'Product record deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete product'
    });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if vendor exists
    const existingVendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(id) }
    });
    if (!existingVendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Delete vendor (cascade will delete products)
    await prisma.vendor_su.delete({
      where: { id: parseInt(id) }
    });
    res.status(200).json({
      status: 'success',
      message: 'Vendor and associated products deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete vendor'
    });
  }
}



module.exports = {
  getAllVendors,
  getVendorById,
  getAllProducts,
  getDashboardStats,
  seedsVendors,
  createVendor,
  updateVendor,
  createVendorProduct,
  deleteVendorProduct,
  getProductsWithoutVendor,
  assignExistingProducts,
  unassignProducts,
  deleteVendor,
};