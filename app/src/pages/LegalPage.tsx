import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/sections/Footer';

interface LegalPageProps {
  openAuth: (mode: 'login' | 'register') => void;
  changeLanguage: (lang: string) => void;
  type: 'terms' | 'privacy';
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-slate-300 text-sm leading-7 space-y-3">{children}</div>
    </section>
  );
}

export default function LegalPage({ openAuth, changeLanguage, type }: LegalPageProps) {
  const isTerms = type === 'terms';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-slate-950"
    >
      <Navbar openAuth={openAuth} changeLanguage={changeLanguage} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-white">
            {isTerms ? 'Terms of Service' : 'Privacy Policy'}
          </h1>
          <p className="text-slate-400 text-sm">
            Effective date: March 8, 2026
          </p>
        </div>

        {isTerms ? (
          <>
            <Section title="1. Service Scope">
              <p>
                Steamhoursnet provides software and automation tools for Steam hour boosting and
                account management features available in your selected plan.
              </p>
              <p>
                You are responsible for the Steam account credentials you submit and for complying
                with Steam rules and any third-party platform rules.
              </p>
            </Section>

            <Section title="2. Account and Eligibility">
              <p>
                You must provide accurate account information and maintain the security of your
                login credentials. You are responsible for activity performed from your account.
              </p>
              <p>
                We may suspend or terminate accounts involved in abuse, fraud, payment abuse,
                system attacks, automated ticket spam, or unlawful activity.
              </p>
            </Section>

            <Section title="3. Payments, Plans, and Refunds">
              <p>
                Paid plans are sold as digital services. Shopier is the payment provider currently
                used for hosted checkout. Multi-account pricing and discounts are shown before
                payment confirmation.
              </p>
              <p>
                After payment confirmation, the service generates a redeem code that activates the
                purchased plan on the account where the code is redeemed. Delivery is digital and
                no physical shipment is involved.
              </p>
              <p>
                Refund requests are reviewed case-by-case, including service usage status, abuse
                checks, and payment processor constraints. Chargeback abuse may result in account
                suspension.
              </p>
            </Section>

            <Section title="4. Acceptable Use">
              <p>
                You must not use the platform to distribute malware, perform unauthorized access,
                abuse support systems, run payment fraud, or attempt to disrupt the service.
              </p>
              <p>
                Repeated spam ticket creation, harassment, or impersonation may result in account
                restrictions.
              </p>
            </Section>

            <Section title="5. Availability and Liability">
              <p>
                We aim for high uptime but do not guarantee uninterrupted service. Maintenance,
                provider outages, API changes, and force majeure events may affect availability.
              </p>
              <p>
                To the extent permitted by law, SteamBoost is not liable for indirect, incidental,
                consequential, or special damages related to service use.
              </p>
            </Section>

            <Section title="6. Changes and Contact">
              <p>
                We may update these Terms when legal or operational requirements change. Material
                updates take effect when posted on this page.
              </p>
              <p>
                For legal and policy questions: <a className="text-violet-400 hover:text-violet-300" href="mailto:legal@steamhoursnet.xyz">legal@steamhoursnet.xyz</a>
              </p>
            </Section>
          </>
        ) : (
          <>
            <Section title="1. Data We Collect">
              <p>
                We collect account profile data (username, email), plan and billing metadata,
                support ticket content, and technical logs needed to secure and operate the
                platform.
              </p>
              <p>
                For Steam features, we store only required account configuration and encrypted
                sensitive credentials when you explicitly provide them.
              </p>
            </Section>

            <Section title="2. How We Use Data">
              <p>
                We use your data to authenticate accounts, deliver paid features, process billing,
                prevent abuse, respond to support requests, and improve product stability.
              </p>
              <p>
                Billing and fulfillment metadata can include purchase status, invoice identifiers,
                redeem code status, payment amount, and payment timestamps.
              </p>
              <p>
                We do not sell your personal data to third parties.
              </p>
            </Section>

            <Section title="3. Sharing and Processors">
              <p>
                We may share limited data with infrastructure and payment providers only as needed
                to operate the service (for example Shopier payment processing, fraud checks, or hosting).
              </p>
              <p>
                We require processors to protect data under contractual and security obligations.
              </p>
            </Section>

            <Section title="4. Retention and Security">
              <p>
                We keep data only as long as needed for service operation, legal compliance, fraud
                prevention, and dispute handling.
              </p>
              <p>
                We use reasonable technical safeguards such as encryption for sensitive fields,
                access controls, and audit logs.
              </p>
            </Section>

            <Section title="5. Your Rights">
              <p>
                You may request access, correction, or deletion of your personal data. You may also
                request account closure by contacting support.
              </p>
              <p>
                Some data may be retained when required by law, anti-fraud obligations, or payment
                dispute workflows.
              </p>
            </Section>

            <Section title="6. Contact">
              <p>
                For privacy requests and questions: <a className="text-violet-400 hover:text-violet-300" href="mailto:privacy@steamhoursnet.xyz">privacy@steamhoursnet.xyz</a>
              </p>
            </Section>
          </>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
