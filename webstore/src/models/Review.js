import mongoose from 'mongoose';

const DeveloperResponseSchema = new mongoose.Schema({
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ReviewSchema = new mongoose.Schema(
  {
    widget: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Widget',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Please provide a comment'],
      trim: true,
      maxlength: [500, 'Review comment cannot exceed 500 characters'],
    },
    developerResponse: {
      type: DeveloperResponseSchema,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index so a user can only review a widget once
ReviewSchema.index({ widget: 1, user: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
