// server/src/models/Cart.js
import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantSku: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    priceAtAdd: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Maps to MySQL User UUID
      sparse: true,
      index: true,
    },
    sessionId: {
      type: String, // Guest cart tracking token
      sparse: true,
      index: true,
    },
    items: [cartItemSchema],
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: { expires: '0s' }, // MongoDB TTL automatic document removal
    },
  },
  {
    timestamps: true,
  }
);

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
export default Cart;
