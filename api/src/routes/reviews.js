const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { readDb, updateDb } = require('../lib/db');
const { logAuditFromRequest } = require('../services/auditLog');

function mapReview(review) {
  return {
    id: review.id,
    userId: review.userId,
    username: review.username,
    avatar: review.avatar,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    hasPurchase: Boolean(review.hasPurchase),
    plan: review.plan || null,
  };
}

function reviewsRoutes() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    const db = readDb();
    const reviews = Array.isArray(db.reviews) ? db.reviews.map(mapReview) : [];
    return res.json({ reviews });
  });

  router.post('/', requireAuth, async (req, res) => {
    const user = req.auth.user;
    const { rating, comment } = req.body || {};
    const numericRating = Number(rating);
    const text = String(comment || '').trim();

    if (user.plan === 'free') {
      return res.status(403).json({ message: 'Only paid subscribers can submit reviews' });
    }
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!text) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const review = {
      id: `REV-${Date.now()}`,
      userId: user.id,
      username: user.username,
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`,
      rating: numericRating,
      comment: text,
      createdAt: new Date().toISOString(),
      hasPurchase: true,
      plan: user.plan,
    };

    await updateDb((current) => {
      if (!Array.isArray(current.reviews)) current.reviews = [];
      current.reviews.unshift(review);
      return current;
    });
    await logAuditFromRequest(req, {
      action: 'review_create',
      targetType: 'review',
      targetId: review.id,
      meta: { rating: numericRating },
    });

    return res.json({ review: mapReview(review) });
  });

  return router;
}

module.exports = {
  reviewsRoutes,
};
