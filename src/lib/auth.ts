'use client';

import { create } from 'zustand';
import { tradingApi } from './api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Balance {
  demo: {
    id: number;
    balance: number;
    currency: string;
  };
  real: {
    id: number;
    balance: number;
    currency: string;
  };
}

interface AuthState {
  user: User | null;
  balance: Balance | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getUser: () => Promise<void>;
  getBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  balance: null,
  isLoading: false,
  error: null,
  
  login: async (username, password) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao fazer login');
      }
      
      const data = await response.json();
      
      // Verificar se temos dados de usuário na resposta
      if (!data.user && !data.token) {
        set({
          error: 'Resposta de login inválida. Dados de usuário ausentes.',
          isLoading: false,
        });
        return false;
      }
      
      // Salvar token no localStorage se existir
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      
      set({
        user: data.user,
        isLoading: false,
      });
      
      // Após login bem-sucedido, obter o saldo
      try {
        await get().getBalance();
      } catch (balanceError) {
        // Silently fail
      }
      
      return true;
    } catch (error) {
      // Capturar mais detalhes do erro
      let errorMessage = 'Falha ao fazer login';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({
        error: errorMessage,
        isLoading: false,
      });
      
      throw error; // Re-lançar o erro para que o componente possa capturar detalhes
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      // Silently fail
    }
    
    localStorage.removeItem('auth_token');
    set({ user: null, balance: null, isLoading: false });
  },
  
  getUser: async () => {
    set({ isLoading: true });
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Token não encontrado');
      }
      
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao obter dados do usuário');
      }
      
      const data = await response.json();
      set({ user: data.user, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Falha ao obter dados do usuário',
        isLoading: false,
      });
    }
  },
  
  getBalance: async () => {
    try {
      const balance = await tradingApi.getBalance();
      set({ balance });
      return balance;
    } catch (error) {
      // Não definimos error no state para não sobrescrever possíveis erros de login
      throw error;
    }
  },
}));