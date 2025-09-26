'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      setIsAuthenticated(true);
    } else {
      window.location.href = '/login';
    }
  }, []);
  
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <TopBar />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}