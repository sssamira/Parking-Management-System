import React from 'react';
import { Link } from 'react-router-dom';
import ParkSmarterLogo from '../components/ParkSmarterLogo';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-3 mb-8 text-slate-100 hover:text-white transition">
          <ParkSmarterLogo size={48} />
          <span className="text-2xl font-bold">Park Smarter</span>
        </Link>
        <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>
        <p className="text-slate-300">
          This page will outline how ParkSmarter collects, uses, and protects user data.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

