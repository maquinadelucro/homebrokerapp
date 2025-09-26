'use client';

import React from 'react';
import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        style: {
          background: '#2A2E39',
          color: 'white',
          border: '1px solid #3A3E49',
        },
        success: {
          style: {
            backgroundColor: '#1E222D',
            border: '1px solid #16a34a',
          },
          icon: <span>✅</span>,
        },
        error: {
          style: {
            backgroundColor: '#1E222D',
            border: '1px solid #dc2626',
          },
          icon: <span>❌</span>,
        },
      }}
    />
  );
}