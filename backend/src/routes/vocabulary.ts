import { Router, Response } from 'express';
import { Vocabulary } from '@/models/Vocabulary';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

// Search vocabulary
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, frequency_rank, limit = 20, offset = 0 } = req.query;

    let query = Vocabulary.query().where('deleted_at', null);

    if (q) {
      const searchTerm = `%${q}%`;
      query = query.whereRaw('spanish ILIKE ? OR english::text ILIKE ?', [searchTerm, searchTerm]);
    }

    if (frequency_rank) {
      query = query.where('frequency_rank', '<=', parseInt(frequency_rank as string));
    }

    const vocabulary = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy('frequency_rank', 'asc');

    const total = await Vocabulary.query()
      .where('deleted_at', null)
      .resultSize();

    res.json({ vocabulary, total, limit, offset });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search vocabulary';
    logger.error('Search vocabulary error:', message);
    res.status(500).json({ error: message });
  }
});

// Get vocabulary by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const vocab = await Vocabulary.query()
      .findById(id)
      .where('deleted_at', null);

    if (!vocab) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json(vocab);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch vocabulary';
    logger.error('Get vocabulary error:', message);
    res.status(500).json({ error: message });
  }
});

// Get vocabulary audio
router.get('/:id/audio', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const vocab = await Vocabulary.query()
      .findById(id)
      .where('deleted_at', null);

    if (!vocab || !vocab.audio_url) {
      res.status(404).json({ error: 'Audio not found' });
      return;
    }

    // Redirect to audio file (S3 signed URL in production)
    res.redirect(vocab.audio_url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get audio';
    logger.error('Get audio error:', message);
    res.status(500).json({ error: message });
  }
});

// Get related words
router.get('/:id/related', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const vocab = await Vocabulary.query()
      .findById(id)
      .where('deleted_at', null);

    if (!vocab) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    if (!vocab.related_vocab_ids || vocab.related_vocab_ids.length === 0) {
      res.json({ related: [] });
      return;
    }

    const related = await Vocabulary.query()
      .whereIn('id', vocab.related_vocab_ids)
      .where('deleted_at', null);

    res.json({ related });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch related words';
    logger.error('Get related error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
