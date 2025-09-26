'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CandlestickChart from '@/components/trading/CandlestickChart';
import TradingControls from '@/components/trading/TradingControls';
import TradeResults from '@/components/trading/TradeResults';
import TopBar from '@/components/layout/TopBar';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Dashboard() {
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticação
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    // Limpar dados do localStorage e sessionStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    sessionStorage.removeItem('auth_token');
    
    // Usar router do Next.js para redirecionamento seguro
    router.push('/login');
  };
  
  return (
    <div className={`min-h-screen flex flex-col relative ${isMobile ? 'overflow-auto' : 'h-screen overflow-hidden'}`}>
      {/* Background tecnológico */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-blue-900/30"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-green-900/10 via-transparent to-cyan-900/10"></div>
      
      {/* Grid pattern animado */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px'
      }}></div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-cyan-400 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-[25%] right-[20%] w-0.5 h-0.5 bg-green-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute top-[60%] left-[10%] w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute top-[40%] right-[30%] w-0.5 h-0.5 bg-purple-400 rounded-full animate-ping opacity-30"></div>
        <div className="absolute bottom-[30%] left-[70%] w-1 h-1 bg-emerald-400 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute top-[80%] left-[40%] w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping opacity-35"></div>
        <div className="absolute top-[15%] left-[80%] w-1 h-1 bg-green-300 rounded-full animate-pulse opacity-45"></div>
        <div className="absolute bottom-[20%] right-[15%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-50"></div>
      </div>
      
      {/* Gradiente radial central */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-cyan-900/5 to-transparent"></div>
      
      {/* Conteúdo */}
      <div className={`relative z-10 min-h-screen flex flex-col ${isMobile ? '' : 'h-screen'}`}>
        <TopBar />
        
        {/* Conteúdo principal */}
        <div className={`flex-1 flex flex-col lg:flex-row gap-1 ${isMobile ? 'pb-4' : 'overflow-hidden'}`}>
          
          {/* Área principal do gráfico */}
          <div className={`lg:flex-1 flex flex-col ${isMobile ? 'h-[45vh] min-h-[300px] flex-shrink-0' : 'h-auto'}`}>
            <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-2xl m-2 flex-1 overflow-hidden shadow-2xl shadow-black/20">
              <CandlestickChart className="w-full h-full flex-1" />
            </div>
          </div>
          
          {/* Painel lateral de controles */}
          <div className={`w-full lg:w-[420px] flex flex-col ${isMobile ? 'flex-shrink-0' : 'flex-1 lg:flex-initial'}`}>
            <div className="bg-gradient-to-br from-zinc-900/70 to-zinc-800/50 backdrop-blur-xl border border-zinc-700/40 rounded-2xl m-2 flex-1 overflow-hidden shadow-2xl shadow-black/30">
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <TradingControls />
                <TradeResults />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}