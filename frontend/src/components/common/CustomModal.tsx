"use client";

import { cn } from "@/utils/cn";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
import React, { ReactNode } from "react";
import { AiOutlineClose } from "react-icons/ai";

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    submitLabel?: string;
    cancelLabel?: string;
    onSubmit?: () => void;
    size?: "sm" | "md" | "lg" | "xl" | "full";
    hideFooter?: boolean;
    loading?: boolean;
    preventClose?: boolean;
    customFooter?: ReactNode;
    showCancelButton?: boolean;
    headerClass?: string;
    fullScreen?: boolean;
    isSubmitDisabled?: boolean;
}

export default function CustomModal({
    isOpen,
    onClose,
    title,
    children,
    submitLabel = "ثبت",
    cancelLabel = "انصراف",
    onSubmit,
    size = "md",
    hideFooter = false,
    loading = false,
    preventClose = false,
    customFooter,
    showCancelButton = true,
    headerClass = "",
    fullScreen = false,
    isSubmitDisabled = false,
}: CustomModalProps) {
    const handleContentClick = (e: React.MouseEvent) => {
        // Only stop propagation if clicking directly on modal content, not on interactive elements
        const target = e.target as HTMLElement;
        if (target.tagName !== 'BUTTON' && target.tagName !== 'A' && !target.closest('button') && !target.closest('a')) {
            e.stopPropagation();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={preventClose ? undefined : onClose}
            style={{ zIndex: 1000 }}
            shouldBlockScroll // جلوگیری از اسکرول پس‌زمینه
            classNames={{
                wrapper: "justify-end sm:justify-center",
                base: "!m-0 sm:!m-4 !w-full sm:!w-auto"
            }}
        >
            <ModalContent
                className={cn(
                    "fixed left-0 right-0 bottom-0 mx-auto w-full !m-0 sm:!m-4 sm:relative sm:bottom-auto sm:top-auto",
                    // If size is full, height is full, otherwise auto height based on content
                    size === 'full' ? "h-full max-h-[100vh]" : "h-auto max-h-[85vh]",
                     "flex flex-col overflow-hidden bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-lg"
                )}
                onClick={handleContentClick}
            >
                {(closeModal) => (
                    <>
                        <ModalHeader
                            className={cn(
                                "flex justify-between items-center bg-white shadow-sm w-full sticky top-0 z-50 p-4 border-b",
                                headerClass
                            )}
                        >
                            <button onClick={onClose} className="text-gray-600">
                                <AiOutlineClose size={20} />
                            </button>
                            <span>{title}</span>
                        </ModalHeader>
                        <ModalBody
                            className={cn(
                                "overflow-y-auto flex-1 p-4" // اسکرول فقط توی بدنه
                            )}
                        >
                            {children}
                        </ModalBody>
                        {!hideFooter &&
                            (customFooter || showCancelButton || onSubmit) && (
                                <ModalFooter className="flex gap-2 shrink-0 sticky bottom-0 bg-white p-4 border-t">
                                    {customFooter ? (
                                        customFooter
                                    ) : (
                                        <>
                                            {showCancelButton &&
                                                cancelLabel && (
                                                    <Button
                                                        className="w-full text-[#E31C5F] bg-[#E31C5F]/10 hover:bg-[#E31C5F]/20 font-medium"
                                                        variant="flat"
                                                        onPress={closeModal}
                                                        disabled={
                                                            loading ||
                                                            preventClose
                                                        }
                                                    >
                                                        {cancelLabel}
                                                    </Button>
                                                )}
                                            {onSubmit && submitLabel && (
                                                <Button
                                                    className="w-full bg-[#E31C5F] text-white font-medium shadow-md shadow-[#E31C5F]/20"
                                                    onPress={onSubmit}
                                                    disabled={loading || isSubmitDisabled}
                                                >
                                                    {loading
                                                        ? "در حال پردازش..."
                                                        : submitLabel}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </ModalFooter>
                            )}
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}