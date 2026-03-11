import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

interface ReviewsProps {
  openAuth: (mode: 'login' | 'register') => void;
}

export default function Reviews({ openAuth }: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    apiRequest<{ reviews: Review[] }>('/reviews')
      .then((payload) => setReviews(payload.reviews || []))
      .catch(() => {
        setReviews([]);
      });
  }, []);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const displayReviews = reviews.length > 0 ? reviews.slice(0, 6) : [];

  return (
    <section id="reviews" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">{t('reviews.title')}</h2>
          <p className="text-lg text-slate-400">{t('reviews.subtitle')}</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-6 text-center"
          >
            <div className="text-5xl font-bold text-white mb-2">
              {averageRating}
              <span className="text-2xl text-slate-500">/5</span>
            </div>
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(Number(averageRating))
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
            <p className="text-slate-400">
              <span className="text-white font-semibold">{reviews.length}</span> {t('reviews.total')}
            </p>
            <p className="text-sm text-slate-500 mt-1">{t('reviews.trusted')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 glass rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{t('reviews.writeReview')}</h3>
              <p className="text-slate-400">{t('reviews.loginToReview')}</p>
            </div>
            <Button
              onClick={() => openAuth('login')}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('nav.login')}
            </Button>
          </motion.div>
        </div>

        {displayReviews.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="glass rounded-2xl p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={review.avatar}
                      alt={review.username}
                      className="w-10 h-10 rounded-full bg-slate-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{review.username}</span>
                        {review.plan && (
                          <span className="text-[10px] text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full uppercase">
                            {review.plan}
                          </span>
                        )}
                        {review.hasPurchase && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{review.comment}</p>
                {review.hasPurchase && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-3">
                    <CheckCircle className="w-3 h-3" />
                    {t('reviews.verified')}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {reviews.length > 6 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              {t('reviews.loadMore')}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
