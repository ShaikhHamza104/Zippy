// server/src/models/Product.js
import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: [true, 'Variant unit is required (e.g. 500g, 1L, 1kg)'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Variant price is required'],
      min: [0, 'Price must be positive'],
    },
    mrp: {
      type: Number,
      required: [true, 'Variant MRP is required'],
      min: [0, 'MRP must be positive'],
    },
    stock: {
      type: Number,
      required: [true, 'Variant stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      trim: true,
      uppercase: true,
    },
  },
  { _id: false }
);

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      index: true,
    },
    brand: {
      type: String,
      default: 'Zippy Fresh',
      trim: true,
      index: true,
    },
    images: {
      type: [productImageSchema],
      validate: [(val) => val.length > 0, 'At least one product image is required'],
    },
    variants: {
      type: [productVariantSchema],
      validate: [(val) => val.length > 0, 'At least one product variant is required'],
    },
    primaryPrice: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    primaryMrp: {
      type: Number,
      required: true,
      min: 0,
    },
    totalStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    pincodeServiceable: {
      type: [String],
      default: ['*'], // '*' indicates available everywhere
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to calculate totalStock and primary price from first variant
productSchema.pre('validate', function (next) {
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    this.primaryPrice = this.variants[0].price;
    this.primaryMrp = this.variants[0].mrp;
    if (this.isAvailable !== false) {
      this.isAvailable = this.totalStock > 0;
    }
  }
  next();
});

// Full-text search index
productSchema.index(
  {
    name: 'text',
    description: 'text',
    brand: 'text',
    tags: 'text',
  },
  {
    weights: {
      name: 10,
      tags: 5,
      brand: 3,
      description: 1,
    },
    name: 'product_fulltext_search_idx',
  }
);

// Compound listing index: category + availability + price + stock
productSchema.index(
  { categoryId: 1, isAvailable: 1, primaryPrice: 1, totalStock: 1 },
  { name: 'category_listing_idx' }
);

// Compound filtering index: categorySlug + primaryPrice + ratingAverage
productSchema.index(
  { categorySlug: 1, primaryPrice: 1, ratingAverage: -1 },
  { name: 'category_filter_sort_idx' }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
