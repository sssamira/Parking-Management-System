import React from 'react';
import { Link } from 'react-router-dom';
import ParkSmarterLogo from './ParkSmarterLogo';

const Footer = () => {
  return (
    <footer className="mt-auto bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 lg:py-12">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 lg:gap-16">
          {/* Brand + Description */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <ParkSmarterLogo size={40} className="flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold leading-tight bg-gradient-to-r from-white via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  Park Smarter
                </p>
                <p className="text-[11px] tracking-[0.35em] uppercase text-slate-400 mt-1">
                  PARKING REDEFINED.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-slate-300 max-w-md">
              Where convenience meets control. Discover seamless parking experiences designed for
              modern drivers and smart facility owners.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#151821] hover:bg-[#1b1f2a] transition border border-slate-800/80"
                aria-label="Visit our Instagram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <rect x="5" y="5" width="14" height="14" rx="4" ry="4" />
                  <circle cx="12" cy="12" r="3.2" />
                  <circle cx="16.2" cy="7.8" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#151821] hover:bg-[#1b1f2a] transition border border-slate-800/80"
                aria-label="Visit our Facebook"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 8h2V5.5A8.5 8.5 0 0 0 14.2 5c-1.8 0-3.2 1.3-3.2 3.4V11H9v3h2v5h3v-5h2.2L17 11h-3v-2.4C14 8.2 14.2 8 14 8z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stay Connected */}
          <div className="flex-1 lg:max-w-md">
            <h3 className="text-sm font-semibold tracking-wide text-slate-200">
              Stay Connected
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Be the first to know about new parking locations, offers, and important updates.
            </p>
            <form
              className="mt-4 flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 rounded-full bg-slate-900/60 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400/70"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
          {/* Support */}
          <div>
            <h4 className="text-slate-200 font-semibold">Support</h4>
            <div className="mt-3 space-y-2 text-slate-300">
              <Link to="/contact-us" className="block hover:text-sky-300 transition">
                Contact Us
              </Link>
              <Link to="/refund-policy" className="block hover:text-sky-300 transition">
                Refund Policy
              </Link>
              <Link to="/faq" className="block hover:text-sky-300 transition">
                FAQ
              </Link>
              <Link to="/privacy-policy" className="block hover:text-sky-300 transition">
                Privacy Policy
              </Link>
              <Link to="/about-us" className="block hover:text-sky-300 transition">
                About Us
              </Link>
              <Link
                to="/terms-and-conditions"
                className="block hover:text-sky-300 transition"
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>

          {/* Get in Touch */}
          <div className="md:col-span-1 lg:col-span-2">
            <h4 className="text-slate-200 font-semibold">Get in Touch</h4>
            <div className="mt-3 space-y-2 text-slate-400">
              <p>
                <span className="text-emerald-300 mr-2">✉</span>
                support@parksmarter.com
              </p>
              <p>
                <span className="text-emerald-300 mr-2">☎</span>
                +880 1234 567 890
              </p>
              <p>
                <span className="text-emerald-300 mr-2">📍</span>
                Gulshan, Dhaka
              </p>
              <p>
                <span className="text-emerald-300 mr-2">⏱</span>
                Delivery Time: Inside Dhaka 1–3 days • Outside Dhaka 2–5 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
