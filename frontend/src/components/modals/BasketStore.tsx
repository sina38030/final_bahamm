import React from 'react';
import CustomModal from '../common/CustomModal';
import { BiTrash } from 'react-icons/bi';

interface BasketModalProps {
    isOpen: boolean; // Accept isOpen prop
    onClose: () => void; // Accept onClose prop
    showTrashIcon?: boolean; // New prop to control the visibility of the trash icon
}

function BasketStore({ isOpen, onClose, showTrashIcon = true }: BasketModalProps) {
    return (
        <div>
            <CustomModal
                isOpen={isOpen} // Use the isOpen prop
                onClose={onClose} // Use the onClose prop
                title="۴ کالا در سبد "
                cancelLabel="انصراف"
                submitLabel="متوجه شدم"
            >
                <div className="flex items-center gap-4 bg-white p-3">
                    <div>
                        <img
                            src="https://avaneed.com/wp-content/uploads/2024/03/nothing-phone-1-black.webp"
                            alt="Product"
                            className="w-20 h-20 mb-2"
                        />
                        {showTrashIcon && <BiTrash size={20} className="mx-auto" />} {/* Conditionally render the icon */}
                    </div>
                    <div className="text-xs flex flex-col gap-9">
                        <div className="flex items-center justify-between">
                            <p>اسم محصول</p>
                        </div>
                        <div className="flex items-center gap-7">
                            <p className="line-through">  ۱۳۳ هزار تومان</p>
                            <p>  ۱۳۳ هزار تومان</p>
                        </div>
                    </div>
                </div>
            </CustomModal>
        </div>
    );
}

export default BasketStore;