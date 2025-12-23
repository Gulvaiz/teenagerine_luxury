const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    owner: {
      type: String,
      enum: ["others"],
      default: "others",
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    retailPrice: {
      type: Number,
      required: [true, "Product retail price is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    condition: {
      type: String,
      enum: [
        "New With Tags",
        "New Without Tags",
        "Pristine",
        "Good Condition",
        "Gently Used",
        "Used Fairly Well",
      ],
      default: "New With Tags",
    },

    categories: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    gender: {
      type: String,
      enum: ["men", "women", "kids", "unisex"],
      default: "unisex",
    },
    primaryCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product must have a primary category"],
    },

    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    images: {
      type: [String],
      default: [],
    },

    brands: [
      {
        brandId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Brand",
          required: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    primaryBrand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Product must have a primary brand"],
    },

    stockQuantity: {
      type: Number,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      default: function () {
        // Generate a random 8-character uppercase alphanumeric string prefixed with TL
        const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `TL-${randomStr}`;
      }
    },

    sizes: [
      {
        size: {
          type: String,
          required: true,
        },
        stockQuantity: {
          type: Number,
          default: 0,
        },
        price: {
          type: Number,
          min: 0,
        },
        sku: {
          type: String,
        },
      },
    ],

    status: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    reviews: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Review",
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
    },
    soldOut: {
      type: Boolean,
      default: false,
    },

    colors: [
      {
        color: {
          type: String,
          required: true,
        },
        hexCode: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        },
        images: {
          type: [String],
          default: [],
        },
        stockQuantity: {
          type: Number,
          default: 0,
        },
        // ADDED: Independent price for color variants
        price: {
          type: Number,
          min: 0
        }
      },
    ],

    isSale: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    gender: {
      type: String,
      enum: ["men", "women", "kids", "unisex"],
      default: "unisex",
    },
    style: {
      type: String,
      enum: [
        "casual",
        "formal",
        "streetwear",
        "sporty",
        "elegant",
        "vintage",
        "bohemian",
        "classic",
        "business",
      ],
      default: "casual",
    },
    scheduledVisibility: {
      isScheduled: {
        type: Boolean,
        default: false,
      },
      publishDate: {
        type: Date,
        default: null,
      },
    },
    position: {
      type: Number,
      default: 0,
    },
    isQuote: {
      type: Boolean,
      default: false,
    },
    post_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Product post_by is required"],
    },

    // Vendor assignment (links to PostgreSQL vendor via numeric ID)
    vendorId: {
      type: Number,
      default: null,
    },

    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },

    inventory: {
      trackQuantity: {
        type: Boolean,
        default: true,
      },
      allowBackorders: {
        type: Boolean,
        default: false,
      },
      lowStockThreshold: {
        type: Number,
        default: 5,
      },
    },

    shipping: {
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      shippingClass: String,
    },

    // Combo products - products to show as "You may also like"
    comboProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }],
  },
  {
    timestamps: true,
    indexes: [
      { slug: 1 },
      { sku: 1 },
      { "categories.categoryId": 1 },
      { "brands.brandId": 1 },
      { primaryCategory: 1 },
      { primaryBrand: 1 },
      { status: 1 },
      { isFeatured: 1 },
      { createdAt: -1 },
    ],
  }
);

// Create text index for full-text search
// This enables searching across multiple fields with MongoDB text search
productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  'seo.metaTitle': 'text',
  'seo.metaDescription': 'text',
  'seo.keywords': 'text'
}, {
  weights: {
    name: 10,              // Highest priority - product name
    tags: 8,               // High priority - product tags
    'seo.metaTitle': 7,    // High priority - SEO title
    description: 5,        // Medium priority - description
    'seo.metaDescription': 3,  // Lower priority - meta description
    'seo.keywords': 2      // Lowest priority - keywords
  },
  name: 'product_text_search_index'
}
);

// Pre-save middleware to ensure primary category/brand consistency
productSchema.pre("save", function (next) {
  // Ensure primary category is in categories array
  if (this.primaryCategory) {
    const hasPrimaryInCategories = this.categories.some(
      (cat) => cat.categoryId.toString() === this.primaryCategory.toString()
    );

    if (!hasPrimaryInCategories) {
      this.categories.push({
        categoryId: this.primaryCategory,
        isPrimary: true,
      });
    } else {
      // Mark the primary category
      this.categories.forEach((cat) => {
        cat.isPrimary =
          cat.categoryId.toString() === this.primaryCategory.toString();
      });
    }
  }

  // Ensure primary brand is in brands array
  if (this.primaryBrand) {
    const hasPrimaryInBrands = this.brands.some(
      (brand) => brand.brandId.toString() === this.primaryBrand.toString()
    );

    if (!hasPrimaryInBrands) {
      this.brands.push({
        brandId: this.primaryBrand,
        isPrimary: true,
      });
    } else {
      // Mark the primary brand
      this.brands.forEach((brand) => {
        brand.isPrimary =
          brand.brandId.toString() === this.primaryBrand.toString();
      });
    }
  }

  next();
});

// Virtual for calculating discounted price
productSchema.virtual("discountedPrice").get(function () {
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
});

// Method to check if product is in stock
productSchema.methods.isInStock = function () {
  if (!this.inventory.trackQuantity) return true;
  return this.stockQuantity > 0 || this.inventory.allowBackorders;
};

// Method to get all category IDs
productSchema.methods.getAllCategoryIds = function () {
  return this.categories.map((cat) => cat.categoryId);
};

// Method to get all brand IDs
productSchema.methods.getAllBrandIds = function () {
  return this.brands.map((brand) => brand.brandId);
};

// Static method to find products by multiple categories
productSchema.statics.findByCategories = function (categoryIds) {
  return this.find({
    "categories.categoryId": { $in: categoryIds },
  });
};

// Static method to find products by multiple brands
productSchema.statics.findByBrands = function (brandIds) {
  return this.find({
    "brands.brandId": { $in: brandIds },
  });
};

module.exports = mongoose.model("Product", productSchema);
