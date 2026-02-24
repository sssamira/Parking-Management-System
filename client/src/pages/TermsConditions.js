import React from 'react';

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-semibold">Terms &amp; Conditions</h1>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-indigo-100/90 leading-relaxed">
            Please read these Terms &amp; Conditions carefully before using ParkSmarter. By creating
            an account or using our services, you agree to these terms.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 md:py-12">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-6 md:px-8 md:py-8 text-sm md:text-base text-slate-700 leading-relaxed space-y-6">
          {/* 1. Definitions */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">1. Definitions</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>&quot;Platform&quot;</strong> refers to the ParkSmarter website, web
                application, and all related services.
              </li>
              <li>
                <strong>&quot;User&quot;</strong> or <strong>&quot;you&quot;</strong> refers to any
                person who creates an account or uses the Platform.
              </li>
              <li>
                <strong>&quot;Booking&quot;</strong> refers to a reservation for a parking space
                made through the Platform.
              </li>
              <li>
                <strong>&quot;Parking space&quot;</strong> or <strong>&quot;spot&quot;</strong>{' '}
                refers to a location that can be booked for vehicle parking.
              </li>
              <li>
                <strong>&quot;We&quot;</strong>, <strong>&quot;us&quot;</strong>, and{' '}
                <strong>&quot;our&quot;</strong> refer to the ParkSmarter service operators.
              </li>
            </ul>
          </section>

          {/* 2. Eligibility and Account Registration */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">
              2. Eligibility and Account Registration
            </h2>
            <h3 className="font-medium text-slate-900">2.1 Eligibility</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Be at least 18 years of age.</li>
              <li>Have legal capacity to enter into binding agreements.</li>
              <li>Use the Platform only in accordance with applicable laws and regulations.</li>
            </ul>
            <h3 className="font-medium text-slate-900 mt-3">2.2 Account Registration</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>You agree to provide accurate, complete, and current information.</li>
              <li>
                You are responsible for maintaining the confidentiality of your login credentials.
              </li>
              <li>You will immediately notify us of any unauthorized use of your account.</li>
              <li>You may not share your account or maintain more than one account. </li>
            </ul>
          </section>

          {/* 3. Use of Services */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">3. Use of Services</h2>
            <h3 className="font-medium text-slate-900">3.1 Permitted Use</h3>
            <p>
              You may use ParkSmarter to search, book, and manage parking spaces for lawful
              purposes only.
            </p>
            <h3 className="font-medium text-slate-900 mt-3">3.2 Prohibited Use</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Using the Platform for any illegal or fraudulent activity.</li>
              <li>Attempting to interfere with or disrupt the security or operation of the app.</li>
              <li>Reverse engineering or attempting to access the source code.</li>
              <li>Using automated tools (bots, scrapers) without our prior written consent.</li>
            </ul>
          </section>

          {/* 4. Bookings and Payments */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">4. Bookings and Payments</h2>
            <h3 className="font-medium text-slate-900">4.1 Booking Process</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                All bookings are subject to availability and confirmation within the Platform.
              </li>
              <li>
                You are responsible for verifying the booking details (location, date, time,
                vehicle).
              </li>
              <li>
                Confirmation emails or in‑app notifications serve as proof of your booking details.
              </li>
            </ul>
            <h3 className="font-medium text-slate-900 mt-3">4.2 Payments</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>All prices are shown in the local currency unless otherwise stated.</li>
              <li>
                By adding a payment method, you authorize us to charge all applicable fees related to
                your bookings.
              </li>
              <li>
                We may use third‑party payment processors to handle transactions securely on our
                behalf.
              </li>
            </ul>
            <h3 className="font-medium text-slate-900 mt-3">4.3 Service Fees</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Some bookings may include a non‑refundable service fee.</li>
              <li>Any fees will be clearly shown before you confirm your booking.</li>
            </ul>
          </section>

          {/* 5. Cancellations and Refunds */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">5. Cancellations and Refunds</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Cancellation and refund eligibility depends on the policies of each parking
                location.
              </li>
              <li>
                Some bookings may be non‑refundable once the start time is close or has passed.
              </li>
              <li>
                Where refunds are permitted, they will be processed to your original payment method
                within a reasonable period.
              </li>
            </ul>
          </section>

          {/* 6. User Responsibilities */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">6. User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Arrive and depart within your reserved time window.</li>
              <li>Park only in the space designated in your booking.</li>
              <li>
                Follow all posted rules, signage, and instructions at the parking location,
                including speed limits and safety rules.
              </li>
              <li>
                You are responsible for any fines, tickets, or penalties incurred during your stay.
              </li>
            </ul>
          </section>

          {/* 7. Damage and Liability */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">7. Damage and Liability</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                ParkSmarter is not responsible for loss, theft, or damage to vehicles or personal
                property.
              </li>
              <li>
                Drivers are responsible for any damage they cause to parking spaces, equipment, or
                third‑party property.
              </li>
              <li>
                To the maximum extent permitted by law, our total liability to you for any claims
                will not exceed the total amount you paid for bookings in the previous three (3)
                months. 
              </li>
            </ul>
          </section>

          {/* 8. Privacy */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">8. Privacy</h2>
            <p>
              Your use of ParkSmarter is also governed by our Privacy Policy, which explains how we
              collect, use, and protect your personal information.
            </p>
          </section>

          {/* 9. Changes to the Service and Terms */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">9. Changes to the Service and Terms</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                We may update, modify, or discontinue parts of the Platform at any time to improve
                performance or add new features.
              </li>
              <li>
                We may update these Terms &amp; Conditions from time to time. If we make material
                changes, we will provide notice within the app or via email.
              </li>
              <li>
                Continued use of the Platform after changes become effective constitutes your
                acceptance of the revised terms.
              </li>
            </ul>
          </section>

          {/* 10. Governing Law */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">10. Governing Law</h2>
            <p>
              These Terms &amp; Conditions are governed by the laws of Bangladesh. Any disputes will
              be subject to the exclusive jurisdiction of the courts located in Dhaka, Bangladesh,
              unless otherwise required by applicable law.
            </p>
          </section>

          {/* 11. Contact */}
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-900">11. Contact</h2>
            <p>
              If you have any questions about these Terms &amp; Conditions, please contact us at
              support@parksmarter.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsConditions;

