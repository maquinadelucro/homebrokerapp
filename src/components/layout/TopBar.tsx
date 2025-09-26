'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ChevronDown, Clock, Search, TrendingUp, LogOut } from 'lucide-react';
import { useTradingStore } from '@/lib/trading-store';
import { useAuthStore } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function TopBar() {
  const { 
    userBalance, 
    loadingBalance, 
    balanceError, 
    fetchUserBalance,
    // Estados para o seletor de ativo (mobile)
    assets,
    selectedAsset,
    selectedTimeFrame,
    selectAsset,
    isLoading,
    error
  } = useTradingStore();
  
  const { logout } = useAuthStore();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Estados para o dropdown de ativos (apenas mobile)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAssets, setFilteredAssets] = useState<typeof assets>([]);
  
  // Refs para controle de clique fora
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Buscar saldo ao carregar o componente
  useEffect(() => {
    fetchUserBalance();
  }, [fetchUserBalance]);
  
  // Efeito para detectar cliques fora do dropdown (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setShowAssetDropdown(false);
        setSearchTerm('');
      }
    };

    if (showAssetDropdown && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssetDropdown, isMobile]);
  
  // Efeito para filtrar ativos baseado na pesquisa (mobile)
  useEffect(() => {
    if (!isMobile) return;
    
    const openAssets = assets.filter(asset => asset.isOpen);
    
    if (!searchTerm.trim()) {
      setFilteredAssets(openAssets);
    } else {
      const filtered = openAssets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssets(filtered);
    }
  }, [assets, searchTerm, isMobile]);
  
  // Efeito para focar no input de pesquisa quando o dropdown abrir (mobile)
  useEffect(() => {
    if (showAssetDropdown && searchInputRef.current && isMobile) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showAssetDropdown, isMobile]);
  
  // Formatação do saldo em reais
  const formatBalance = (balance: number | null): string => {
    if (balance === null) return '---';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(balance);
  };
  
  // Função para destacar texto pesquisado (mobile)
  const highlightSearchTerm = (text: string, searchTerm: string): JSX.Element | string => {
    const term = searchTerm.trim();
    if (!term) return text;
    
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    
    const index = lowerText.indexOf(lowerTerm);
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + term.length);
    const after = text.slice(index + term.length);
    
    return (
      <>
        {before}
        <span className="bg-yellow-400 bg-opacity-30 text-yellow-300 font-medium">
          {match}
        </span>
        {after.toLowerCase().includes(lowerTerm) ? highlightSearchTerm(after, term) : after}
      </>
    );
  };
  
  // Manipulador para selecionar ativo (mobile)
  const handleAssetSelect = (assetId: string) => {
    selectAsset(assetId);
    setShowAssetDropdown(false);
    setSearchTerm('');
  };
  
  // Manipulador de logout
  const handleLogout = async () => {
    try {
      // NOVO: Limpar operações antes do logout para isolamento completo
      const { clearOperations } = useTradingStore.getState();
      clearOperations();
      
      await logout();
      
      // Recarregar a página para limpar o estado
      window.location.reload();
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Em caso de erro, recarrega mesmo assim
      window.location.reload();
    }
  };
  
  if (!isMobile) {
    return (
      <div className="relative z-[10000] bg-gradient-to-r from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl px-4 py-2 border-b border-zinc-700/30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-green-500/5"></div>
        <div className="relative z-10 flex justify-between items-center w-full">
          <div className="flex items-center">
            <div className="relative">
              <Image
                src="/assets/sheikbot-logo.png"
                alt="SHEIKBOT"
                width={80}
                height={32}
                className="object-contain"
                style={{ height: "auto" }}
                priority
              />
              <div className="absolute inset-0 bg-green-400/20 blur-lg rounded-full opacity-40"></div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs font-medium">ONLINE</span>
            </div>
            
            <div className="flex items-center">
              {loadingBalance ? (
                <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-700/60 backdrop-blur-sm border border-zinc-600/30 rounded-lg px-3 py-1.5 flex items-center">
                  <Loader2 className="w-3 h-3 animate-spin mr-2 text-cyan-400" />
                  <span className="text-gray-300 text-xs font-medium">Carregando...</span>
                </div>
              ) : balanceError ? (
                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-lg px-3 py-1.5">
                  <div className="text-red-400 text-xs font-medium">Erro</div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-700/60 backdrop-blur-sm border border-zinc-600/30 rounded-lg px-4 py-1.5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                    <div>
                      <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">Saldo</div>
                      <div className="text-white font-bold text-sm">{formatBalance(userBalance)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-400/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all duration-300 group"
              title="Sair"
            >
              <LogOut className="w-3 h-3 text-red-400 group-hover:text-red-300 transition-colors" />
              <span className="text-red-400 group-hover:text-red-300 text-xs font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative z-[10000] bg-gradient-to-r from-zinc-900/90 to-zinc-800/70 backdrop-blur-xl px-2 py-2 border-b border-zinc-700/30">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 via-transparent to-green-500/3"></div>
      <div className="relative z-10">
        <div className="flex justify-center mb-2">
          <div className="relative">
            <Image
              src="/assets/sheikbot-logo.png"
              alt="SHEIKBOT"
              width={70}
              height={28}
              className="object-contain"
              priority
            />
            <div className="absolute inset-0 bg-green-400/15 blur-md rounded-full opacity-50"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          {/* 1. Seletor de Ativo - Mobile */}
          <div className="relative flex-1" ref={assetDropdownRef}>
            <div 
              className="bg-gradient-to-r from-zinc-800/70 to-zinc-700/50 backdrop-blur-sm border border-zinc-600/40 rounded-lg px-2 py-2 cursor-pointer hover:border-cyan-500/30 transition-all duration-300 shadow-lg" 
              onClick={() => setShowAssetDropdown(!showAssetDropdown)}
            >
              <div className="flex flex-col min-h-[36px]">
                <div className="text-gray-400 text-xs mb-1">Ativo</div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    {selectedAsset && selectedAsset.logo ? (
                      <div className="w-4 h-4 rounded-full overflow-hidden">
                        <Image 
                          src={selectedAsset.logo}
                          alt={selectedAsset.name}
                          width={16}
                          height={16}
                          className="rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {selectedAsset ? selectedAsset.name.charAt(0) : 'A'}
                      </div>
                    )}
                    
                    <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black ${
                      selectedAsset?.isOpen ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <span className="text-white text-xs font-medium block leading-tight">
                      {selectedAsset ? selectedAsset.name : 'Selecione um ativo'}
                    </span>
                  </div>
                  
                  <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            </div>
            
            {/* Dropdown de Ativos */}
            {showAssetDropdown && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-gradient-to-br from-zinc-900/95 to-zinc-800/90 backdrop-blur-xl border border-zinc-600/40 rounded-2xl shadow-2xl shadow-black/50 z-[9999] max-h-72 overflow-hidden">
                <div className="p-3 border-b border-zinc-700/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cyan-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Pesquisar ativo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-600/30 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                    />
                  </div>
                </div>
                
                <div className="max-h-52 overflow-y-auto custom-scrollbar">
                  {isLoading ? (
                    <div className="p-4 text-gray-400 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                      <span className="text-sm">Carregando...</span>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-red-400 text-center text-sm">Erro: {error}</div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="p-4 text-yellow-400 text-center text-sm">
                      {searchTerm ? 'Nenhum ativo encontrado' : 'Nenhum ativo disponível'}
                    </div>
                  ) : (
                    filteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 p-3 hover:bg-zinc-700/40 cursor-pointer transition-all duration-200 border-b border-zinc-700/20 last:border-b-0"
                        onClick={() => handleAssetSelect(asset.id)}
                      >
                        <div className="relative">
                          {asset.logo ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              <Image 
                                src={asset.logo}
                                alt={asset.name}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {asset.name.charAt(0)}
                            </div>
                          )}
                          
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-800 ${
                            asset.isOpen ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm">
                            {highlightSearchTerm(asset.name, searchTerm)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {highlightSearchTerm(asset.symbol, searchTerm)}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-white text-sm font-medium">
                            ${typeof asset.price === 'number' ? asset.price.toFixed(2) : '0.00'}
                          </div>
                          <div className="text-xs flex items-center text-gray-400">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            ---%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* 2. Timeframe */}
          <div>
            <div className="bg-gradient-to-r from-zinc-800/70 to-zinc-700/50 backdrop-blur-sm border border-zinc-600/40 rounded-lg px-2 py-1.5 shadow-lg">
              <div className="flex flex-col items-center">
                <div className="text-gray-400 text-xs mb-0.5 font-medium">Período</div>
                <div className="flex items-center text-white text-xs font-medium">
                  <Clock className="h-2.5 w-2.5 mr-1 text-cyan-400" />
                  {selectedTimeFrame || '30s'}
                </div>
              </div>
            </div>
          </div>
          
          {/* 3. Saldo */}
          <div>
            <div className="bg-gradient-to-r from-zinc-800/70 to-zinc-700/50 backdrop-blur-sm border border-zinc-600/40 rounded-lg px-2 py-1.5 shadow-lg">
              <div className="flex flex-col items-center">
                <div className="text-gray-400 text-xs mb-0.5 font-medium">Saldo</div>
                {loadingBalance ? (
                  <div className="flex items-center">
                    <Loader2 className="w-2.5 h-2.5 animate-spin mr-1 text-cyan-400" />
                    <span className="text-white text-xs font-medium">...</span>
                  </div>
                ) : balanceError ? (
                  <div className="text-red-400 text-xs font-medium">Erro</div>
                ) : (
                  <div className="text-white font-bold text-xs">
                    {formatBalance(userBalance)}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 4. Logout - Mobile */}
          <div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2 py-2 flex flex-col items-center transition-all duration-300 group shadow-lg"
              title="Sair"
            >
              <LogOut className="w-2.5 h-2.5 text-red-400 group-hover:text-red-300 transition-colors mb-0.5" />
              <span className="text-red-400 group-hover:text-red-300 text-xs font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}