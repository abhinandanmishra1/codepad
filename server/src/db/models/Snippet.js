import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const testCaseSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => Date.now().toString() },
    name: { type: String, default: 'Case 1' },
    input: { type: String, default: '' },
    expected: { type: String, default: '' },
  },
  { _id: false }
);

const snippetSchema = new mongoose.Schema(
  {
    snippetId: {
      type: String,
      unique: true,
      index: true,
      default: () => nanoid(10),
    },
    title: {
      type: String,
      required: true,
      default: 'Untitled Snippet',
      trim: true,
      maxlength: 120,
    },
    command: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      validate: {
        validator: (v) => /^\/[a-z0-9_-]{1,49}$/.test(v),
        message: 'Command must start with / and contain only lowercase letters, digits, hyphens, or underscores',
      },
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    languageId: {
      type: Number,
      required: true,
    },
    languageName: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    testCases: [testCaseSchema],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    forkedFrom: {
      type: String,
      default: null,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['unlisted', 'public', 'private'],
      default: 'unlisted',
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    forksCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add text search index on title and description
snippetSchema.index({ title: 'text', description: 'text' });
snippetSchema.index({ author: 1, command: 1 }, { unique: true });

const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', snippetSchema);

export default Snippet;
