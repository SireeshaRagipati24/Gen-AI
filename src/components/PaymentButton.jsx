import React from 'react';
import axios from 'axios';

const PaymentButton = ({ amount }) => {

  const handlePayment = async () => {
    try {
      // 1. Create order in backend
      const orderRes = await axios.post('http://localhost:5000/create-order', { amount });
      const { id: order_id, amount: orderAmount, currency } = orderRes.data;

      // 2. Open Razorpay checkout
      const options = {
        key: 'YOUR_RAZORPAY_KEY_ID', // Replace with your Razorpay key
        amount: orderAmount,
        currency: currency,
        name: 'Demo App',
        description: 'Test Payment',
        order_id: order_id,
        handler: async function (response) {
          console.log(response);

          // 3. Verify payment in backend
          const verifyRes = await axios.post('http://localhost:5000/verify-payment', response);
          alert(verifyRes.data.status);
        },
        theme: { color: '#3399cc' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error(error);
      alert('Payment failed, please try again.');
    }
  };

  return (
    <button onClick={handlePayment} className="px-4 py-2 bg-blue-600 text-white rounded">
      Pay ₹{amount}
    </button>
  );
};

export default PaymentButton;
