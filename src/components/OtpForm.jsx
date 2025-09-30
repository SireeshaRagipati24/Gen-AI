import { useState } from 'react';
import axios from 'axios';

const OtpForm = ({ filename, caption }) => {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!otp) {
      setMessage("OTP enter cheyyandi");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/verify-otp', {
        otp,
        caption,
        filename
      });

      if (res.data.success) {
        setMessage("✅ Instagram ki post ayyindi!");
        window.open(res.data.url, '_blank');
      } else {
        setMessage("❌ OTP tappu or post fail ayyindi");
      }
    } catch (err) {
      setMessage("❌ Error: " + (err.response?.data?.error || "Server issue"));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        className="border px-4 py-2 w-full rounded"
      />
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Posting...' : 'Verify & Post'}
      </button>
      <p>{message}</p>
    </div>
  );
};

export default OtpForm;
