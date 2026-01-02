import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const initialForm = {
  parkingLotName: '',
  startDate: '',
  endDate: '',
  offerPercentage: '',
  isActive: true,
  notes: '',
};

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AddOffer = () => {
  const [formData, setFormData] = useState(initialForm);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [parkingLots, setParkingLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const todayInputValue = useMemo(() => formatDateInputValue(new Date()), []);

  const getOfferTimingStatus = (offer) => {
    if (!offer?.isActive) {
      return {
        label: 'Inactive',
        badgeClass: 'bg-gray-200 text-gray-600',
      };
    }

    const now = new Date();
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-100 text-emerald-700',
      };
    }

    if (now < start) {
      return {
        label: 'Upcoming',
        badgeClass: 'bg-blue-100 text-blue-700',
      };
    }

    if (now > end) {
      return {
        label: 'Expired',
        badgeClass: 'bg-amber-100 text-amber-700',
      };
    }

    return {
      label: 'Active',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  };

  const handleDeleteOffer = async (offer) => {
    if (!offer?._id) {
      return;
    }

    const start = offer.startDate ? new Date(offer.startDate).toLocaleDateString() : '';
    const end = offer.endDate ? new Date(offer.endDate).toLocaleDateString() : '';
    const ok = window.confirm(
      `Delete this offer for "${offer.parkingLotName}" (${start} - ${end})? This cannot be undone.`
    );
    if (!ok) {
      return;
    }

    try {
      await api.delete(`/offers/${offer._id}`);
      setStatus({ type: 'success', message: 'Offer deleted successfully.' });
      fetchOffers();
    } catch (error) {
      console.error('Failed to delete offer:', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete offer.',
      });
    }
  };

  const fetchOffers = async () => {
    setLoadingOffers(true);
    try {
      const response = await api.get('/offers');
      setOffers(response.data?.offers || []);
    } catch (error) {
      console.error('Failed to load offers:', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to load existing offers.',
      });
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    const fetchParkingLots = async () => {
      setLoadingLots(true);
      try {
        const response = await api.get('/parking/lots');
        setParkingLots(response.data?.lots || []);
      } catch (error) {
        console.error('Failed to load parking lots:', error);
        setStatus({
          type: 'error',
          message: error.response?.data?.message || 'Failed to load parking lots.',
        });
      } finally {
        setLoadingLots(false);
      }
    };

    fetchParkingLots();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => {
      const nextValue = type === 'checkbox' ? checked : value;
      const updated = { ...prev, [name]: nextValue };

      if (name === 'startDate' && prev.endDate && nextValue && prev.endDate < nextValue) {
        updated.endDate = nextValue;
      }

      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (!formData.parkingLotName.trim()) {
      setStatus({ type: 'error', message: 'Parking lot name is required.' });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setStatus({ type: 'error', message: 'Start date and end date are required.' });
      return;
    }

    const startDateObj = new Date(`${formData.startDate}T00:00:00`);
    const endDateObj = new Date(`${formData.endDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      setStatus({ type: 'error', message: 'Please select valid dates.' });
      return;
    }

    if (startDateObj < today) {
      setStatus({ type: 'error', message: 'Start date cannot be in the past.' });
      return;
    }

    if (endDateObj < startDateObj) {
      setStatus({ type: 'error', message: 'End date cannot be before start date.' });
      return;
    }

    if (formData.offerPercentage === '') {
      setStatus({ type: 'error', message: 'Offer percentage is required.' });
      return;
    }

    const numericPercentage = Number(formData.offerPercentage);
    if (!Number.isFinite(numericPercentage) || numericPercentage < 0 || numericPercentage > 100) {
      setStatus({ type: 'error', message: 'Offer percentage must be between 0 and 100.' });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        parkingLotName: formData.parkingLotName.trim(),
        startDate: `${formData.startDate}T00:00:00`,
        endDate: `${formData.endDate}T23:59:59.999`,
        offerPercentage: numericPercentage,
        isActive: formData.isActive,
        notes: formData.notes.trim() || undefined,
      };

      await api.post('/offers', payload);
      setStatus({ type: 'success', message: 'Offer created successfully.' });
      setFormData(initialForm);
      fetchOffers();
    } catch (error) {
      console.error('Failed to create offer:', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create offer.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [offers]);

  const uniqueLots = useMemo(() => {
    const lotMap = new Map();
    parkingLots.forEach((lot) => {
      if (!lot?.parkingLotName) {
        return;
      }
      if (!lotMap.has(lot.parkingLotName)) {
        lotMap.set(lot.parkingLotName, lot);
        return;
      }

      const existing = lotMap.get(lot.parkingLotName);
      const hasAvg = typeof existing?.avgPricePerHour === 'number';
      const hasNewAvg = typeof lot.avgPricePerHour === 'number';
      if (!hasAvg && hasNewAvg) {
        lotMap.set(lot.parkingLotName, lot);
      }
    });
    return Array.from(lotMap.values());
  }, [parkingLots]);

  const selectedLot = useMemo(() => {
    if (!formData.parkingLotName) {
      return null;
    }
    return uniqueLots.find(
      (lot) => lot.parkingLotName === formData.parkingLotName
    ) || null;
  }, [formData.parkingLotName, uniqueLots]);

  const baseRate = selectedLot?.avgPricePerHour;

  const computedPreviewPrice = useMemo(() => {
    if (baseRate === null || baseRate === undefined) {
      return null;
    }
    const pct = Number(formData.offerPercentage);
    if (!Number.isFinite(pct)) {
      return null;
    }
    return Number((baseRate * (1 - pct / 100)).toFixed(2));
  }, [baseRate, formData.offerPercentage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-wide text-indigo-500 font-semibold">Admin</p>
            <h1 className="text-3xl font-bold text-indigo-900">Manage Parking Offers</h1>
            <p className="text-gray-600">Create targeted promotions for any parking lot in a few clicks.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 border border-indigo-200 rounded-full px-4 py-2 bg-white hover:bg-indigo-50 transition"
          >
            <span className="text-lg">←</span>
            Back to dashboard
          </Link>
        </div>

        {status.message && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 text-sm font-semibold ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-[0_25px_80px_-40px_rgba(79,70,229,0.6)] border border-indigo-50 p-6 space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-indigo-900 mb-2">Parking Lot</label>
              <select
                name="parkingLotName"
                value={formData.parkingLotName}
                onChange={handleChange}
                disabled={loadingLots || parkingLots.length === 0}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                <option value="">{loadingLots ? 'Loading lots...' : 'Select a parking lot'}</option>
                {uniqueLots.map((lot) => (
                  <option key={lot.parkingLotName} value={lot.parkingLotName}>
                    {lot.parkingLotName}
                    {lot.location ? ` (${lot.location})` : ''}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-gray-600">
                {loadingLots && 'Fetching parking lots...'}
                {!loadingLots && !selectedLot && 'Choose a parking lot to see its base rate.'}
                {!loadingLots && selectedLot && baseRate !== null && baseRate !== undefined && (
                  <span>
                    Base rate: ৳{baseRate.toFixed(2)} / hr | Spots: {selectedLot.totalSpots ?? 'N/A'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-indigo-900 mb-2">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={todayInputValue}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-indigo-900 mb-2">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || todayInputValue}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-indigo-900 mb-2">Percentage Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="offerPercentage"
                value={formData.offerPercentage}
                onChange={handleChange}
                placeholder="e.g., 15"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Enter how much to discount this lot's base hourly rate.</p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
              {computedPreviewPrice !== null && baseRate !== null && baseRate !== undefined ? (
                <p>
                  Offer rate preview: ৳{computedPreviewPrice.toFixed(2)} / hr (original ৳{baseRate.toFixed(2)} / hr)
                </p>
              ) : (
                <p>Select a parking lot and enter a percentage to preview the discounted rate.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-indigo-900 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Add internal notes for other admins"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>

            <label className="flex items-center space-x-3 text-sm text-gray-700">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600"
              />
              <span>Offer is active immediately</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white font-semibold py-3 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Create Offer'}
            </button>
          </form>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.35)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Existing Offers</h2>
              <button
                onClick={fetchOffers}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                type="button"
              >
                Refresh
              </button>
            </div>

            {loadingOffers ? (
              <p className="text-sm text-gray-500">Loading offers...</p>
            ) : sortedOffers.length === 0 ? (
              <p className="text-sm text-gray-500">No offers have been created yet.</p>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                {sortedOffers.map((offer) => (
                  <div
                    key={offer._id}
                    className="border border-gray-100 rounded-2xl p-4 bg-slate-50"
                  >
                    {(() => {
                      const timingStatus = getOfferTimingStatus(offer);
                      return (
                        <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-indigo-500 font-semibold">
                          {offer.parkingLotName}
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          ৳{offer.priceAfterOffer?.toFixed(2) ?? '—'} / hr
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${timingStatus.badgeClass}`}
                        >
                          {timingStatus.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOffer(offer)}
                          className="text-xs font-semibold px-3 py-1 rounded-full border border-red-200 text-red-700 bg-white hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      <p>
                        {new Date(offer.startDate).toLocaleDateString()} - {new Date(offer.endDate).toLocaleDateString()}
                      </p>
                      {typeof offer.offerPercentage === 'number' && (
                        <p>Discount: {offer.offerPercentage}%</p>
                      )}
                      {offer.notes && <p className="text-gray-600">Note: {offer.notes}</p>}
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AddOffer;
