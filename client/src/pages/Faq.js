import React, { useState } from 'react';

const FAQ_CATEGORIES = ['All', 'General', 'For Drivers', 'Payments'];

const FAQ_ITEMS = [
  {
    id: 'what-is',
    category: 'General',
    question: 'What is ParkSmarter?',
    answer:
      'ParkSmarter is a smart parking platform that helps drivers quickly find, book, and manage parking spots in advance or on the go.',
  },
  {
    id: 'how-it-works',
    category: 'General',
    question: 'How does ParkSmarter work?',
    answer:
      'You search for available spots, choose the one that fits your needs, confirm the booking, and receive all details in your account and email.',
  },
  {
    id: 'availability',
    category: 'General',
    question: 'Is ParkSmarter available in my area?',
    answer:
      'We are continuously expanding to new locations. Log in and check the live map or search to see availability around Gulshan, Dhaka and beyond.',
  },
  {
    id: 'book-spot',
    category: 'For Drivers',
    question: 'How do I book a parking spot?',
    answer:
      'From your dashboard, go to “Spot Pre-Booking”, choose location, date, and time, then confirm the booking. You will instantly see the booking in “My Bookings”.',
  },
  {
    id: 'cancel-booking',
    category: 'For Drivers',
    question: 'Can I cancel my booking?',
    answer:
      'Yes. You can cancel a booking from the “My Bookings” page, subject to the cancellation rules that apply to that specific parking location.',
  },
  {
    id: 'arrive-late',
    category: 'For Drivers',
    question: 'What if I arrive late or need to extend my parking?',
    answer:
      'If extension is allowed for your booking, you will see an “Extend” option in “My Bookings”. If not, please contact support so we can help you.',
  },
  {
    id: 'support-24',
    category: 'General',
    question: 'Is customer support available 24/7?',
    answer:
      'Yes, you can reach our support team at any time via the in‑app chat or email at support@parksmarter.com.',
  },
  {
    id: 'payments-methods',
    category: 'Payments',
    question: 'What payment methods do you accept?',
    answer:
      'We support major debit/credit cards and popular mobile payment options where available. You can manage your preferred method under “Payment Method”.',
  },
  {
    id: 'payments-secure',
    category: 'Payments',
    question: 'Is my payment information secure?',
    answer:
      'Yes. We never store full card details on our servers and work with trusted, PCI‑compliant payment providers to process your transactions securely.',
  },
  {
    id: 'hidden-fees',
    category: 'Payments',
    question: 'Are there any hidden fees?',
    answer:
      'No. All parking fees, service charges, and taxes are shown clearly before you confirm your booking so you always know what you are paying.',
  },
];

const Faq = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [openId, setOpenId] = useState('what-is');

  const filteredItems =
    activeCategory === 'All'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-indigo-100">
            Frequently Asked Questions
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold">Find answers quickly</h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-indigo-100/90 leading-relaxed">
            Browse common questions about ParkSmarter. Learn how bookings, payments, and support
            work in one place.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10 md:space-y-14">
        {/* Category filters */}
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {FAQ_CATEGORIES.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ list */}
        <section className="space-y-3">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? '' : item.id)}
                  className="w-full flex items-center justify-between px-4 md:px-5 py-3.5 text-left text-sm md:text-base text-slate-900"
                >
                  <span>{item.question}</span>
                  <span className="ml-4 text-slate-400">
                    {isOpen ? (
                      <span className="inline-block rotate-180">˅</span>
                    ) : (
                      <span className="inline-block">˅</span>
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 md:px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Still have questions */}
        <section className="rounded-2xl bg-slate-100 border border-slate-200 px-6 py-8 md:px-10 md:py-10 text-center space-y-3">
          <h2 className="text-lg md:text-xl font-semibold text-slate-900">Still have questions?</h2>
          <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help
            you any time.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:support@parksmarter.com"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-indigo-500 transition"
            >
              Email Support
            </a>
            <a
              href="tel:+8801234567890"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-800 px-5 py-2.5 text-sm font-semibold hover:bg-slate-200 transition"
            >
              Call Us
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Faq;

