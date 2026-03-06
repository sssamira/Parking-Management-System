import React from 'react';
import { Link } from 'react-router-dom';
import ParkSmarterLogo from '../components/ParkSmarterLogo';

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <Link to="/" className="inline-flex items-center gap-3 mb-6 text-white hover:opacity-90 transition">
            <ParkSmarterLogo size={48} />
            <span className="text-2xl font-bold">Park Smarter</span>
          </Link>
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-indigo-100">
            About Us
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold">
            Revolutionizing Parking Management
          </h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-indigo-100/90 leading-relaxed">
            Welcome to ParkSmarter, where we&apos;re transforming the way parking works. Our mission
            is to solve parking challenges through innovative technology and exceptional service.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12 md:space-y-16">
        {/* Our Story with image */}
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-3">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Our Story</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              What started as a simple idea—to make parking less frustrating—has grown into a
              comprehensive parking management platform. Today, we help thousands of drivers find
              spaces easily and assist property owners in maximizing their parking assets.
            </p>
          </div>
          <div className="h-52 md:h-64 rounded-2xl shadow-lg overflow-hidden bg-slate-200">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXb42IbCBn30HENAhlIafVtG3pX0J-JPNHlQ&s"
              alt="City street parking scene"
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        {/* Our Mission */}
        <section className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <span className="text-xl">🎯</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Our Mission</h2>
            <p className="mt-3 max-w-2xl mx-auto text-sm md:text-base text-slate-600 leading-relaxed">
              To eliminate parking stress by connecting drivers with available spaces seamlessly,
              while providing parking owners with powerful management tools.
            </p>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="space-y-6">
          <h2 className="text-center text-xl md:text-2xl font-semibold text-slate-900">
            Why Choose Us?
          </h2>
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-slate-900">For Drivers</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  <span>Find and book parking spots instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  <span>Competitive, transparent pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  <span>Secure, contactless payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  <span>24/7 customer support</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Our Team */}
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Our Team</h2>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
            We&apos;re a passionate group of technologists, parking experts, and customer service
            professionals dedicated to making your parking experience seamless from start to finish.
          </p>
        </section>

        {/* Join Our Journey */}
        <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-10 md:px-10 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Join Our Journey</h2>
            <p className="mt-3 max-w-xl text-sm md:text-base text-indigo-100 leading-relaxed">
              Whether you&apos;re a driver looking for convenient parking or a property owner wanting
              to optimize your space, we&apos;re here to help. Let&apos;s make parking simple together.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full bg-white text-indigo-700 px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-indigo-50 transition"
            >
              Get Started
            </Link>
            <Link
              to="/contact-us"
              className="inline-flex items-center justify-center rounded-full border border-white/70 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AboutUs;

