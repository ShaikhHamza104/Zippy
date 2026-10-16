// server/src/models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, 'Category image URL is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: '📦',
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for products count in this category
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoryId',
});

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
