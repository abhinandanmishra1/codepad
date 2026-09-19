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

const codeSchema = new mongoose.Schema(
  {
    codeId: {
      type: String,
      unique: true,
      index: true,
      default: () => nanoid(10),
    },
    title: {
      type: String,
      required: true,
      default: 'Untitled Code',
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    languageId: { type: Number, required: true },
    languageName: { type: String, required: true, trim: true },
    code: { type: String, required: true },
    testCases: [testCaseSchema],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['unlisted', 'public', 'private'],
      default: 'private',
      index: true,
    },
  },
  { timestamps: true }
);

codeSchema.index({ title: 'text', description: 'text' });
codeSchema.index({ author: 1, updatedAt: -1 });

const Code = mongoose.models.Code || mongoose.model('Code', codeSchema);
export default Code;
