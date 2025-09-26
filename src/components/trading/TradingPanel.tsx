'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  Clock,
  Loader2,
  Check,
  X,
  Timer
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useTradingStore } from '@/lib/trading-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { TradingOperation } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Importar componente de gráfico com carregamento dinâmico (client-side)
const CandlestickChart = dynamic(
  () => import('./CandlestickChart'),
  { ssr: false }
);

export default function TradingPanel() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const {
    // Dados de ativos
    assets,
    selectedAsset,
    timeFrames,
    selectedTimeFrame,
    selectTimeFrame,
    
    // Carregamento de dados
    isLoading,
    error,
    
    // WebSocket
    isWebSocketConnected,
    lastRealTimeUpdate,
    
    // Dados de saldo
    userBalance,
    
    // Operações
    operations,
    createOperation,
    
    // Métodos
    updateOperationResult,
  } = useTradingStore();
  
  // Estados locais
  const [investmentAmount, setInvestmentAmount] = useState(10);
  const [showOperationHistory, setShowOperationHistory] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(!isMobile);
  const [profitAmount, setProfitAmount] = useState<number | null>(null);
  
  // Calcula o potencial de lucro com base no valor investido e no payout
  useEffect(() => {
    if (selectedAsset && selectedAsset.profitPayout) {
      const profit = investmentAmount * (selectedAsset.profitPayout / 100);
      setProfitAmount(profit);
    } else {
      setProfitAmount(null);
    }
  }, [investmentAmount, selectedAsset]);
  
  // Atualiza o estado das operações existentes
  useEffect(() => {
    // Verificar operações pendentes que possam ter expirado
    const now = Math.floor(Date.now() / 1000);
    
    operations.forEach(operation => {
      if (operation.status === 'pending' && operation.expiryTime <= now) {
        // A operação expirou, precisamos verificar o resultado
        const direction = operation.direction;
        
        if (lastRealTimeUpdate && lastRealTimeUpdate.symbol === operation.assetSymbol) {
          const currentPrice = lastRealTimeUpdate.close;
          const entryPrice = operation.entryPrice;
          
          // Determinar se a operação foi vencedora ou perdedora
          let result: TradingOperation['status'];
          
          if (direction === 'up') {
            result = currentPrice > entryPrice ? 'win' : 'loss';
          } else { // direction === 'down'
            result = currentPrice < entryPrice ? 'win' : 'loss';
          }
          
          // Atualizar o resultado da operação
          updateOperationResult(operation.id, result);
          
          // Mostrar toast com o resultado
          toast({
            title: `Operação finalizada: ${result === 'win' ? 'GANHO' : 'PERDA'}`,
            description: `${operation.assetName} - ${formatCurrency(operation.amount)} - ${result === 'win' ? '+' : ''}${formatCurrency(result === 'win' ? operation.amount * (operation.payout / 100) : -operation.amount)}`,
            variant: result === 'win' ? 'success' : 'destructive',
          });
        }
      }
    });
  }, [lastRealTimeUpdate, operations, toast, updateOperationResult]);
  
  // Manipuladores de eventos
  const handleAmountChange = (amount: number) => {
    if (amount >= 5 && amount <= 1000) {
      setInvestmentAmount(amount);
    }
  };
  
  const handleTimeFrameSelect = (timeFrame: string) => {
    selectTimeFrame(timeFrame);
  };
  
  // Criar uma nova operação
  const handleCreateOperation = (direction: 'up' | 'down') => {
    if (!selectedAsset) {
      toast({
        title: "Erro",
        description: "Selecione um ativo primeiro",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedAsset.isOpen) {
      toast({
        title: "Mercado fechado",
        description: "Este ativo não está disponível para operações no momento",
        variant: "destructive",
      });
      return;
    }
    
    if (!lastRealTimeUpdate) {
      toast({
        title: "Erro",
        description: "Aguarde a conexão com o servidor de dados",
        variant: "destructive",
      });
      return;
    }
    
    if (userBalance === null || investmentAmount > userBalance) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para esta operação",
        variant: "destructive",
      });
      return;
    }
    
    const currentPrice = lastRealTimeUpdate.close;
    const timeFrameValue = selectedTimeFrame || '30s';
    const durationInMs = timeFrameValue.endsWith('s') 
      ? parseInt(timeFrameValue) * 1000 
      : parseInt(timeFrameValue) * 60 * 1000;
    
    // Calcular timestamp de expiração
    const now = new Date();
    const expiryTime = Math.floor((now.getTime() + durationInMs) / 1000);
    const entryTime = Math.floor(now.getTime() / 1000);
    
    // Criar a operação
    createOperation({
      id: `op-${Date.now()}`,
      direction,
      amount: investmentAmount,
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      assetSymbol: selectedAsset.symbol,
      entryPrice: currentPrice,
      entryTime,
      duration: durationInMs,
      expiryTime,
      status: 'pending',
      payout: selectedAsset.profitPayout || 0,
    });
    
    // Mostrar toast de confirmação
    toast({
      title: `${direction === 'up' ? 'COMPRA' : 'VENDA'} confirmada`,
      description: `${selectedAsset.name} - ${formatCurrency(investmentAmount)} - Expira em ${timeFrameValue}`,
      variant: "default",
    });
  };
  
  // Componente para exibir as operações recentes
  const OperationHistory = () => {
    // Ordenar operações do mais recente ao mais antigo
    const sortedOperations = [...operations].sort((a, b) => b.entryTime - a.entryTime);
    
    return (
      <div className="w-full max-h-40 overflow-y-auto bg-zinc-800 rounded-md border border-zinc-700 mt-2">
        {sortedOperations.length === 0 ? (
          <div className="text-gray-400 text-center p-4 text-sm">
            Nenhuma operação realizada
          </div>
        ) : (
          <div className="divide-y divide-zinc-700">
            {sortedOperations.map(operation => {
              // Determinar ícone e cor com base no status e direção
              let statusIcon;
              let statusColor;
              
              if (operation.status === 'pending') {
                statusIcon = <Timer className="h-4 w-4 text-yellow-400" />;
                statusColor = 'text-yellow-400';
              } else if (operation.status === 'win') {
                statusIcon = <Check className="h-4 w-4 text-green-500" />;
                statusColor = 'text-green-500';
              } else {
                statusIcon = <X className="h-4 w-4 text-red-500" />;
                statusColor = 'text-red-500';
              }
              
              // Calcular resultado financeiro
              const operationResult = operation.status === 'win' 
                ? operation.amount * (operation.payout / 100)
                : operation.status === 'loss' ? -operation.amount : null;
              
              // Formatar data/hora
              const date = new Date(operation.entryTime * 1000);
              const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={operation.id} className="p-2 hover:bg-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Ícone de direção */}
                      <div className={`rounded-full p-1 ${
                        operation.direction === 'up' ? 'bg-green-500 bg-opacity-20' : 'bg-red-500 bg-opacity-20'
                      }`}>
                        {operation.direction === 'up' ? (
                          <ArrowUpCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      
                      {/* Nome do ativo */}
                      <span className="text-white text-sm font-medium">
                        {operation.assetName}
                      </span>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center space-x-1">
                      {statusIcon}
                      <span className={`text-xs font-medium ${statusColor}`}>
                        {operation.status === 'pending' ? 'Em andamento' : 
                         operation.status === 'win' ? 'Ganho' : 'Perda'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1 text-xs">
                    <div className="text-gray-400">
                      {timeString} • {formatCurrency(operation.amount)}
                    </div>
                    
                    {operationResult !== null && (
                      <div className={operationResult > 0 ? 'text-green-400' : 'text-red-400'}>
                        {operationResult > 0 ? '+' : ''}{formatCurrency(operationResult)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  // Atalhos para valores de investimento comum
  const AmountShortcuts = () => (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        onClick={() => handleAmountChange(10)}
        className={`px-2 py-1 text-xs rounded ${
          investmentAmount === 10 ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
        }`}
      >
        R$10
      </button>
      <button
        onClick={() => handleAmountChange(25)}
        className={`px-2 py-1 text-xs rounded ${
          investmentAmount === 25 ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
        }`}
      >
        R$25
      </button>
      <button
        onClick={() => handleAmountChange(50)}
        className={`px-2 py-1 text-xs rounded ${
          investmentAmount === 50 ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
        }`}
      >
        R$50
      </button>
      <button
        onClick={() => handleAmountChange(100)}
        className={`px-2 py-1 text-xs rounded ${
          investmentAmount === 100 ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
        }`}
      >
        R$100
      </button>
    </div>
  );
  
  // Seletor de timeframe
  const TimeFrameSelector = () => (
    <div className="mt-3">
      <div className="text-gray-400 text-xs mb-1">Tempo de Expiração</div>
      <div className="flex flex-wrap gap-2">
        {timeFrames.map(tf => (
          <button
            key={tf}
            onClick={() => handleTimeFrameSelect(tf)}
            className={`px-3 py-1 text-xs rounded-md font-medium ${
              selectedTimeFrame === tf 
                ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-opacity-50' 
                : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
  
  // Interface para dispositivos móveis (painel inferior)
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow relative overflow-hidden">
          <CandlestickChart className="w-full h-full" />
        </div>
        
        {/* Painel inferior móvel com animação de expansão */}
        <div className="relative bg-black border-t border-zinc-800">
          {/* Botão para expandir/recolher o painel */}
          <button 
            className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-zinc-800 rounded-t-md p-1 border border-zinc-700 border-b-0"
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          >
            {isPanelExpanded ? 
              <ChevronDown className="h-4 w-4 text-gray-400" /> : 
              <ChevronUp className="h-4 w-4 text-gray-400" />
            }
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isPanelExpanded ? 'max-h-64' : 'max-h-20'
          }`}>
            <div className="p-3">
              <div className="flex justify-between items-center">
                {/* Controles de valor */}
                <div className="flex-1">
                  <div className="text-gray-400 text-xs mb-1">Valor</div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => handleAmountChange(investmentAmount - 5)}
                      className="p-1 bg-zinc-800 rounded-l-md border border-zinc-700"
                      disabled={investmentAmount <= 5}
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <input 
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => handleAmountChange(Number(e.target.value))}
                      className="w-16 p-1 text-center text-white bg-zinc-800 border-y border-zinc-700 focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={() => handleAmountChange(investmentAmount + 5)}
                      className="p-1 bg-zinc-800 rounded-r-md border border-zinc-700"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {/* Botões de operação */}
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 h-10"
                    onClick={() => handleCreateOperation('down')}
                    disabled={!selectedAsset || !selectedAsset.isOpen || !isWebSocketConnected || !lastRealTimeUpdate}
                  >
                    <ArrowDownCircle className="h-5 w-5 mr-1" />
                    VENDER
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-1 h-10 bg-green-600 hover:bg-green-700"
                    onClick={() => handleCreateOperation('up')}
                    disabled={!selectedAsset || !selectedAsset.isOpen || !isWebSocketConnected || !lastRealTimeUpdate}
                  >
                    <ArrowUpCircle className="h-5 w-5 mr-1" />
                    COMPRAR
                  </Button>
                </div>
              </div>
              
              {/* Conteúdo adicional visível apenas quando expandido */}
              {isPanelExpanded && (
                <div className="mt-3">
                  <AmountShortcuts />
                  <TimeFrameSelector />
                  
                  {/* Informação de ganho potencial */}
                  {profitAmount !== null && selectedAsset && (
                    <div className="mt-3 bg-zinc-800 p-2 rounded-md border border-zinc-700">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Ganho potencial:</span>
                        <span className="text-green-400">{formatCurrency(profitAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">Payout:</span>
                        <span className="text-blue-400">{selectedAsset.profitPayout}%</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Histórico de operações */}
                  <div className="mt-3">
                    <button
                      onClick={() => setShowOperationHistory(!showOperationHistory)}
                      className="flex items-center text-xs text-gray-300 hover:text-white"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {showOperationHistory ? 'Ocultar histórico' : 'Mostrar histórico'}
                    </button>
                    
                    {showOperationHistory && <OperationHistory />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Interface para desktop (painel lateral)
  return (
    <div className="flex h-full">
      {/* Área principal do gráfico */}
      <div className="flex-grow relative overflow-hidden">
        <CandlestickChart className="w-full h-full" />
      </div>
      
      {/* Painel lateral */}
      <div className={`bg-black border-l border-zinc-800 overflow-hidden transition-all duration-300 ease-in-out ${
        isPanelExpanded ? 'w-72' : 'w-10'
      }`}>
        {/* Botão para expandir/recolher o painel */}
        <button 
          className="absolute right-72 top-1/2 transform -translate-y-1/2 translate-x-full bg-zinc-800 rounded-r-md p-1 border border-zinc-700 border-l-0"
          onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          style={{ right: isPanelExpanded ? '72' : '10' }}
        >
          {isPanelExpanded ? 
            <ChevronRight className="h-4 w-4 text-gray-400" /> : 
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          }
        </button>
        
        {isPanelExpanded ? (
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-white font-medium text-lg mb-4">Configurar Operação</h2>
            
            {/* Valor de investimento */}
            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-1">Valor do Investimento</div>
              <div className="flex items-center">
                <button 
                  onClick={() => handleAmountChange(investmentAmount - 5)}
                  className="p-2 bg-zinc-800 rounded-l-md border border-zinc-700"
                  disabled={investmentAmount <= 5}
                >
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>
                <input 
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  className="w-24 p-2 text-center text-white bg-zinc-800 border-y border-zinc-700 focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={() => handleAmountChange(investmentAmount + 5)}
                  className="p-2 bg-zinc-800 rounded-r-md border border-zinc-700"
                >
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              
              <AmountShortcuts />
            </div>
            
            {/* Seletor de timeframe */}
            <TimeFrameSelector />
            
            {/* Informação de ganho potencial */}
            {profitAmount !== null && selectedAsset && (
              <div className="mt-4 bg-zinc-800 p-3 rounded-md border border-zinc-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ganho potencial:</span>
                  <span className="text-green-400 font-medium">{formatCurrency(profitAmount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">Payout:</span>
                  <span className="text-blue-400 font-medium">{selectedAsset.profitPayout}%</span>
                </div>
              </div>
            )}
            
            {/* Botões de operação */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                size="lg"
                className="flex items-center justify-center h-12"
                onClick={() => handleCreateOperation('down')}
                disabled={!selectedAsset || !selectedAsset.isOpen || !isWebSocketConnected || !lastRealTimeUpdate}
              >
                <ArrowDownCircle className="h-5 w-5 mr-2" />
                VENDER
              </Button>
              <Button
                variant="success"
                size="lg"
                className="flex items-center justify-center h-12 bg-green-600 hover:bg-green-700"
                onClick={() => handleCreateOperation('up')}
                disabled={!selectedAsset || !selectedAsset.isOpen || !isWebSocketConnected || !lastRealTimeUpdate}
              >
                <ArrowUpCircle className="h-5 w-5 mr-2" />
                COMPRAR
              </Button>
            </div>
            
            {/* Status de conexão e alertas */}
            <div className="mt-4">
              {!isWebSocketConnected && (
                <div className="flex items-center text-yellow-400 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Conectando ao servidor...</span>
                </div>
              )}
              
              {selectedAsset && !selectedAsset.isOpen && (
                <div className="flex items-center text-red-400 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Mercado fechado</span>
                </div>
              )}
            </div>
            
            {/* Histórico de operações */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-medium">Histórico</h3>
                <button
                  onClick={() => setShowOperationHistory(!showOperationHistory)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  {showOperationHistory ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              
              {showOperationHistory && <OperationHistory />}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center py-4">
            {/* Ícones verticais quando minimizado */}
            <button className="p-2 text-gray-400 hover:text-white">
              <Clock className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}