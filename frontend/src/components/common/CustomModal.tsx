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
        e.stopPropagation();
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={preventClose ? undefined : onClose}
            style={{ zIndex: 1000 }}
            shouldBlockScroll // جلوگیری از اسکرول پس‌زمینه
        >
            <ModalContent
                className={cn(
                    "fixed  left-0 right-0 bottom-0 mx-auto my-auto w-full h-full max-w-[100vw] max-h-[85vh] ", // مودال کاملاً فیکس و تمام‌صفحه
                    "flex flex-col overflow-hidden bg-white rounded-t-2xl" // ساختار فلکس و بدون گردی گوشه‌ها
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
                            <span>{title}</span>
                            <button onClick={onClose} className="text-gray-600">
                                <AiOutlineClose size={20} />
                            </button>
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
                                                        color="danger"
                                                        variant="light"
                                                        className="w-full"
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
                                                    color="primary"
                                                    className="w-full bg-[#D62B1A]"
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