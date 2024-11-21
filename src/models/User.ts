import mongoose, { Model } from 'mongoose';
import { UserDocument } from '@/types/mongoose';

// Drop existing indexes to clean up any old configurations
const dropIndexes = async () => {
  try {
    if (mongoose.models.User) {
      await mongoose.models.User.collection.dropIndexes();
    }
  } catch (error) {
    console.error('Error dropping indexes:', error);
  }
};

dropIndexes();

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  image: String,
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create proper indexes
UserSchema.index({ email: 1 }, { unique: true });

// Pre-save middleware to handle errors
UserSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Error handling middleware
UserSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Email already exists'));
  } else {
    next(error);
  }
});

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model('User', UserSchema); 