import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  stock: {
    type: Object, // Store the entire selected stock object
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0.01,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Portfolio = mongoose.model('Portfolio', portfolioSchema);