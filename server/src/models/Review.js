// server/src/models/Review.js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    userId: {
      type: String, // Maps to MySQL User UUID
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
// Recent reviews index for product page
reviewSchema.index({ productId: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
