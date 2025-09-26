'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div 
        className={cn("bg-[#1E222D] border border-[#2A2E39] rounded-md shadow-lg", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-2 border-b border-[#2A2E39]">
            <h3 className="text-white text-center">{title}</h3>
          </div>
        )}
        <div className="p-2">
          {children}
        </div>
      </div>
      <div 
        className="absolute inset-0 z-[-1]"
        onClick={onClose}
      />
    </div>,
    document.body
  );
};

export default Modal;