import type { Review } from '@/types';

export const reviews: Review[] = [
  {
    id: '1',
    username: 'Eloelo2W',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eloelo2W',
    rating: 5,
    comment: "I've been using this program for about 3 years, it's good. I recommend it to everyone.",
    joinedDate: 'Dec 21',
    postedAt: '22 hours ago',
    verified: true,
  },
  {
    id: '2',
    username: 'avis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=avis',
    rating: 5,
    comment: "At first I thought I couldn't trust it, but the more I used it, the more I trusted it. Thank you. / İlk başta güvenemem sanmıştım ama kullandıkça güvenimi kazandı, teşekkürler.",
    joinedDate: 'Jan 26',
    postedAt: '23 hours ago',
    verified: true,
  },
  {
    id: '3',
    username: 'vichoo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vichoo',
    rating: 5,
    comment: 'Gooddrick',
    joinedDate: 'Feb 26',
    postedAt: '3 days ago',
    verified: true,
  },
  {
    id: '4',
    username: 'gr1kseN',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gr1kseN',
    rating: 5,
    comment: 'Works so good. - Thanks <3',
    joinedDate: 'Mar 26',
    postedAt: '4 days ago',
    verified: true,
  },
  {
    id: '5',
    username: 'audipeek',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=audipeek',
    rating: 5,
    comment: 'best booster :)',
    joinedDate: 'Oct 25',
    postedAt: '5 days ago',
    verified: false,
  },
  {
    id: '6',
    username: 'tedariikst',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tedariikst',
    rating: 5,
    comment: 'The person who made this site is Talent.',
    joinedDate: 'Jan 26',
    postedAt: '6 days ago',
    verified: true,
  },
];

export const averageRating = 4.7;
export const totalReviews = 2631;
