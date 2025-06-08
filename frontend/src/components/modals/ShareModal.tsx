import React from 'react';

type ShareModalProps = {
    isOpen: boolean;
    onClose: () => void;
    url: string; // The URL to share
};

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url }) => {
    if (!isOpen) return null; // Don't render anything if the modal is not open

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url).then(() => {
            alert('لینک کپی شد: ' + url);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
                <h2 className="text-lg font-bold mb-4">اشتراک‌گذاری</h2>
                <p className="mb-4">لینک زیر را کپی کنید یا به اشتراک بگذارید:</p>
                <div className="flex items-center justify-between mb-4">
                    <input
                        type="text"
                        value={url}
                        readOnly
                        className="border rounded p-2 w-full"
                    />
                    <button onClick={copyToClipboard} className="ml-2 bg-blue-500 text-white rounded px-4 py-2">
                        کپی
                    </button>
                </div>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;