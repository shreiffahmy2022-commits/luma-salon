import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — RG" };

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-serif font-bold text-[#2c2138] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#7a7590] mb-8">Last updated: August 2026</p>

        <div className="prose prose-sm text-[#3a3548] space-y-6">
          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">1. Introduction</h2>
            <p>
              RG (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the RG salon management
              application. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our mobile application and web platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">2. Information We Collect</h2>
            <p><strong>Account Information:</strong> When salon owners register, we collect business name, email address, and password.</p>
            <p><strong>Booking Information:</strong> When customers book appointments, we collect name, phone number, email (optional), and appointment preferences.</p>
            <p><strong>Usage Data:</strong> We collect information about how you interact with the app, including pages visited, features used, and device information.</p>
            <p><strong>Transaction Data:</strong> Point-of-sale transactions, including service details and payment amounts (we do not store credit card numbers).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain the salon management platform</li>
              <li>To process and manage appointment bookings</li>
              <li>To send booking confirmations and reminders</li>
              <li>To generate business reports and analytics for salon owners</li>
              <li>To improve our services and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">4. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share data with:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Service providers who assist in operating our platform (hosting, analytics)</li>
              <li>Legal authorities when required by law or to protect our rights</li>
              <li>Salon owners receive access only to their own customers&apos; booking data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data,
              including encryption of data in transit (TLS/SSL), hashed passwords, and access controls.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services.
              Salon owners can delete customer records through the application.
              You may request deletion of your account by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">8. Children&apos;s Privacy</h2>
            <p>
              Our service is not directed to individuals under 13. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by updating the &ldquo;Last updated&rdquo; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#2c2138]">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:privacy@luma.app" className="text-[#5b3b6e] underline">privacy@luma.app</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[#e9e6f2] text-center text-xs text-[#7a7590]">
          Powered by <b>RG</b> · Salon SaaS
        </div>
      </div>
    </div>
  );
}
