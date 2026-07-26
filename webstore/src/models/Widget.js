import mongoose from 'mongoose';

const ChangelogSchema = new mongoose.Schema({
  version: { type: String, required: true },
  changes: { type: [String], default: [] },
  date: { type: Date, default: Date.now },
});

const WidgetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a widget name'],
      trim: true,
      maxlength: [40, 'Widget name cannot exceed 40 characters'],
    },
    identifier: {
      type: String,
      required: [true, 'Please provide a unique identifier (e.g., com.author.name)'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a short description'],
      maxlength: [120, 'Description cannot exceed 120 characters'],
    },
    longDescription: {
      type: String,
      default: '',
    },
    version: {
      type: String,
      required: [true, 'Please provide a version number (e.g., 1.0.0)'],
      default: '1.0.0',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    entryPoint: {
      type: String,
      default: 'index.html',
    },
    html: {
      type: String,
      default: '',
    },
    css: {
      type: String,
      default: '',
    },
    js: {
      type: String,
      default: '',
    },
    env: {
      type: String,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: [
        'Productivity',
        'Utilities',
        'Weather',
        'Developer Tools',
        'Fun',
        'Games',
        'Finance',
        'Education',
        'Media',
        'AI',
        'Customization',
      ],
    },
    tags: {
      type: [String],
      validate: [val => val.length <= 10, 'You can specify at most 10 tags'],
      default: [],
    },
    downloadsCount: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    screenshots: {
      type: [String],
      default: [],
    },
    openSource: {
      type: Boolean,
      default: false,
    },
    repositoryUrl: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // Auto-approving for development ease
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    changelog: {
      type: [ChangelogSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Indexing for search
WidgetSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.models.Widget || mongoose.model('Widget', WidgetSchema);
