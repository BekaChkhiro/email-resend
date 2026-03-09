"use client";

import { useState, useCallback, type ReactNode } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import { createElement } from "react";

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
  isLoading: boolean;
  resolve: ((value: boolean) => void) | null;
}

const initialState: DialogState = {
  isOpen: false,
  isLoading: false,
  title: "",
  message: "",
  resolve: null,
};

export function useConfirmDialog() {
  const [state, setState] = useState<DialogState>(initialState);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        isLoading: false,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(initialState);
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(initialState);
  }, [state.resolve]);

  const Dialog = useCallback(() => {
    return createElement(ConfirmDialog, {
      isOpen: state.isOpen,
      title: state.title,
      message: state.message,
      confirmLabel: state.confirmLabel,
      cancelLabel: state.cancelLabel,
      variant: state.variant,
      isLoading: state.isLoading,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    });
  }, [
    state.isOpen,
    state.title,
    state.message,
    state.confirmLabel,
    state.cancelLabel,
    state.variant,
    state.isLoading,
    handleConfirm,
    handleCancel,
  ]);

  return { confirm, Dialog };
}
