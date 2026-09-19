import express from 'express';
import Snippet from '../../db/models/Snippet.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const CMD_REGEX = /^\/[a-z0-9_-]{1,49}$/;

function formatSnippet(snippet) {
  const obj = snippet.toObject ? snippet.toObject() : snippet;
  const visibility = obj.visibility || (obj.isPublic ? 'public' : 'unlisted');
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    snippetId: obj.snippetId,
    title: obj.title,
    command: obj.command,
    description: obj.description || '',
    languageId: obj.languageId,
    languageName: obj.languageName,
    code: obj.code,
    testCases: obj.testCases || [],
    visibility,
    isPublic: visibility === 'public',
    viewsCount: obj.viewsCount || 0,
    forksCount: obj.forksCount || 0,
    forkedFrom: obj.forkedFrom || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    author: obj.author && (obj.author.username || obj.author.name)
      ? {
          id: obj.author._id ? obj.author._id.toString() : obj.author.id,
          username: obj.author.username,
          name: obj.author.name,
          avatar: obj.author.avatar,
        }
      : null,
  };
}

// GET /snippets/me — ALL user snippets (for Monaco registration, no pagination)
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { author: req.user._id };
    if (search && search.trim()) {
      const q = search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ title: new RegExp(escaped, 'i') }, { command: new RegExp(escaped, 'i') }];
    }
    const snippets = await Snippet.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ snippets: snippets.map(formatSnippet) });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to list user snippets');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// GET /snippets — public explore feed (only snippets with valid commands)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;
    const { languageId, sort, search } = req.query;

    const filter = { visibility: 'public', command: { $regex: /^\/[a-z0-9_-]+$/ } };
    if (languageId) filter.languageId = Number(languageId);
    if (search && search.trim()) filter.$text = { $search: search.trim() };

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { viewsCount: -1, createdAt: -1 };

    const [snippets, total] = await Promise.all([
      Snippet.find(filter).sort(sortOption).skip(skip).limit(limit).populate('author', 'username name avatar').lean(),
      Snippet.countDocuments(filter),
    ]);

    res.json({
      snippets: snippets.map(formatSnippet),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to list public snippets');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// GET /snippets/:snippetId — single snippet
router.get('/:snippetId', optionalAuth, async (req, res) => {
  try {
    const snippet = await Snippet.findOne({ snippetId: req.params.snippetId }).populate('author', 'username name avatar');
    if (!snippet) return res.status(404).json({ error: 'Not Found', message: 'Snippet not found' });

    const visibility = snippet.visibility || (snippet.isPublic ? 'public' : 'unlisted');
    if (visibility === 'private') {
      const isAuthor =
        req.user &&
        snippet.author &&
        (snippet.author._id
          ? snippet.author._id.toString() === req.user._id.toString()
          : snippet.author.toString() === req.user._id.toString());
      if (!isAuthor) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'This snippet is private. Only the author can access it.',
        });
      }
    }

    snippet.viewsCount = (snippet.viewsCount || 0) + 1;
    await snippet.save();
    res.json(formatSnippet(snippet));
  } catch (err) {
    logger.error({ err: err.message, snippetId: req.params.snippetId }, 'Failed to fetch snippet');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// POST /snippets — create with required command (auth required)
router.post('/', authenticateUser, async (req, res) => {
  const { title, command, description, languageId, languageName, code, testCases, visibility, isPublic } = req.body;
  if (!languageId || !languageName || typeof code !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'languageId, languageName, and code are required' });
  }
  const normalizedCmd = (command || '').trim().toLowerCase();
  if (!CMD_REGEX.test(normalizedCmd)) {
    return res.status(400).json({ error: 'Validation Error', message: 'command must start with / and match /[a-z0-9_-]+ (e.g. /trie)' });
  }
  try {
    const chosenVisibility = visibility && ['unlisted', 'public', 'private'].includes(visibility)
      ? visibility
      : (isPublic !== undefined ? (isPublic ? 'public' : 'unlisted') : 'public');

    const snippet = await Snippet.create({
      title: (title || 'Untitled Snippet').trim().slice(0, 120),
      command: normalizedCmd,
      description: (description || '').trim().slice(0, 500),
      languageId: Number(languageId),
      languageName: String(languageName).trim(),
      code,
      testCases: Array.isArray(testCases) ? testCases : [],
      author: req.user._id,
      visibility: chosenVisibility,
      isPublic: chosenVisibility === 'public',
    });

    if (snippet.author) {
      await snippet.populate('author', 'username name avatar');
    }

    logger.info({ snippetId: snippet.snippetId, command: snippet.command }, 'Created snippet');
    res.status(201).json(formatSnippet(snippet));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Conflict', message: `Command "${normalizedCmd}" already exists. Use a different command.` });
    }
    logger.error({ err: err.message }, 'Failed to create snippet');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// PUT /snippets/:snippetId — update (author only)
router.put('/:snippetId', authenticateUser, async (req, res) => {
  const { snippetId } = req.params;
  const { title, command, description, languageId, languageName, code, testCases, visibility, isPublic } = req.body;
  try {
    const snippet = await Snippet.findOne({ snippetId });
    if (!snippet) return res.status(404).json({ error: 'Not Found', message: 'Snippet not found' });
    if (!snippet.author || (snippet.author._id ? snippet.author._id.toString() : snippet.author.toString()) !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your snippet' });
    }

    if (command !== undefined) {
      const normalizedCmd = (command || '').trim().toLowerCase();
      if (!CMD_REGEX.test(normalizedCmd)) {
        return res.status(400).json({ error: 'Validation Error', message: 'command must match /^/[a-z0-9_-]{1,49}$/' });
      }
      snippet.command = normalizedCmd;
    }
    if (title) snippet.title = title.trim().slice(0, 120);
    if (typeof description === 'string') snippet.description = description.trim().slice(0, 500);
    if (languageId) snippet.languageId = Number(languageId);
    if (languageName) snippet.languageName = String(languageName).trim();
    if (typeof code === 'string') snippet.code = code;
    if (Array.isArray(testCases)) snippet.testCases = testCases;

    if (visibility && ['unlisted', 'public', 'private'].includes(visibility)) {
      snippet.visibility = visibility;
      snippet.isPublic = visibility === 'public';
    } else if (isPublic !== undefined) {
      snippet.isPublic = Boolean(isPublic);
      snippet.visibility = snippet.isPublic ? 'public' : 'unlisted';
    }

    await snippet.save();
    await snippet.populate('author', 'username name avatar');
    res.json(formatSnippet(snippet));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Conflict', message: 'Command already exists.' });
    logger.error({ err: err.message, snippetId }, 'Failed to update snippet');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// DELETE /snippets/:snippetId — delete (author only) [WAS MISSING]
router.delete('/:snippetId', authenticateUser, async (req, res) => {
  const { snippetId } = req.params;
  try {
    const snippet = await Snippet.findOne({ snippetId });
    if (!snippet) return res.status(404).json({ error: 'Not Found', message: 'Snippet not found' });
    if (!snippet.author || (snippet.author._id ? snippet.author._id.toString() : snippet.author.toString()) !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your snippet' });
    }

    await Snippet.deleteOne({ _id: snippet._id });
    logger.info({ snippetId }, 'Deleted snippet');
    res.json({ message: 'Snippet deleted successfully', snippetId });
  } catch (err) {
    logger.error({ err: err.message, snippetId }, 'Failed to delete snippet');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// POST /snippets/:snippetId/fork - Fork snippet to own workspace/account
router.post('/:snippetId/fork', optionalAuth, async (req, res) => {
  const { snippetId } = req.params;

  try {
    const original = await Snippet.findOne({ snippetId });
    if (!original) {
      return res.status(404).json({ error: 'Not Found', message: 'Original snippet not found' });
    }

    // Increment fork count on original
    await Snippet.updateOne({ _id: original._id }, { $inc: { forksCount: 1 } });

    // Create cloned snippet - DO NOT copy command on fork as per user instruction!
    const forkedTitle = original.title.includes('(Fork)') ? original.title : `${original.title} (Fork)`;
    let forkedCommand = (req.body?.command || '').trim().toLowerCase();
    if (!CMD_REGEX.test(forkedCommand)) {
      forkedCommand = `/fork-${Date.now().toString(36)}`;
    }

    const forkedSnippet = await Snippet.create({
      title: forkedTitle.slice(0, 120),
      command: forkedCommand,
      description: original.description || '',
      languageId: original.languageId,
      languageName: original.languageName,
      code: original.code,
      testCases: original.testCases || [],
      author: req.user ? req.user._id : null,
      forkedFrom: original.snippetId,
      visibility: 'unlisted',
      isPublic: false,
    });

    if (forkedSnippet.author) {
      await forkedSnippet.populate('author', 'username name avatar');
    }

    logger.info({ originalId: original.snippetId, forkedId: forkedSnippet.snippetId }, 'Forked snippet');
    res.status(201).json(formatSnippet(forkedSnippet));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Conflict', message: 'Command already exists.' });
    }
    logger.error({ err: err.message, snippetId }, 'Failed to fork snippet');
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

export default router;
