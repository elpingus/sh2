import type { FAQ } from '@/types';

export const faqs: FAQ[] = [
  {
    id: '1',
    question: 'What does this system do?',
    answer: 'Our platform allows you to increase your Steam playtime hours by running idle sessions in the cloud. You select games, and our workers keep them "running" 24/7, accumulating playtime without needing your PC to be on.',
  },
  {
    id: '2',
    question: 'Is there a VAC risk?',
    answer: 'We take strong security measures for account and operational safety. However, we cannot provide absolute guarantees regarding third-party platform rules and game-specific penalties. We recommend avoiding aggressive behavior in VAC-protected games and using the service responsibly.',
  },
  {
    id: '3',
    question: 'Do I need to provide my Steam password?',
    answer: 'No. We use Steam\'s official OpenID authentication system. You authenticate directly with Steam, and we only receive your SteamID and public profile information. Your password is never shared with us.',
  },
  {
    id: '4',
    question: 'How do I select games?',
    answer: 'After connecting your Steam account, you can search and select games from your library through our dashboard. Our advanced search supports fuzzy matching, aliases (like "cs2" for Counter-Strike 2), and typo tolerance.',
  },
  {
    id: '5',
    question: 'What happens when my hours run out?',
    answer: 'When your plan hours are depleted, your boost jobs will automatically stop. You can purchase additional hours or upgrade your plan anytime from the dashboard. Free plan users get refilled every 10 days.',
  },
  {
    id: '6',
    question: 'When does the Free plan refill?',
    answer: 'Free plan users receive 100 hours per game every 10 days. The refill is automatic and idempotent - you\'ll never receive duplicate refills.',
  },
  {
    id: '7',
    question: 'Can I add multiple games at once?',
    answer: 'Yes! Depending on your plan, you can boost multiple games simultaneously. Free supports 1 game, while Lifetime supports up to 32 games at once.',
  },
  {
    id: '8',
    question: 'Can I use the panel on mobile?',
    answer: 'Absolutely. Our dashboard is fully responsive and works perfectly on mobile devices, tablets, and desktops. Manage your boosts from anywhere.',
  },
  {
    id: '9',
    question: 'How long after payment is the plan active?',
    answer: 'Plans are activated instantly after payment confirmation. There\'s no waiting time - you can start boosting immediately.',
  },
  {
    id: '10',
    question: 'Is there a refund policy?',
    answer: 'We offer refunds within 7 days of purchase if you haven\'t used any hours from your plan. Partial refunds may be considered on a case-by-case basis.',
  },
  {
    id: '11',
    question: 'How long does support take to respond?',
    answer: 'Our support team typically responds within 24 hours. Premium and Super users receive priority support with faster response times.',
  },
  {
    id: '12',
    question: 'How do I close my account?',
    answer: 'You can request account deletion from your Account Settings page. All your data will be permanently removed within 30 days as per our privacy policy.',
  },
  {
    id: '13',
    question: 'Can I sign in with Google?',
    answer: 'Yes! We support Google Sign-In using modern Google Identity Services. You can also use email/password or link your Steam account.',
  },
  {
    id: '14',
    question: 'Is there language support?',
    answer: 'Yes, we support 7 languages: English, Turkish, German, Spanish, Portuguese, Polish, and Russian. More languages coming soon!',
  },
];
