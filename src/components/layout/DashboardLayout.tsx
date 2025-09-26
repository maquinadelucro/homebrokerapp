'use client';

import React, { ReactNode } from 'react';
import TopBar from './TopBar';
import { useAuthStore } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  
  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('auth_token');
    
    if (!token && !isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user && !isLoading) {
    return null; // Vai redirecionar para login no useEffect
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