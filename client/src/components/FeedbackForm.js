import React, { useState } from 'react';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    category: 'Experience'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Feedback form submitted:', formData);
    // We'll add API call later
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Submit Feedback</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2">Rating (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={formData.rating}
            onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full p-2 border rounded"
          >
            <option value="Complaint">Complaint</option>
            <option value="Suggestion">Suggestion</option>
            <option value="Experience">Experience</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2">Comment</label>
          <textarea
            value={formData.comment}
            onChange={(e) => setFormData({...formData, comment: e.target.value})}
            className="w-full p-2 border rounded"
            rows="4"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;