const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/charities
 * List all active charities
 */
router.get('/', async (req, res) => {
  const { search, featured } = req.query;

  let query = supabase
    .from('charities')
    .select('*, charity_events(*)')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('name');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (featured === 'true') {
    query = query.eq('is_featured', true);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/charities/:slug
 * Single charity profile
 */
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('charities')
    .select('*, charity_events(*)')
    .eq('slug', req.params.slug)
    .eq('is_active', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Charity not found' });
  res.json(data);
});

// ── Admin routes ─────────────────────────────────────────────

/**
 * POST /api/charities (Admin)
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, slug, description, logo_url, banner_url, website_url, is_featured } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }

  const { data, error } = await supabase
    .from('charities')
    .insert({ name, slug, description, logo_url, banner_url, website_url, is_featured: !!is_featured })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/**
 * PUT /api/charities/:id (Admin)
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, description, logo_url, banner_url, website_url, is_featured, is_active } = req.body;

  const { data, error } = await supabase
    .from('charities')
    .update({ name, description, logo_url, banner_url, website_url, is_featured, is_active })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * DELETE /api/charities/:id (Admin)
 * Soft delete — sets is_active = false
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('charities')
    .update({ is_active: false })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Charity deactivated' });
});

module.exports = router;
