import React, { useState } from 'react';

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: string[]; // لیست محصولات خریداری شده
}

const CancellationModal: React.FC<CancellationModalProps> = ({ isOpen, onClose, products }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // اینجا می‌توانید منطق ارسال علت لغو را اضافه کنید
        console.log('Reason for cancellation:', reason);
        onClose(); // بستن مودال بعد از ارسال
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-4 rounded-lg">
                <h2 className="text-lg font-bold">لغو دریافت مرسوله</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm">علت لغو:</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="border rounded w-full p-2"
                            required
                        />
                    </div>
                    <div className="mt-4">
                        <h3 className="font-semibold">محصولات خریداری شده:</h3>
                        <ul>
                            {products.map((product, index) => (
                                <li key={index} className="text-sm">{product}</li>
                            ))}
                        </ul>
                    </div>
                    <button type="submit" className="mt-4 bg-red-600 text-white p-2 rounded">ارسال</button>
                    <button type="button" onClick={onClose} className="mt-2 text-gray-600">بستن</button>
                </form>
            </div>
        </div>
    );
};

export default CancellationModal;