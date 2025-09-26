"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
}

export default function ModalPortal({ children, isOpen }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Se não estiver montado ou a modal estiver fechada, não renderiza nada
  if (!mounted || !isOpen) return null;

  // Renderiza o conteúdo da modal diretamente no final do body
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80">
      {children}
    </div>,
    document.body
  );
}