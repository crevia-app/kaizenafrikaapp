import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Privacy Policy" description="Read Kaizen Afrika's Privacy Policy. Learn how we collect, use, and protect your personal data in compliance with the Kenya Data Protection Act, 2019." keywords="Kaizen Afrika privacy policy, data protection, Kenya Data Protection Act, personal data" url="/privacy-policy" />

      <main className="container max-w-4xl px-4 py-8 md:py-16">
        <div className="mb-8 md:mb-12">
          <h1 className="font-vollkorn text-3xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Last Updated: June 2, 2026 &nbsp;·&nbsp; Effective Date: June 2, 2026
          </p>
        </div>

        <Card className="p-6 md:p-8 space-y-8">

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Kaizen Afrika Ventures Limited ("we," "us," "our") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal and corporate data when you use the Kaizen Afrika platform and any other current or future products we provide. We operate in compliance with the Kenya Data Protection Act, 2019.
            </p>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">2. Information We Collect</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Data:</strong> Name, email address, phone number, and billing information.</li>
                <li><strong>Business Data:</strong> Client rosters, brand assets, and organizational hierarchies.</li>
                <li><strong>Operational &amp; Financial Data:</strong> Information inputted into Kaizen Studio and Kaizen Invoice (line items, pricing, counterparty details).</li>
                <li><strong>AI Interaction Data:</strong> Prompts, queries, and contextual data submitted to our AI assistant (Kira) to improve business structuring and platform functionality.</li>
                <li><strong>Usage Data:</strong> Analytics regarding your interaction with Kaizen Link pages, including visitor tracking.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">3. How We Use Your Information</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>We use your data strictly to operate and improve the platform:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To facilitate platform operations and invoice routing.</li>
                <li>To provide contextual intelligence via Kira.</li>
                <li>To manage subscription billing and enforce Role-Based Access Control.</li>
                <li>To track usage metrics for Pro and Business tier analytics.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">4. Data Sharing and Disclosure</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>We do not sell your data to data brokers. We only share information under the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Providers:</strong> With trusted cloud hosting providers and payment gateways necessary to run our infrastructure.</li>
                <li><strong>Legal Compliance:</strong> If required by law, subpoena, or government request (e.g., KRA audits), we will disclose data as legally mandated.</li>
                <li><strong>Counterparties:</strong> When you send an invoice or a client link, the strictly necessary data on that document is shared with the recipient.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">5. Artificial Intelligence and Data Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you interact with Kira, your prompts and uploaded context are processed to generate immediate responses. We implement strict siloing for Business tiers to ensure that one brand's proprietary business data, operational structures, or financial information is never used to train the AI models answering queries for a different brand.
            </p>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement enterprise-grade security measures to protect your operational data and financial routing information. However, no digital infrastructure is 100% secure. You are responsible for securing your account credentials and managing access for your team members.
            </p>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">7. Your Rights</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>Under the Kenya Data Protection Act, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Request the correction of inaccurate data.</li>
                <li>Request the deletion of your account and associated personal data (subject to legal data retention requirements for financial records).</li>
                <li>Object to the processing of your data for direct marketing.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions regarding this Privacy Policy or to exercise your data rights, please contact our team:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="font-poppins text-sm">
                <strong>Email:</strong> hi@kaizenafrika.app<br />
                <strong>Location:</strong> Nairobi, Kenya
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-vollkorn text-2xl md:text-3xl font-bold mb-4">9. Changes to this Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our technology, legal requirements, or business operations. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically. Continued use of Kaizen Afrika after updates are published constitutes your acknowledgment and consent to the revised policy.
            </p>
          </section>

        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
