"use client";

import React, { useReducer, useEffect, useRef } from 'react';
import CustomModal from '../common/CustomModal';
import { useAuth, ProfileUpdate } from '@/contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

export interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: {
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone_number: string;
    };
}

// Define state type
type State = {
    formData: {
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
    };
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;
};

// Define action types
type Action = 
    | { type: 'SET_FORM_DATA', payload: State['formData'] }
    | { type: 'SET_LOADING', payload: boolean }
    | { type: 'SET_ERROR', payload: string | null }
    | { type: 'SET_SUCCESS', payload: string | null }
    | { type: 'UPDATE_FIELD', field: string, value: string };

// Reducer function
const reducer = (state: State, action: Action): State => {
    console.log(`[${new Date().toISOString()}] Reducer action:`, action.type, action);
    
    switch (action.type) {
        case 'SET_FORM_DATA':
            return { ...state, formData: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_SUCCESS':
            return { ...state, successMessage: action.payload };
        case 'UPDATE_FIELD':
            return { 
                ...state, 
                formData: { 
                    ...state.formData, 
                    [action.field]: action.value 
                } 
            };
        default:
            return state;
    }
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
    isOpen, 
    onClose,
    initialData = { first_name: null, last_name: null, email: '', phone_number: '' }
}) => {
    // Initial state
    const initialState: State = {
        formData: {
            first_name: '',
            last_name: '',
            email: '',
            phone_number: ''
        },
        isLoading: false,
        error: null,
        successMessage: null
    };
    
    // Use reducer for more predictable state updates
    const [state, dispatch] = useReducer(reducer, initialState);
    const isMounted = useRef(true);
    const isSubmitting = useRef(false); // Track submission state separately
    
    const { updateUserProfile, user } = useAuth();

    // Track component mounting status
    useEffect(() => {
        isMounted.current = true;
        console.log(`[${new Date().toISOString()}] Component mounted`);
        
        return () => {
            isMounted.current = false;
            console.log(`[${new Date().toISOString()}] Component unmounted`);
        };
    }, []);

    // When the modal opens or user data changes, update the form
    useEffect(() => {
        if (isOpen) {
            const newFormData = {
                first_name: initialData.first_name || user?.first_name || '',
                last_name: initialData.last_name || user?.last_name || '',
                email: initialData.email || user?.email || '',
                phone_number: initialData.phone_number || user?.phone_number || ''
            };
            
            dispatch({ type: 'SET_FORM_DATA', payload: newFormData });
            dispatch({ type: 'SET_ERROR', payload: null });
            dispatch({ type: 'SET_SUCCESS', payload: null });
            
            // Reset submission state
            isSubmitting.current = false;
        }
    }, [isOpen, initialData, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        dispatch({ 
            type: 'UPDATE_FIELD', 
            field: name, 
            value 
        });
    };

    const handleSubmit = async () => {
        console.log(`[${new Date().toISOString()}] Submit button clicked, isSubmitting:`, isSubmitting.current);
        
        // Prevent submitting if already submitting
        if (isSubmitting.current) {
            console.log(`[${new Date().toISOString()}] Submit prevented: already submitting`);
            return;
        }
        
        // Validate form
        if (!state.formData.first_name?.trim() && !state.formData.last_name?.trim()) {
            console.log(`[${new Date().toISOString()}] Validation failed: name or last name required`);
            dispatch({ type: 'SET_ERROR', payload: 'نام یا نام خانوادگی الزامی است' });
            return;
        }

        // Set submitting flag FIRST - before any other operations
        isSubmitting.current = true;
        console.log(`[${new Date().toISOString()}] Set isSubmitting to true`);
        
        try {
            // Set loading state for UI
            console.log(`[${new Date().toISOString()}] Setting loading state to true`);
            dispatch({ type: 'SET_LOADING', payload: true });
            dispatch({ type: 'SET_ERROR', payload: null });
            
            // Create a profile update object
            const profileData: ProfileUpdate = {
                first_name: state.formData.first_name || null,
                last_name: state.formData.last_name || null,
                email: state.formData.email || null
            };
            
            console.log(`[${new Date().toISOString()}] Sending profile update request:`, profileData);
            
            const success = await updateUserProfile(profileData);
            console.log(`[${new Date().toISOString()}] Received API response, success:`, success, 'isSubmitting:', isSubmitting.current);
            
            // Check if component is still mounted
            if (!isMounted.current) {
                console.log(`[${new Date().toISOString()}] Component unmounted, skipping state updates`);
                return;
            }
            
            if (success) {
                dispatch({ type: 'SET_SUCCESS', payload: 'اطلاعات شما با موفقیت به‌روزرسانی شد' });
                console.log(`[${new Date().toISOString()}] Success message set, scheduling modal close`);
                
                setTimeout(() => {
                    if (isMounted.current) {
                        console.log(`[${new Date().toISOString()}] Closing modal after success`);
                        onClose();
                    }
                }, 100);
            } else {
                console.log(`[${new Date().toISOString()}] Setting error message: API call failed`);
                dispatch({ type: 'SET_ERROR', payload: 'خطا در به‌روزرسانی پروفایل. لطفا دوباره تلاش کنید.' });
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error updating profile:`, error);
            if (isMounted.current) {
                dispatch({ type: 'SET_ERROR', payload: 'خطایی رخ داد. لطفا دوباره تلاش کنید.' });
            }
        } finally {
            // Reset loading and submission state
            console.log(`[${new Date().toISOString()}] Resetting states, component mounted:`, isMounted.current);
            
            if (isMounted.current) {
                dispatch({ type: 'SET_LOADING', payload: false });
                // Always reset isSubmitting AFTER state updates
                setTimeout(() => {
                    isSubmitting.current = false;
                    console.log(`[${new Date().toISOString()}] Reset isSubmitting to false`);
                }, 0);
            } else {
                isSubmitting.current = false;
            }
        }
    };

    // Custom footer with native buttons using isSubmitting directly
    const customFooter = (
        <div className="flex gap-2 w-full">
            <button 
                onClick={() => !isSubmitting.current && onClose()}
                disabled={isSubmitting.current}
                className={`w-full py-2 px-4 border border-red-300 text-red-700 rounded-md transition-colors
                            ${isSubmitting.current ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
                type="button"
            >
                انصراف
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting.current}
                className={`w-full py-2 px-4 bg-[#D62B1A] text-white rounded-md flex items-center justify-center gap-2
                            ${isSubmitting.current ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#C01A09]'}`}
                type="button"
            >
                {isSubmitting.current && <FaSpinner className="animate-spin" />}
                {isSubmitting.current ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
        </div>
    );

    return (
        <CustomModal
            isOpen={isOpen}
            onClose={() => {
                if (!isSubmitting.current) onClose();
            }}
            title="ویرایش اطلاعات کاربری"
            customFooter={customFooter}
            preventClose={isSubmitting.current}
        >
            <div className="space-y-4">
                {state.error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                        <span className="block sm:inline">{state.error}</span>
                    </div>
                )}
                
                {state.successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">
                        <span className="block sm:inline">{state.successMessage}</span>
                    </div>
                )}
                
                <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                        نام
                    </label>
                    <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={state.formData.first_name}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isSubmitting.current}
                    />
                </div>
                
                <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                        نام خانوادگی
                    </label>
                    <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={state.formData.last_name}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isSubmitting.current}
                    />
                </div>
                
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        ایمیل
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={state.formData.email}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isSubmitting.current}
                    />
                </div>
                
                <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                        شماره موبایل
                    </label>
                    <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={state.formData.phone_number}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                        disabled={true} // Phone number cannot be changed through this form
                        readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        شماره موبایل قابل تغییر نیست
                    </p>
                </div>
            </div>
        </CustomModal>
    );
};

export default EditProfileModal; 