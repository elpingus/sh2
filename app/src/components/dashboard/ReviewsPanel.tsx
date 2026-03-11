import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Star, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface Review {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  rating: number;
  comment: string;
  createdAt: string;
  hasPurchase: boolean;
  plan?: string;
}

export default function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const payload = await apiRequest<{ reviews: Review[] }>('/reviews');
        const nextReviews = payload.reviews || [];
        setReviews(nextReviews);
        if (user) {
          setUserReviews(nextReviews.filter((r) => r.userId === user.id));
        } else {
          setUserReviews([]);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load reviews');
      }
    };

    void loadReviews();
  }, [user]);

  const submitReview = () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    if (user.plan === 'free') {
      toast.error('Only paid subscribers can submit reviews');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    apiRequest<{ review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    })
      .then((payload) => {
        const nextReview = payload.review;
        const nextReviews = [nextReview, ...reviews];
        setReviews(nextReviews);
        setUserReviews([nextReview, ...userReviews]);
        setReviewModalOpen(false);
        setRating(0);
        setComment('');
        toast.success('Review submitted successfully!');
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to submit review');
      });
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingLabels: Record<number, string> = {
    1: 'Terrible',
    2: 'Bad',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('reviews.title')}</h1>
          <p className="text-slate-400">{t('reviews.subtitle')}</p>
        </div>
        <Button onClick={() => setReviewModalOpen(true)} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
          <MessageSquare className="w-4 h-4 mr-2" />
          {t('reviews.writeReview')}
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-5xl font-bold text-white mb-2">{averageRating}<span className="text-2xl text-slate-500">/5</span></div>
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`w-5 h-5 ${star <= Math.round(Number(averageRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
            ))}
          </div>
          <p className="text-slate-400"><span className="text-white font-semibold">{reviews.length}</span> {t('reviews.total')}</p>
          <p className="text-sm text-slate-500 mt-1">{t('reviews.trusted')}</p>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">{t('reviews.writeReview')}</h3>
            <p className="text-slate-400">Only paid plans can post reviews</p>
          </div>
          <Button onClick={() => setReviewModalOpen(true)} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white whitespace-nowrap">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('nav.login')}
          </Button>
        </div>
      </motion.div>

      {userReviews.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Reviews</h3>
          <div className="space-y-4">
            {userReviews.map((review) => (
              <motion.div key={review.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-4 glass rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={review.avatar} alt={review.username} className="w-10 h-10 rounded-full bg-slate-800" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{review.username}</span>
                        {review.hasPurchase && (
                          <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{t('reviews.verified')}</span>
                        )}
                        {review.plan && (
                          <span className="text-xs text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full uppercase">{review.plan}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />))}</div>
                </div>
                <p className="text-slate-300 text-sm">{review.comment}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Community Reviews</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.slice(0, 6).map((review) => (
            <div key={review.id} className="p-4 glass rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src={review.avatar} alt={review.username} className="w-8 h-8 rounded-full bg-slate-800" />
                  <div>
                    <p className="text-white text-sm font-medium">{review.username}</p>
                    <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />))}</div>
              </div>
              <p className="text-slate-400 text-sm line-clamp-2">{review.comment}</p>
              <div className="mt-2 flex items-center gap-2">
                {review.hasPurchase && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{t('reviews.verified')}</span>}
                {review.plan && <span className="text-xs text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full uppercase">{review.plan}</span>}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t('reviews.writeReview')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-white mb-3">How would you rate your experience?</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${star <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-400 mt-2">{rating > 0 && ratingLabels[rating]}</p>
            </div>

            <div>
              <p className="text-white mb-2">Share your thoughts</p>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us about your experience with SteamBoost..." rows={4} className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <Button variant="outline" onClick={() => setReviewModalOpen(false)} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">Cancel</Button>
              <Button onClick={submitReview} disabled={rating === 0 || !comment.trim()} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white disabled:opacity-50">
                <Send className="w-4 h-4 mr-2" />
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
