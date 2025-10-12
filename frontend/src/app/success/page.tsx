"use client";

import React, { useState } from "react";

const PaymentStatus = () => {
  const [isSuccess, setIsSuccess] = useState(true);

  const toggleStatus = () => {
    setIsSuccess(!isSuccess);
  };

  return (
    <div className="payment-container">
      {/* Icon */}
      <div className="payment-icon-container">
        <div className="payment-icon-wrapper">
          <img
            src={isSuccess ? '/images/Group 852215023.png' : '/images/Group 852245415023.png'}
            alt={isSuccess ? "Payment Successful" : "Payment Failed"} 
            className="payment-icon"
          />
        </div>
        <h2 className={`payment-title ${isSuccess ? "success" : "error"}`}>
          {isSuccess ? "پرداخت موفق" : "پرداخت ناموفق"}
        </h2>
        <p className="payment-description">
          {isSuccess ? "عملیات با موفقیت انجام شد" : "عملیات با خطا مواجه شد"}
        </p>
      </div>

      {/* Payment Details */}
      <div className="payment-details">
        <div className="payment-detail-item">
          <span className="payment-detail-label">مبلغ</span>
          <span className="payment-detail-value">۱۷۵,۰۰۰,۰۰۰ ریال</span>
        </div>
        <div className="payment-detail-item">
          <span className="payment-detail-label">شماره تراکنش</span>
          <span className="payment-detail-value">
            {isSuccess ? "۱۲۳۴۵۶۷" : "-"}
          </span>
        </div>
        <div className="payment-detail-item">
          <span className="payment-detail-label">کد رهگیری</span>
          <span className="payment-detail-value">
            {isSuccess ? "۱۲۳۴۵۶۷" : "-"}
          </span>
        </div>
        <div className="payment-detail-item">
          <span className="payment-detail-label">شیوه پرداخت</span>
          <span className="payment-detail-value">
            {isSuccess ? "درگاه بانک سامان" : "-"}
          </span>
        </div>
      </div>

      {/* Button */}
      <div className="payment-button-container">
        <button
          className="payment-button"
          onClick={() => {
            console.log("Returning to main page...");
          }}
        >
          بازگشت به باهم
        </button>
      </div>

      <style jsx>{`
        .payment-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: white;
          padding: 24px;
          max-width: 375px;
          margin: 0 auto;
        }

        .payment-icon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }

        .payment-icon-wrapper {
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 40px;
        }

        .payment-icon {
          width: 90px;
          height: 90px;
        }

        .payment-title {
          font-size: 18px;
          font-weight: normal;
          margin-bottom: 16px;
        }

        .payment-title.success {
          color: #22c55e;
        }

        .payment-title.error {
          color: #CF1717;
        }

        .payment-description {
          color: #595959;
          font-size: 16px;
          font-weight: normal;
        }

        .payment-details {
          width: 100%;
          max-width: 28rem;
        }

        .payment-detail-item {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }

        .payment-detail-label {
          color: #87909C;
          font-size: 14px;
          font-weight: normal;
        }

        .payment-detail-value {
          color: #1a1a1a;
          font-size: 16px;
          font-weight: normal;
        }

        .payment-button-container {
          min-height: 80px;
          background-color: white;
          border-radius: 24px;
          width: 100%;
          position: fixed;
          bottom: 0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .payment-button {
          background-color: #1A1A1A;
          color: white;
          width: 100%;
          min-height: 48px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .payment-button:hover {
          background-color: #333;
        }

        @media (min-width: 1024px) {
          .payment-title {
            font-size: 24px;
          }

          .payment-detail-label {
            font-size: 20px;
          }

          .payment-detail-value {
            font-size: 24px;
          }

          .payment-button-container {
            position: relative;
            box-shadow: none;
            background-color: transparent;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentStatus;
