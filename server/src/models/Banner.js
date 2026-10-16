// server/src/models/Banner.js
import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image URL is required'],
    },
    linkUrl: {
      type: String,
      default: '/categories',
    },
    badgeText: {
      type: String,
      default: 'SUPER SAVINGS',
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
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ isActive: 1, displayOrder: 1 });

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
export default Banner;
