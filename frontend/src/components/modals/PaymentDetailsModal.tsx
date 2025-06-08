import React from 'react';

type PaymentDetailsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    paymentDetails: {
        amount: number;
        method: string;
        transactionId: string;
        date: string;
    };
};

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ isOpen, onClose, paymentDetails }) => {
    if (!isOpen) return null; // Don't render anything if the modal is not open

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
                <h2 className="text-lg font-bold mb-4">جزئیات پرداخت</h2>
                <p className="mb-2"><strong>مقدار:</strong> {paymentDetails.amount} تومان</p>
                <p className="mb-2"><strong>روش پرداخت:</strong> {paymentDetails.method}</p>
                <p className="mb-2"><strong>شناسه تراکنش:</strong> {paymentDetails.transactionId}</p>
                <p className="mb-4"><strong>تاریخ:</strong> {paymentDetails.date}</p>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentDetailsModal;