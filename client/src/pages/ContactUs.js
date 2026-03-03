import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ParkSmarterLogo from '../components/ParkSmarterLogo';

const ContactUs = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder – integrate with backend or email service later
    // eslint-disable-next-line no-alert
    alert('Thank you for reaching out. We will get back to you shortly.');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <Link to="/" className="inline-flex items-center gap-3 mb-6 text-white hover:opacity-90 transition">
            <ParkSmarterLogo size={48} />
            <span className="text-2xl font-bold">Park Smarter</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-semibold">Contact Us</h1>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-indigo-100/90 leading-relaxed">
            We&apos;re here to help. Get in touch with ParkSmarter anytime for questions, feedback,
            or support.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,1.6fr] lg:items-start">
          {/* Left: contact details */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Get In Touch</h2>
              <p className="mt-2 text-sm md:text-base text-slate-600 leading-relaxed">
                Have a question or need assistance? Our support team is available 24/7 to help you
                with anything you need.
              </p>
            </div>

            <div className="space-y-5 text-sm md:text-base">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  ✉
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Email</p>
                  <p className="text-slate-600">support@parksmarter.com</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  ☎
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Phone</p>
                  <p className="text-slate-600">+880 1234 567 890</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  📍
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Office</p>
                  <p className="text-slate-600">Gulshan, Dhaka</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  ⏱
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Support Hours</p>
                  <p className="text-slate-600">24/7 – We&apos;re always here for you</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right: contact form */}
          <section className="rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-6 md:px-7 md:py-7">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-4">
              Send Us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm md:text-base">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-xs font-medium text-slate-600">
                    Your Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-medium text-slate-600">
                    Your Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="subject" className="block text-xs font-medium text-slate-600">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                >
                  <option value="">Select a subject</option>
                  <option value="booking">Booking issue</option>
                  <option value="payment">Payment or refund</option>
                  <option value="account">Account or login</option>
                  <option value="feedback">Feedback or suggestion</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="block text-xs font-medium text-slate-600">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help you..."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex w-full md:w-auto items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
                >
                  Send Message
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ContactUs;

