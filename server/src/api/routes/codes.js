import express from 'express';
import Code from '../../db/models/Code.js';
import { authenticateUser } from '../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

function formatCode(code) {
  const obj = code.toObject ? code.toObject() : code;
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    codeId: obj.codeId,
    title: obj.title,
    description: obj.description || '',
    languageId: obj.languageId,
    languageName: obj.languageName,
    code: obj.code,
    testCases: obj.testCases || [],
    visibility: obj.visibility || 'private',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// GET /codes/me — paginated list of user's saved codes
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const filter = { author: req.user._id };
    if (search && search.trim()) filter.$text = { $search: search.trim() };

    const [codes, total] = await Promise.all([
      Code.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Code.countDocuments(filter),
    ]);

    res.json({
      codes: codes.map(formatCode),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to list codes');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// POST /codes — create (authenticated only)
router.post('/', authenticateUser, async (req, res) => {
  const { title, description, languageId, languageName, code, testCases, visibility } = req.body;
  if (!languageId || !languageName || typeof code !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'languageId, languageName, and code are required' });
  }
  try {
    const created = await Code.create({
      title: (title || 'Untitled Code').trim().slice(0, 120),
      description: (description || '').trim().slice(0, 500),
      languageId: Number(languageId),
      languageName: String(languageName).trim(),
      code,
      testCases: Array.isArray(testCases) ? testCases : [],
      author: req.user._id,
      visibility: ['unlisted', 'public', 'private'].includes(visibility) ? visibility : 'private',
    });
    logger.info({ codeId: created.codeId }, 'Created code');
    res.status(201).json(formatCode(created));
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to create code');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// PUT /codes/:codeId — update (author only)
router.put('/:codeId', authenticateUser, async (req, res) => {
  const { codeId } = req.params;
  const { title, description, languageId, languageName, code, testCases, visibility } = req.body;
  try {
    const existing = await Code.findOne({ codeId });
    if (!existing) return res.status(404).json({ error: 'Not Found', message: 'Code not found' });
    if (existing.author.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden', message: 'Not your code' });

    if (title) existing.title = title.trim().slice(0, 120);
    if (typeof description === 'string') existing.description = description.trim().slice(0, 500);
    if (languageId) existing.languageId = Number(languageId);
    if (languageName) existing.languageName = String(languageName).trim();
    if (typeof code === 'string') existing.code = code;
    if (Array.isArray(testCases)) existing.testCases = testCases;
    if (['unlisted', 'public', 'private'].includes(visibility)) existing.visibility = visibility;

    await existing.save();
    res.json(formatCode(existing));
  } catch (err) {
    logger.error({ err: err.message, codeId }, 'Failed to update code');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// DELETE /codes/:codeId — delete (author only)
router.delete('/:codeId', authenticateUser, async (req, res) => {
  const { codeId } = req.params;
  try {
    const existing = await Code.findOne({ codeId });
    if (!existing) return res.status(404).json({ error: 'Not Found', message: 'Code not found' });
    if (existing.author.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden', message: 'Not your code' });

    await Code.deleteOne({ _id: existing._id });
    logger.info({ codeId }, 'Deleted code');
    res.json({ message: 'Code deleted successfully', codeId });
  } catch (err) {
    logger.error({ err: err.message, codeId }, 'Failed to delete code');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

export default router;
