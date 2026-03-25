const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/stats
 * Dashboard overview stats
 */
router.get('/stats', async (req, res) => {
  const [usersRes, subsRes, drawsRes, winnersRes, charityRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id, amount_paid', { count: 'exact' }).eq('status', 'active'),
    supabase.from('draws').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('winners').select('prize_amount'),
    supabase.from('charity_contributions').select('amount')
  ]);

  const totalSubscriptionRevenue = (subsRes.data || []).reduce((sum, s) => sum + s.amount_paid, 0);
  const totalPrizesPaid = (winnersRes.data || []).reduce((sum, w) => sum + (w.prize_amount || 0), 0);
  const totalCharityRaised = (charityRes.data || []).reduce((sum, c) => sum + (c.amount || 0), 0);

  res.json({
    totalUsers: usersRes.count || 0,
    activeSubscribers: subsRes.count || 0,
    totalDraws: drawsRes.count || 0,
    totalSubscriptionRevenue: parseFloat(totalSubscriptionRevenue.toFixed(2)),
    totalPrizesPaid: parseFloat(totalPrizesPaid.toFixed(2)),
    totalCharityRaised: parseFloat(totalCharityRaised.toFixed(2))
  });
});

/**
 * GET /api/admin/users
 * Paginated user list
 */
router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  let query = supabase
    .from('profiles')
    .select('*, subscriptions(status, plan, current_period_end)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

/**
 * GET /api/admin/winners
 * All winners with verification status
 */
router.get('/winners', async (req, res) => {
  const { status } = req.query;

  let query = supabase
    .from('winners')
    .select('*, profiles(full_name, email), draws(month, year)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('payment_status', status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * PATCH /api/admin/winners/:id/verify
 * Approve or reject a winner's proof submission
 */
router.patch('/winners/:id/verify', async (req, res) => {
  const { approved, admin_notes } = req.body;

  const updates = {
    payment_status: approved ? 'paid' : 'rejected',
    admin_notes,
    verified_at: new Date().toISOString()
  };

  if (approved) {
    updates.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('winners')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/admin/draws
 * Create a new draw
 */
router.post('/draws', async (req, res) => {
  const { month, year, logic, rollover_amount } = req.body;

  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  // Calculate total pool from active subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('amount_paid')
    .eq('status', 'active');

  const totalPool = (subs || []).reduce((sum, s) => sum + s.amount_paid, 0);

  const { data, error } = await supabase
    .from('draws')
    .insert({
      month: parseInt(month),
      year: parseInt(year),
      logic: logic || 'random',
      total_pool: parseFloat(totalPool.toFixed(2)),
      rollover_amount: rollover_amount || 0
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/**
 * PATCH /api/admin/users/:id/scores
 * Admin edit a user's score
 */
router.patch('/users/:id/scores/:scoreId', async (req, res) => {
  const { score, played_date } = req.body;

  if (score && (score < 1 || score > 45)) {
    return res.status(400).json({ error: 'Score must be between 1 and 45' });
  }

  const { data, error } = await supabase
    .from('golf_scores')
    .update({ score, played_date })
    .eq('id', req.params.scoreId)
    .eq('user_id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
