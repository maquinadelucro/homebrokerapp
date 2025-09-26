'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { tradingApi } from '@/lib/api';
import Image from 'next/image';

type FormData = {
  username: string;
  password: string;
};

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<React.ReactNode | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        const defaultError = (
          <>
            Falha na autenticação, informe as mesmas credenciais utilizadas para acessar sua conta na corretora HomeBroker{' '}
            <a 
              href="https://www.homebroker.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              https://www.homebroker.com/
            </a>
            .
          </>
        );
        
        // Se for erro de autenticação (401 ou mensagem genérica), usar nossa mensagem personalizada
        if (response.status === 401 || responseData.error === 'Falha na autenticação') {
          setLoginError(defaultError);
        } else {
          // Para outros tipos de erro, usar a mensagem original da API
          setLoginError(responseData.error || defaultError);
        }
        setIsLoading(false);
        return;
      }
      
      if (responseData.session_token) {
        // Usar session_token para autenticação nas nossas APIs internas
        localStorage.setItem('auth_token', responseData.session_token);
        // Salvar também os tokens externos para uso posterior se necessário
        if (responseData.access_token) {
          localStorage.setItem('homebroker_access_token', responseData.access_token);
        }
        if (responseData.refresh_token) {
          localStorage.setItem('refresh_token', responseData.refresh_token);
        }
        if (responseData.cognito_id) {
          localStorage.setItem('user_id', responseData.cognito_id);
        }
        
        // Buscar saldo assim que o login for bem-sucedido
        try {
          console.log('💰 Login bem-sucedido, buscando saldo inicial...');
          await tradingApi.getBalance();
          console.log('✅ Saldo inicial carregado com sucesso');
        } catch (balanceError) {
          console.log('⚠️ Falha ao carregar saldo inicial:', balanceError);
          // Não bloquear o login se falhar ao buscar saldo
        }
        
        window.location.href = '/dashboard';
      } else {
        setLoginError('Resposta não contém token de sessão (session_token)');
        setIsLoading(false);
      }
      
    } catch (error: any) {
      setLoginError(error.message || 'Erro desconhecido');
      setIsLoading(false);
    }
  };

  const handleLogoClick = () => {
    window.location.href = '/';
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Card Container */}
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 rounded-3xl shadow-2xl shadow-black/50 p-8 lg:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={handleLogoClick}
            className="group cursor-pointer transition-all duration-300 hover:scale-105 focus:outline-none focus:scale-105 inline-block"
          >
            <Image
              src="/assets/sheikbot-logo.png"
              alt="SHEIKBOT"
              width={200}
              height={80}
              className="object-contain mx-auto"
              style={{ height: "auto" }}
            />
          </button>
          <div className="mt-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Bem-vindo de volta!
            </h1>
            <p className="text-gray-400 text-lg">
              Acesse sua plataforma de trading com IA
            </p>
            <div className="mt-4 inline-flex items-center bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-3"></div>
              <span className="text-sm text-green-400 font-medium">Sistema seguro e criptografado</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {loginError && (
            <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm backdrop-blur-sm">
              <div className="flex items-start">
                <div className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0">
                  ⚠️
                </div>
                <p className="font-medium leading-relaxed">{loginError}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-200">
                Usuário da Homebroker
              </label>
              <div className="relative group">
                <input
                  id="username"
                  type="text"
                  {...register('username', { required: 'Usuário é obrigatório' })}
                  className="w-full p-4 bg-zinc-800/50 border border-zinc-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Digite seu usuário"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/0 via-green-500/0 to-green-500/0 opacity-0 transition-opacity duration-300 pointer-events-none group-focus-within:opacity-20"></div>
              </div>
              {errors.username && (
                <p className="text-sm text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-200">
                Senha
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Senha é obrigatória' })}
                  className="w-full p-4 pr-12 bg-zinc-800/50 border border-zinc-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-400 focus:outline-none focus:text-green-400 transition-colors duration-200"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/0 via-green-500/0 to-green-500/0 opacity-0 transition-opacity duration-300 pointer-events-none group-focus-within:opacity-20"></div>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:scale-[1.02] shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="relative z-10 flex items-center justify-center">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-3"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-3" />
                    Acessar Plataforma
                  </>
                )}
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-start">
            <div className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0">
              🔒
            </div>
            <div>
              <p className="text-sm text-gray-200 font-medium mb-1">
                Ambiente 100% Seguro
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Suas credenciais são criptografadas com AES-256 e nunca são armazenadas em nossos servidores.
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center space-y-3">
          <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/30">
            <p className="text-sm text-gray-300 leading-relaxed">
              💡 <strong className="text-white">Importante:</strong> Use as mesmas credenciais da sua conta{' '}
              <a 
                href="https://www.homebroker.com/ref/joj9s57w/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 underline font-medium transition-colors"
              >
                Homebroker
              </a>
            </p>
            <div className="mt-3 flex items-center justify-center text-xs text-gray-400">
              <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full mr-2">⚠️</span>
              Apenas contas reais com saldo disponível
            </div>
          </div>
          
          {/* Botão de Cadastro */}
          <div className="mt-4">
            <a
              href="https://www.homebroker.com/ref/joj9s57w/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:scale-[1.02] shadow-lg shadow-blue-500/25"
            >
              <span className="mr-2">🚀</span>
              Cadastre-se na Homebroker
            </a>
            <p className="text-xs text-gray-400 mt-2">
              Ainda não tem conta? Crie uma agora mesmo!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}