const SellWithUs = require('../models/sellWithUs.model');
const Product = require('../models/product.model');
const Brand = require('../models/brand.model');
const Category = require('../models/category.model');
const sellWithUsEmailService = require('../services/sellWithUsEmailService');
const multer = require('multer');
const { prisma } = require('../config/prisma');
const path = require('path');
const fs = require('fs');

// Helper function to generate unique consignment number
const generateConsignNumber = async () => {
  const lastVendor = await prisma.vendor_su.findFirst({
    orderBy: { id: 'desc' },
    select: { cosignNumber: true }
  });

  if (!lastVendor) {
    return 'V1';
  }

  const lastNumber = parseInt(lastVendor.cosignNumber.substring(1));
  return `V${lastNumber + 1}`;
};

// Export for use in other controllers
exports.generateConsignNumber = generateConsignNumber;

// Helper function to find or create vendor
const findOrCreateVendor = async (vendorData) => {
  const { email, phone, username, address } = vendorData;

  // Try to find existing vendor by email or phone
  let existingVendor = await prisma.vendor_su.findFirst({
    where: {
      OR: [
        { email: email },
        { phone: phone }
      ]
    }
  });

  if (existingVendor) {
    return existingVendor;
  }

  // Create new vendor with unique consignment number
  const cosignNumber = await generateConsignNumber();

  const newVendor = await prisma.vendor_su.create({
    data: {
      username,
      email,
      phone,
      address,
      cosignNumber
    }
  });

  return newVendor;
};

// Helper function to get vendor by consignment number, email, or phone
const getVendorInfo = async (identifier) => {
  const vendor = await prisma.vendor_su.findFirst({
    where: {
      OR: [
        { cosignNumber: identifier },
        { email: identifier },
        { phone: identifier }
      ]
    },
    include: {
      product: {
        include: {
          images: true
        }
      }
    }
  });

  return vendor;
};

// Helper function to generate SKU: TL[vendor consignNumber]-[gender]-[category]-[auto increase number]
const generateSKU = async (vendorConsignNumber, gender, brandCode, categoryCode) => {
   const cosignNumber=vendorConsignNumber.toUpperCase();
  const lastProduct = await Product.findOne({
    sku: { $regex: `^TL${cosignNumber}-${gender}-${categoryCode}-` }
  }).sort({ sku: -1 });

  let nextNumber = '01';
  if (lastProduct && lastProduct.sku) {
    const lastNumber = parseInt(lastProduct.sku.split('-').pop());
    if (!isNaN(lastNumber)) {
      nextNumber = String(lastNumber + 1).padStart(2, '0');
    }
  }

  return `TL${cosignNumber}-${gender}-${categoryCode}-${nextNumber}`;
};

// Helper function to get brand code from brand name
const getBrandCode = (brandName) => {
  const brandCodes = {
    'chanel': 'CH',
    'gucci': 'GU',
    'prada': 'PR',
    'louisvuitton': 'LV',
    'louis vuitton': 'LV',
    'hermes': 'HE',
    'dior': 'DI',
    'balenciaga': 'BA',
    'bottega veneta': 'BV',
    'saint laurent': 'SL',
    'versace': 'VE',
    'armani': 'AR',
    'fendi': 'FE',
    'cartier': 'CA',
    'rolex': 'RO',
    'omega': 'OM'
  };

  return brandCodes[brandName.toLowerCase()] || brandName.substring(0, 2).toUpperCase();
};

// Helper function to get category code from category name
const getCategoryCode = (categoryName) => {
  const categoryCodes = {
    'handbag': 'HB',
    'handbags': 'HB',
    'shoes': 'SH',
    'clothing': 'CL',
    'accessories': 'AC',
    'jewelry': 'JW',
    'watches': 'WA',
    'bags': 'BG',
    'wallets': 'WL',
    'sunglasses': 'SG',
    'scarves': 'SC',
    'belts': 'BL'
  };

  return categoryCodes[categoryName.toLowerCase()] || categoryName.substring(0, 2).toUpperCase();
};

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

// Configure multer for disk storage (local storage)
// Ensure vendors directory exists
const vendorsDir = path.join(__dirname, '../../uploads/vendors');
if (!fs.existsSync(vendorsDir)) {
  fs.mkdirSync(vendorsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, vendorsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'vendor-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).array('images', 10); // Max 10 images

// Middleware to handle file uploads
exports.uploadImages = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown error: ${err.message}` });
    }
    next();
  });
};

exports.createSellWithUs = async (req, res) => {
  try {
    const formData = req.body;
    const imageUrls = [];

    // Validate required vendor fields
    const { email, phone, username, address, name, brand, type, description, sellingPrice, ERPrice, condition, price } = formData;

    if (!email || !phone || !username || !address) {
      return res.status(400).json({
        error: 'Missing required vendor information: email, phone, username, and address are required'
      });
    }

    if (!name || !brand || !type || !description || !sellingPrice || !ERPrice || !condition || !price) {
      return res.status(400).json({
        error: 'Missing required product information: name, brand, type, description, sellingPrice, ERPrice, condition, and price are required'
      });
    }

    // Use local file paths instead of uploading to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Generate URL path for accessing the file
        const fileUrl = `/uploads/vendors/${file.filename}`;
        imageUrls.push(fileUrl);
      }
    }

    // Find or create vendor
    const vendor = await findOrCreateVendor({
      email,
      phone,
      username,
      address
    });

    // Create product with images
    const product = await prisma.product_su.create({
      data: {
        name,
        brand,
        type,
        description,
        sellingPrice: parseFloat(sellingPrice),
        ERPrice: parseFloat(ERPrice),
        condition,
        price: parseFloat(price),
        vendorId: vendor.id,
        images: {
          create: imageUrls.map(url => ({ url }))
        }
      },
      include: {
        images: true,
        vendor: true
      }
    });

    // Still save to MongoDB for backward compatibility - mapping fields correctly
    const sellWithUsData = {
      name: `${username} - ${name}`, // Combined name for MongoDB
      email,
      phone,
      address,
      type,
      brand,
      condition: condition.toLowerCase(), // Convert to lowercase for MongoDB enum
      description,
      price: parseFloat(price),
      salePrice: parseFloat(sellingPrice), // MongoDB expects salePrice field
      images: imageUrls,
      vendorId: vendor.id,
      cosignNumber: vendor.cosignNumber,
      userId: req.user ? req.user._id : null
    };

    const sellWithUs = new SellWithUs(sellWithUsData);
    const savedSellWithUs = await sellWithUs.save();

    // Send email notifications using the new email service
    const emailResults = await sellWithUsEmailService.sendAllEmails(savedSellWithUs);

    // Include email results in response for debugging/monitoring
    res.status(201).json({
      vendor: {
        id: vendor.id,
        username: vendor.username,
        email: vendor.email,
        phone: vendor.phone,
        cosignNumber: vendor.cosignNumber,
        isNewVendor: !vendor.updatedAt || vendor.createdAt.getTime() === vendor.updatedAt.getTime()
      },
      product: {
        id: product.product_id,
        name: product.name,
        brand: product.brand,
        type: product.type,
        description: product.description,
        sellingPrice: product.sellingPrice,
        ERPrice: product.ERPrice,
        condition: product.condition,
        price: product.price,
        images: product.images
      },
      mongoData: savedSellWithUs.toObject(),
      emailResults: {
        notificationSent: emailResults.notification.success,
        confirmationSent: emailResults.confirmation.success,
        emailErrors: emailResults.success ? null : {
          notification: emailResults.notification.error,
          confirmation: emailResults.confirmation.error
        }
      }
    });
  } catch (error) {
    console.error('Error creating sell with us entry:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

exports.getAllSellWithUs = async (req, res) => {
  try {
    const {page=1, limit=10, keyword}=req.query;
    const query={};
    if(keyword){
      query.$or=[
        {name:{$regex:keyword,$options:'i'}},
        {description:{$regex:keyword,$options:'i'}},
      ];
    }
    const sellWithUs = await SellWithUs.find(query)
      .skip((page-1)*limit)
      .limit(parseInt(limit));
    const total=await SellWithUs.countDocuments(query);
    res.status(200).json({
      sellWithUs,
      total,
      page:parseInt(page),
      totalPages:Math.ceil(total/limit)
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

exports.getSellWithUsById = async (req, res) => {
  try {
    const sellWithUs = await SellWithUs.findById(req.params.id);
    if (!sellWithUs) {
      return res.status(404).json({ message: 'Sell With Us entry not found' });
    }
    res.status(200).json(sellWithUs);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

exports.updateSellWithUs = async (req, res) => {
  try {
    const sellWithUs = await SellWithUs.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!sellWithUs) {
      return res.status(404).json({ message: 'Sell With Us entry not found' });
    }
    res.status(200).json(sellWithUs);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};

exports.deleteSellWithUs = async (req, res) => {
  try {
    const sellWithUs = await SellWithUs.findByIdAndDelete(req.params.id);
    if (!sellWithUs) {
      return res.status(404).json({ message: 'Sell With Us entry not found' });
    }
    res.status(204).json({ message: 'Sell With Us entry deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

// New endpoint to get vendor by consignment number, email, or phone
exports.getVendorInfo = async (req, res) => {
  try {
    const { identifier } = req.params; // Can be cosignNumber, email, or phone

    const vendor = await getVendorInfo(identifier);

    if (!vendor) {
      return res.status(404).json({
        message: 'Vendor not found',
        searchedFor: identifier
      });
    }

    res.status(200).json({
      vendor: {
        id: vendor.id,
        username: vendor.username,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        cosignNumber: vendor.cosignNumber,
        createdAt: vendor.createdAt,
        totalProducts: vendor.product.length
      },
      products: vendor.product.map(product => ({
        id: product.product_id,
        name: product.name,
        brand: product.brand,
        type: product.type,
        description: product.description,
        sellingPrice: product.sellingPrice,
        ERPrice: product.ERPrice,
        condition: product.condition,
        price: product.price,
        images: product.images,
        createdAt: product.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting vendor info:', error);
    res.status(500).json({
      error: error.message
    });
  }
};

// New endpoint to get all vendors with their product counts
exports.getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const vendors = await prisma.vendor_su.findMany({
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        _count: {
          select: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.vendor_su.count();

    res.status(200).json({
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        username: vendor.username,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        cosignNumber: vendor.cosignNumber,
        createdAt: vendor.createdAt,
        productCount: vendor._count.product
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error getting all vendors:', error);
    res.status(500).json({
      error: error.message
    });
  }
};

// New endpoint to add product to existing vendor
exports.addProductToVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name, brand, type, description, sellingPrice, ERPrice, condition, price } = req.body;
    const imageUrls = [];

    // Validate required product fields
    if (!name || !brand || !type || !description || !sellingPrice || !ERPrice || !condition || !price) {
      return res.status(400).json({
        error: 'Missing required product information: name, brand, type, description, sellingPrice, ERPrice, condition, and price are required'
      });
    }

    // Check if vendor exists
    const vendor = await prisma.vendor_su.findUnique({
      where: { id: parseInt(vendorId) }
    });

    if (!vendor) {
      return res.status(404).json({
        message: 'Vendor not found'
      });
    }

    // Use local file paths instead of uploading to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Generate URL path for accessing the file
        const fileUrl = `/uploads/vendors/${file.filename}`;
        imageUrls.push(fileUrl);
      }
    }

    // Create product
    const product = await prisma.product_su.create({
      data: {
        name,
        brand,
        type,
        description,
        sellingPrice: parseFloat(sellingPrice),
        ERPrice: parseFloat(ERPrice),
        condition,
        price: parseFloat(price),
        vendorId: parseInt(vendorId),
        images: {
          create: imageUrls.map(url => ({ url }))
        }
      },
      include: {
        images: true,
        vendor: true
      }
    });

    res.status(201).json({
      vendor: {
        id: vendor.id,
        username: vendor.username,
        email: vendor.email,
        phone: vendor.phone,
        cosignNumber: vendor.cosignNumber
      },
      product: {
        id: product.product_id,
        name: product.name,
        brand: product.brand,
        type: product.type,
        description: product.description,
        sellingPrice: product.sellingPrice,
        ERPrice: product.ERPrice,
        condition: product.condition,
        price: product.price,
        images: product.images
      }
    });
  } catch (error) {
    console.error('Error adding product to vendor:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

// Get product details for admin approval
exports.getProductForApproval = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product_su.findUnique({
      where: { id: parseInt(productId) },
      include: {
        images: true,
        vendor: true
      }
    });

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Get available brands and categories for admin to choose from
    const brands = await Brand.find({ isActive: true }).select('_id name');
    const categories = await Category.find({ status: true }).select('_id name');

    res.status(200).json({
      product,
      availableBrands: brands,
      availableCategories: categories,
      requiredFields: {
        // Required fields for MongoDB Product model
        basic: ['name', 'description', 'retailPrice', 'price'],
        references: ['primaryBrand', 'primaryCategory'],
        media: ['image', 'images'],
        categorization: ['gender', 'condition'],
        inventory: ['stockQuantity'],
        seo: ['slug'],
        user: ['post_by']
      }
    });
  } catch (error) {
    console.error('Error getting product for approval:', error);
    res.status(500).json({
      error: error.message
    });
  }
};

// Admin approve product and transfer to MongoDB
exports.approveProductForPublic = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      // Additional required fields for MongoDB
      gender,
      primaryBrandId,
      primaryCategoryId,
      additionalCategories = [],
      additionalBrands = [],
      stockQuantity = 1,
      style = 'casual',
      colors = [],
      sizes = [],
      tags = [],
      seo = {},
      shipping = {}
    } = req.body;

    // Validate required fields
    if (!gender || !primaryBrandId || !primaryCategoryId) {
      return res.status(400).json({
        error: 'Missing required fields: gender, primaryBrandId, and primaryCategoryId are required'
      });
    }

    // Get product from Prisma
    const prismaProduct = await prisma.product_su.findUnique({
      where: { id: parseInt(productId) },
      include: {
        images: true,
        vendor: true
      }
    });

    if (!prismaProduct) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Verify brand and category exist
    const primaryBrand = await Brand.findById(primaryBrandId);
    const primaryCategory = await Category.findById(primaryCategoryId);

    if (!primaryBrand || !primaryCategory) {
      return res.status(400).json({
        error: 'Invalid brand or category ID'
      });
    }

    // Generate SKU
    const brandCode = getBrandCode(primaryBrand.name);
    const categoryCode = getCategoryCode(primaryCategory.name);
    const genderCode = gender.charAt(0).toUpperCase(); // M, W, K, U
    const sku = await generateSKU(prismaProduct.vendor.cosignNumber, genderCode, brandCode, categoryCode);

    // Create slug
    const baseSlug = createSlug(`${primaryBrand.name}-${prismaProduct.name}`);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await Product.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Map condition from Prisma enum to MongoDB enum
    const conditionMapping = {
      'NEW': 'New With Tags',
      'EXCELLENT': 'Pristine',
      'VERYGOOD': 'Good Condition',
      'GOOD': 'Gently Used',
      'FAIR': 'Used Fairly Well'
    };

    // Prepare categories array
    const categories = [
      { categoryId: primaryCategoryId, isPrimary: true },
      ...additionalCategories.map(catId => ({ categoryId: catId, isPrimary: false }))
    ];

    // Prepare brands array
    const brands = [
      { brandId: primaryBrandId, isPrimary: true },
      ...additionalBrands.map(brandId => ({ brandId: brandId, isPrimary: false }))
    ];

    // Create MongoDB product
    const mongoProduct = new Product({
      name: prismaProduct.name,
      description: prismaProduct.description,
      retailPrice: prismaProduct.ERPrice,
      price: prismaProduct.price,
      salePrice: prismaProduct.sellingPrice,
      condition: conditionMapping[prismaProduct.condition] || 'Good Condition',
      gender,
      primaryCategory: primaryCategoryId,
      primaryBrand: primaryBrandId,
      categories,
      brands,
      image: prismaProduct.images[0]?.url || '',
      images: prismaProduct.images.map(img => img.url),
      stockQuantity: parseInt(stockQuantity),
      sku,
      slug,
      style,
      colors,
      sizes,
      tags,
      post_by: req.user._id, // Admin user ID
      seo: {
        metaTitle: seo.metaTitle || `${primaryBrand.name} ${prismaProduct.name}`,
        metaDescription: seo.metaDescription || prismaProduct.description.substring(0, 160),
        keywords: seo.keywords || [primaryBrand.name, primaryCategory.name, ...tags]
      },
      shipping
    });

    const savedProduct = await mongoProduct.save();

    // Update Prisma product status to indicate it's been approved and published
    await prisma.product_su.update({
      where: { id: parseInt(productId) },
      data: {
        // Add fields to track approval status
        approvedAt: new Date(),
        mongoProductId: savedProduct._id.toString(),
        isApproved: true
      }
    });

    res.status(201).json({
      message: 'Product approved and published successfully',
      product: {
        id: savedProduct._id,
        name: savedProduct.name,
        sku: savedProduct.sku,
        slug: savedProduct.slug,
        price: savedProduct.price,
        vendor: {
          consignNumber: prismaProduct.vendor.cosignNumber,
          username: prismaProduct.vendor.username
        }
      },
      redirectUrl: `/products/${savedProduct.slug}`
    });

  } catch (error) {
    console.error('Error approving product:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

// Get all pending products for admin approval
exports.getPendingProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const products = await prisma.product_su.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        images: true,
        vendor: true
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.product_su.count({
      where: {
        status: 'PENDING'
      }
    });

    res.status(200).json({
      products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error getting pending products:', error);
    res.status(500).json({
      error: error.message
    });
  }
};

// Get vendor data for auto-fill (public endpoint with privacy protection)
exports.getVendorForAutoFill = async (req, res) => {
  try {
    const { identifier, type } = req.query; // identifier can be email or phone, type specifies which one

    if (!identifier || !type) {
      return res.status(400).json({
        error: 'Identifier and type (email or phone) are required'
      });
    }

    // Validate type
    if (!['email', 'phone'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be either "email" or "phone"'
      });
    }

    // Basic validation
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }
    } else if (type === 'phone') {
      // Allow various phone formats but ensure it has reasonable length
      if (identifier.length < 6 || identifier.length > 15) {
        return res.status(400).json({
          error: 'Invalid phone number format'
        });
      }
    }

    // Find vendor with exact match
    const whereCondition = type === 'email' ? { email: identifier } : { phone: identifier };

    const vendor = await prisma.vendor_su.findFirst({
      where: whereCondition,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        address: true,
        cosignNumber: true
      }
    });

    if (!vendor) {
      return res.status(404).json({
        message: 'No vendor found with this ' + type
      });
    }

    // Return only safe, non-sensitive data
    res.status(200).json({
      found: true,
      vendor: {
        firstName: vendor.username.split(' ')[0] || '',
        lastName: vendor.username.split(' ').slice(1).join(' ') || '',
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        vendorId: vendor.id,
        consignNumber: vendor.cosignNumber
      }
    });

  } catch (error) {
    console.error('Error fetching vendor for auto-fill:', error);
    res.status(500).json({
      error: 'Server error while fetching vendor data'
    });
  }
};

