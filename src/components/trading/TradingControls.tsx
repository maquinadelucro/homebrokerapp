'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Play, Star, CheckCircle, XCircle, Loader2, Info, AlertTriangle, BrainCircuit, XSquare, DollarSign, Target, BarChart3, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { tradingApi } from '@/lib/api';
import { useTradingStore } from '@/lib/trading-store';
import AIAnalysisModal from './AIAnalysisModal';
import RecommendedAssetsModal from './RecommendedAssetsModal';
import TradingSummaryModal from './TradingSummaryModal';

// Componente de Tooltip
const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-xs rounded-md shadow-lg border border-zinc-700 whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900"></div>
        </div>
      )}
    </div>
  );
};

// Tipos para validação
interface ValidationState {
  isValid: boolean;
  message: string;
}

// Interface para o resumo de trading
interface TradingSummary {
  isGoalReached: boolean;
  isStopLossReached: boolean;
  totalGains: number;
  totalLosses: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  winRate: number;
  operations: any[];
}

export default function TradingControls() {
  const router = useRouter();
  
  const { 
    selectedAsset, 
    selectedTimeFrame, 
    lastRealTimeUpdate,
    operations, 
    addOperation,
    connectToPusher,
    subscribeToUserEvents,
    lastTradeResult,
    isMartingaleEnabled,
    toggleMartingaleEnabled,
    selectAsset,
    updateOperationStatus,
    getMartingaleGroupOperations,
    createMartingaleOperation: createMartingaleTrade,
  } = useTradingStore();
  
  const [aiModel, setAiModel] = useState('ChatGPT 5.0 (OpenAI)');
  const [strategy, setStrategy] = useState('Aggressive');
  
  // Valores como inteiros
  const [entryValue, setEntryValue] = useState(5);
  const [goal, setGoal] = useState(50);
  const [stopLoss, setStopLoss] = useState(50);
  
  // Estado para feedback da criação de trade
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState<boolean | null>(null);
  const [tradeMessage, setTradeMessage] = useState('');
  
  // Estado para a modal de análise de IA
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);
  
  // Estado para a modal de ativos recomendados
  const [showRecommendedAssetsModal, setShowRecommendedAssetsModal] = useState(false);
  
  // Estado para controlar se o trading automático está ativo
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  
  // Estado para mostrar o resumo quando atingir goal ou stop loss
  const [showTradingSummary, setShowTradingSummary] = useState(false);
  const [tradingSummary, setTradingSummary] = useState<TradingSummary | null>(null);
  
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  
  // Estados temporários para os inputs durante a edição (como strings para controle do input)
  const [entryValueInput, setEntryValueInput] = useState(entryValue.toString());
  const [goalInput, setGoalInput] = useState(goal.toString());
  const [stopLossInput, setStopLossInput] = useState(stopLoss.toString());
  
  // Estados de validação
  const [entryValueValidation, setEntryValueValidation] = useState<ValidationState>({ isValid: true, message: '' });
  const [goalValidation, setGoalValidation] = useState<ValidationState>({ isValid: true, message: '' });
  const [stopLossValidation, setStopLossValidation] = useState<ValidationState>({ isValid: true, message: '' });
  
  // Estado para controlar se devemos cancelar as próximas operações de gale
  const [preventMartingale, setPreventMartingale] = useState(false);
  
  // Estado para controlar se a operação foi cancelada (para mostrar feedback)
  const [isCancelled, setIsCancelled] = useState(false);
  
  // Direção simulada para análise IA - oscila entre 'up' e 'down'
  const [simulatedDirection, setSimulatedDirection] = useState<'up' | 'down'>('up');
  
  // Referência para evitar duplicação de operações
  const isProcessingOperation = useRef(false);
  
  const aiDropdownRef = useRef<HTMLDivElement>(null);
  const strategyDropdownRef = useRef<HTMLDivElement>(null);
  
  const aiModels = [
    'ChatGPT 5.0 (OpenAI)', 
    'Claude 3.0 Opus (Anthropic)', 
    'Gemini Ultra 1.5 (Google)', 
    'Llama 3 70B (Meta)', 
    'Titan v2 (Amazon)'
  ];

  const strategies = ['Aggressive', 'Moderate', 'Smooth'];

  // Verifica se existe alguma operação com status 'pending'
  const isOperationInProgress = operations.some(op => op.status === 'pending');

  // Verificar se há alguma operação de gale em andamento
  const hasActiveGaleOperations = operations.some(op => 
    op.status === 'pending' && op.isMartingale === true
  );

  // Estado para controlar se os inputs estão visíveis
  const shouldHideControls = isCreatingTrade || isOperationInProgress || isProcessingOperation.current;

  // Calcular progresso atual em direção ao Goal e Stop Loss
  const calculateProgress = () => {
    // Filtrar operações finalizadas
    const completedOperations = operations.filter(
      op => op.status === 'win' || op.status === 'loss'
    );
    
    // Calcular ganhos totais
    const totalGains = completedOperations
      .filter(op => op.status === 'win' && op.result !== undefined)
      .reduce((sum, op) => sum + (op.result || 0), 0);
    
    // Calcular perdas totais (valores positivos)
    const totalLosses = completedOperations
      .filter(op => op.status === 'loss' && op.result !== undefined)
      .reduce((sum, op) => sum + Math.abs(op.result || 0), 0);
    
    // Calcular o resultado líquido (net result)
    const netResult = totalGains - totalLosses;
    
    // Calcular progresso em porcentagem
    const goalProgress = Math.min(100, Math.round((totalGains / goal) * 100)) || 0;
    const stopLossProgress = Math.min(100, Math.round((totalLosses / stopLoss) * 100)) || 0;
    
    // Verificar se atingimos goal ou stop loss com base no resultado líquido
    const isGoalReached = netResult >= goal;
    const isStopLossReached = netResult <= -stopLoss;
    
    // Contar operações ganhas e perdidas
    const winCount = completedOperations.filter(op => op.status === 'win').length;
    const lossCount = completedOperations.filter(op => op.status === 'loss').length;
    const totalTrades = winCount + lossCount;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    
    return {
      totalGains,
      totalLosses,
      goalProgress,
      stopLossProgress,
      isGoalReached,
      isStopLossReached,
      winCount,
      lossCount,
      totalTrades,
      winRate
    };
  };
  
  // Obter dados de progresso atualizados
  const progress = calculateProgress();

  // Função para validar Entry Value (valores inteiros)
  const validateEntryValue = (value: number): ValidationState => {
    if (isNaN(value) || !Number.isInteger(value)) {
      return { isValid: false, message: 'Digite apenas números inteiros' };
    }
    if (value < 5) {
      return { isValid: false, message: 'Valor mínimo: R$5' };
    }
    if (value > 5000) {
      return { isValid: false, message: 'Valor máximo: R$5.000' };
    }
    return { isValid: true, message: '' };
  };

  // Função para validar Goal (valores inteiros)
  const validateGoal = (value: number): ValidationState => {
    if (isNaN(value) || !Number.isInteger(value)) {
      return { isValid: false, message: 'Digite apenas números inteiros' };
    }
    if (value < 50) {
      return { isValid: false, message: 'Valor mínimo: R$50' };
    }
    if (value > 50000) {
      return { isValid: false, message: 'Valor máximo: R$50.000' };
    }
    return { isValid: true, message: '' };
  };

  // Função para validar Stop Loss (valores inteiros)
  const validateStopLoss = (value: number): ValidationState => {
    if (isNaN(value) || !Number.isInteger(value)) {
      return { isValid: false, message: 'Digite apenas números inteiros' };
    }
    if (value < 50) {
      return { isValid: false, message: 'Valor mínimo: R$50' };
    }
    if (value > 50000) {
      return { isValid: false, message: 'Valor máximo: R$50.000' };
    }
    return { isValid: true, message: '' };
  };

  // Verificar se todos os valores são válidos
  const areAllValuesValid = entryValueValidation.isValid && goalValidation.isValid && stopLossValidation.isValid;
  
  // Verificar se podemos iniciar a operação
  const canStartTrading = areAllValuesValid && !isCreatingTrade && !isOperationInProgress && !isProcessingOperation.current;

  // Verificar se é seguro iniciar uma nova operação (sem gales ativos)
  const canInitiateNewOperation = () => {
    // Verificar operações ativas
    if (!isOperationInProgress) return true;
    
    // Verificar se há alguma operação de gale ativa
    const hasActiveGale = operations.some(op => op.status === 'pending' && op.isMartingale === true);
    if (hasActiveGale) return false;
    
    // Verificar se há alguma operação principal com gales pendentes
    const mainOperations = operations.filter(op => 
      op.status === 'pending' && 
      (!op.isMartingale || op.isMartingale === false)
    );
    
    for (const op of mainOperations) {
      if (op.id) {
        const galeOperations = getMartingaleGroupOperations(op.id);
        const hasPendingGales = galeOperations.some(gale => gale.status === 'pending');
        if (hasPendingGales) return false;
      }
    }
    
    return true;
  };

  // Lógica para iniciar a próxima operação (principal ou gale)
  useEffect(() => {
    if (!isAutoTrading || !lastTradeResult) return;

    const handleNextStep = () => {
      const { isGoalReached, isStopLossReached } = calculateProgress();
      if (isGoalReached || isStopLossReached) {
        setIsAutoTrading(false);
        const summary = { ...calculateProgress(), operations: operations.filter(op => op.status === 'win' || op.status === 'loss') };
        setTradingSummary(summary);
        setShowTradingSummary(true);
        return;
      }

      const failedOperation = operations.find(op => op.id === lastTradeResult.operationId);
      let currentMartingaleLevel = 0;
      if (failedOperation?.isMartingale) {
        currentMartingaleLevel = failedOperation.martingaleLevel || 0;
      }

      // Se a última operação foi uma perda...
      if (!lastTradeResult.isWin) {
        // ...e o martingale está ativo E não atingimos o limite de 2 gales
        if (isMartingaleEnabled && currentMartingaleLevel < 2) {
          console.log("Auto-trading: Iniciando gale...");
          createMartingaleTrade(lastTradeResult.operationId);
        } else {
          // Se o martingale estiver desativado ou o limite de gales foi atingido
          console.log("Auto-trading: Martingale desativado ou limite atingido. Iniciando nova operação principal...");
          setSimulatedDirection(prev => prev === 'up' ? 'down' : 'up');
          setShowAiAnalysisModal(true);
        }
      } else {
        // Se foi uma vitória, iniciar nova operação principal
        console.log("Auto-trading: Operação ganha. Iniciando nova operação principal...");
        setSimulatedDirection(prev => prev === 'up' ? 'down' : 'up');
        setShowAiAnalysisModal(true);
      }
    };

    // Adicionar um pequeno delay para garantir que o estado foi atualizado
    const timer = setTimeout(handleNextStep, 1000);
    return () => clearTimeout(timer);

  }, [lastTradeResult, isAutoTrading]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target as Node)) {
        setShowAiDropdown(false);
      }
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(event.target as Node)) {
        setShowStrategyDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Limpar a mensagem de feedback após 5 segundos
  useEffect(() => {
    if (tradeSuccess !== null) {
      const timer = setTimeout(() => {
        setTradeSuccess(null);
        setTradeMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [tradeSuccess]);
  
  // Limpar o resultado da operação após 3 segundos
  useEffect(() => {
    if (lastTradeResult) {
      // Precisamos acessar diretamente o estado do store para limpar o resultado
      const timer = setTimeout(() => {
        // Usando setState do store para limpar o lastTradeResult
        useTradingStore.setState({ lastTradeResult: null });
      }, 3000); // 3 segundos
      
      return () => clearTimeout(timer);
    }
  }, [lastTradeResult]);
  
  // Reset preventMartingale e isCancelled quando não há operações pendentes
  useEffect(() => {
    if (!isOperationInProgress && (preventMartingale || isCancelled)) {
      setPreventMartingale(false);
      setIsCancelled(false);
    }
  }, [isOperationInProgress, preventMartingale, isCancelled]);
  
  // Efetuar a inscrição no canal de usuário para eventos de operações
  useEffect(() => {
    try {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        console.log('TradingControls - Inscrevendo em eventos do usuário:', userId);
        
        connectToPusher().then(() => {
          subscribeToUserEvents(userId);
        });
      }
    } catch (e) {
      console.error('TradingControls - Erro ao buscar ID do usuário:', e);
    }
  }, [connectToPusher, subscribeToUserEvents]);
  
  // Método para abrir a modal de análise antes de iniciar o trading
  const handleStartAnalysis = () => {
    // Se já estiver em processo de criação ou uma operação estiver em andamento, não fazer nada
    if (isCreatingTrade || isOperationInProgress || isProcessingOperation.current) return;
    
    // Se não houver ativo ou timeframe selecionado, não podemos criar a operação
    if (!selectedAsset || !selectedTimeFrame) {
      setTradeSuccess(false);
      setTradeMessage('Selecione um ativo e um timeframe para operar');
      return;
    }

    // Verificar se todos os valores são válidos
    if (!areAllValuesValid) {
      setTradeSuccess(false);
      setTradeMessage('Corrija os valores inválidos antes de iniciar a operação');
      return;
    }
    
    // Ativar trading automático
    setIsAutoTrading(true);
    
    // A modal de análise só deve aparecer para a primeira operação (não gales)
    setShowAiAnalysisModal(true);
  };

  // Método para iniciar a operação após a análise da IA
  const handleCompleteAnalysis = async (direction: 'up' | 'down') => {
    // Fechar a modal de análise
    setShowAiAnalysisModal(false);
    
    // Verificar se já está processando uma operação para evitar duplicação
    if (isProcessingOperation.current) {
      console.log('Operação já está sendo processada. Ignorando chamada duplicada.');
      return;
    }
    
    // Verificar se existem operações de gale em andamento
    const hasActiveGales = operations.some(op => op.status === 'pending' && op.isMartingale === true);
    if (hasActiveGales) {
      console.log('Existem operações de gale em andamento. Aguardando finalização...');
      setTradeSuccess(false);
      setTradeMessage('Aguardando finalização das operações de gale em andamento.');
      return;
    }
    
    // Marcar que estamos processando uma operação
    isProcessingOperation.current = true;
    
    try {
      // Continuar com a criação da operação usando a direção determinada pela análise
      const directionText = direction === 'up' ? 'COMPRA' : 'VENDA';
      
      // Converter o timeframe para milissegundos
      let durationMs = 0;
      const match = selectedTimeFrame.match(/^(\d+)([smh])$/);
      
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        
        switch (unit) {
          case 's':
            durationMs = value * 1000;
            break;
          case 'm':
            durationMs = value * 60 * 1000;
            break;
          case 'h':
            durationMs = value * 60 * 60 * 1000;
            break;
          default:
            durationMs = 30 * 1000;
        }
      } else {
        durationMs = 30 * 1000;
      }
      
      // Preparar parâmetros para a API - CONVERTENDO INTEIROS PARA DECIMAIS
      const tradeParams = {
        symbol: selectedAsset.symbol,
        direction: direction,
        betValue: entryValue, // Converter inteiro para decimal (5 -> 5.00)
        durationMilliseconds: durationMs,
        accountType: 'demo' as const
      };
      
      setIsCreatingTrade(true);
      setTradeSuccess(null);
      setTradeMessage(`Criando operação de ${directionText}...`);
      
      // Chamar a API para criar a operação
      const result = await tradingApi.createTrade(tradeParams);
      
      // Operação criada com sucesso
      setIsCreatingTrade(false);
      setTradeSuccess(true);
      setTradeMessage(`Operação de ${directionText} criada com sucesso! ID: ${result.id}`);
      
      // Obter o preço atual do ativo
      const currentPrice = lastRealTimeUpdate?.close || 100;
      
      // Adicionar a operação ao gráfico
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Registrar a operação para exibição no gráfico - CONVERTENDO PARA DECIMAL
      addOperation({
        id: result.id,
        symbol: selectedAsset.symbol,
        direction: direction,
        entryPrice: currentPrice,
        entryTime: currentTime,
        duration: durationMs,
        expiryTime: currentTime + Math.floor(durationMs / 1000),
        amount: entryValue, // Usar valor inteiro convertido automaticamente
        status: 'pending',
        isMartingale: false // Operação principal nunca é martingale
      });
      
    } catch (error) {
      setIsCreatingTrade(false);
      setTradeSuccess(false);
      setTradeMessage(`Erro ao criar operação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Se estamos em trading automático e ocorreu um erro, tentar novamente em alguns segundos
      if (isAutoTrading) {
        console.log("Auto-trading: Erro ao criar operação. Tentando novamente em 5 segundos...");
        setTimeout(() => {
          if (isAutoTrading) {
            setShowAiAnalysisModal(true);
          }
        }, 5000);
      }
    } finally {
      // Resetar o flag de processamento, não importa o resultado
      isProcessingOperation.current = false;
    }
  };

  // Método para lidar com a seleção de um ativo recomendado
  const handleSelectRecommendedAsset = (assetId: string) => {
    selectAsset(assetId);
  };

  // Função para cancelar próximos gales, deixando a operação atual finalizar normalmente
  const handleCancelOperation = () => {
    console.log('Cancelando próximos gales...');
    
    // Desativar o trading automático
    if (isAutoTrading) {
      setIsAutoTrading(false);
      console.log("Auto-trading: Desativado ao cancelar operação.");
    }
    
    // Não vamos cancelar operações atuais, apenas impedir novos gales
    setPreventMartingale(true);
    
    // Definir flag no store para prevenir novos gales
    useTradingStore.setState({ isMartingaleEnabled: false });
    
    // Marcar como cancelado para mostrar feedback
    setIsCancelled(true);
  };
  
  // Função para validar e atualizar o entry value (apenas inteiros)
  const handleEntryValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d]/g, ''); // Apenas dígitos
    setEntryValueInput(inputValue);
    
    // Validação em tempo real
    const numValue = parseInt(inputValue) || 0;
    const validation = validateEntryValue(numValue);
    setEntryValueValidation(validation);
  };
  
  // Função para validar e atualizar o goal (apenas inteiros)
  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d]/g, ''); // Apenas dígitos
    setGoalInput(inputValue);
    
    // Validação em tempo real
    const numValue = parseInt(inputValue) || 0;
    const validation = validateGoal(numValue);
    setGoalValidation(validation);
  };
  
  // Função para validar e atualizar o stop loss (apenas inteiros)
  const handleStopLossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d]/g, ''); // Apenas dígitos
    setStopLossInput(inputValue);
    
    // Validação em tempo real
    const numValue = parseInt(inputValue) || 0;
    const validation = validateStopLoss(numValue);
    setStopLossValidation(validation);
  };
  
  // Função para aplicar o valor quando o usuário sai do campo (blur)
  const handleEntryValueBlur = () => {
    const value = parseInt(entryValueInput) || 5; // Default para 5 se vazio
    const limitedValue = Math.min(Math.max(value, 5), 5000);
    setEntryValue(limitedValue);
    setEntryValueInput(limitedValue.toString());
    
    // Revalidar após aplicar o valor limitado
    const validation = validateEntryValue(limitedValue);
    setEntryValueValidation(validation);
  };
  
  const handleGoalBlur = () => {
    const value = parseInt(goalInput) || 50; // Default para 50 se vazio
    const limitedValue = Math.min(Math.max(value, 50), 50000);
    setGoal(limitedValue);
    setGoalInput(limitedValue.toString());
    
    // Revalidar após aplicar o valor limitado
    const validation = validateGoal(limitedValue);
    setGoalValidation(validation);
  };
  
  const handleStopLossBlur = () => {
    const value = parseInt(stopLossInput) || 50; // Default para 50 se vazio
    const limitedValue = Math.min(Math.max(value, 50), 50000);
    setStopLoss(limitedValue);
    setStopLossInput(limitedValue.toString());
    
    // Revalidar após aplicar o valor limitado
    const validation = validateStopLoss(limitedValue);
    setStopLossValidation(validation);
  };

  // Renderiza o status da operação atual (resultado de operações finalizadas)
  const renderOperationStatus = () => {
    if (shouldHideControls) {
      return null;
    }
    
    if (isCreatingTrade || tradeSuccess !== null) {
      return (
        <div className={`p-3 rounded-md ${
          isCreatingTrade ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
          tradeSuccess ? 'bg-green-500 bg-opacity-20 text-green-500' :
          'bg-red-500 bg-opacity-20 text-red-500'
        }`}>
          <div className="flex items-center">
            {isCreatingTrade ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : tradeSuccess ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <span>{tradeMessage}</span>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Renderiza o status da operação em andamento com UI melhorada
  const renderActiveOperationStatus = () => {
    if (shouldHideControls) {
      // Lógica para o novo componente unificado de Goal/Stop Loss
      const netResult = progress.totalGains - progress.totalLosses;
      const isProfit = netResult >= 0;
      
      const mainLabel = isProfit ? 'Goal' : 'Stop Loss';
      const mainTarget = isProfit ? goal : stopLoss;
      const mainProgressValue = isProfit ? netResult : Math.abs(netResult);
      const mainProgressPercent = mainTarget > 0 ? Math.min(100, (mainProgressValue / mainTarget) * 100) : 0;
      const mainColorClass = isProfit ? 'text-green-400' : 'text-red-400';
      const mainBgClass = isProfit ? 'bg-green-500' : 'bg-red-500';
      
      const secondaryLabel = isProfit ? 'Stop Loss' : 'Goal';
      const secondaryTarget = isProfit ? stopLoss : goal;

      return (
        <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-lg border border-zinc-700 shadow-lg mb-6 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, rgba(74, 222, 128, 0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          {/* Pulse animation in background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/5 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-medium text-white inline-flex items-center">
                <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                  <div className="absolute w-full h-full bg-green-500 rounded-full animate-ping opacity-75"></div>
                  <Activity className="relative w-4 h-4 text-green-400" />
                </div>
                Operação em andamento
              </h3>
            </div>

            {/* Informação da IA (destacada) */}
            <div className="bg-blue-900/30 border border-blue-500/30 p-3 rounded-lg text-center mb-4 animate-pulse" style={{ animationDuration: '2s' }}>
              <div className="flex items-center justify-center">
                <BrainCircuit className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  <span>Operando com:</span>
                  <strong className="block text-white font-semibold">{aiModel}</strong>
                </div>
              </div>
            </div>
            
            {/* Informações em uma coluna única */}
            <div className="space-y-3 mb-6">
              {/* Estratégia e Valor (juntos) */}
              <div className="flex gap-3">
                <div className="bg-zinc-900/80 p-4 rounded-lg flex items-center flex-1">
                  <BarChart3 className="h-6 w-6 text-purple-400 mr-3 flex-shrink-0" />
                  <div className="flex flex-col">
                    <div className="text-xs text-gray-400">Estratégia</div>
                    <div className="text-white font-medium">{strategy}</div>
                  </div>
                </div>
                <div className="bg-zinc-900/80 p-4 rounded-lg flex items-center">
                  <div className="flex flex-col">
                    <div className="text-xs text-gray-400">Valor</div>
                    <div className="text-white font-medium">R${entryValue}</div>
                  </div>
                </div>
              </div>
              
              {/* Novo componente unificado de Goal/Stop Loss */}
              <div className="bg-zinc-900/80 p-4 rounded-lg">
                <div className="text-center mb-3">
                  <div className="text-xs text-gray-400">Resultado Atual</div>
                  <div className={`text-2xl font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                    {isProfit ? '+' : ''}R${netResult.toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className={`font-medium ${mainColorClass}`}>
                    {mainLabel}
                  </span>
                  <span className="text-gray-400">
                    {isProfit ? `Meta: R$${mainTarget}` : `Limite: R$${mainTarget}`}
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${mainBgClass}`}
                    style={{ width: `${mainProgressPercent}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-gray-500 mt-1">
                  {secondaryLabel}: R${secondaryTarget}
                </div>
              </div>
            </div>
            
            {/* Mensagem de operação cancelada ou botão de cancelar */}
            {isCancelled ? (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-center">
                <div className="flex items-center justify-center text-red-400">
                  <XCircle className="w-5 h-5 mr-2" />
                  <span>Operação cancelada.</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCancelOperation}
                className="w-full py-2.5 px-4 bg-zinc-900 border border-red-500/30 hover:bg-red-500/10 text-red-500 rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                <XSquare className="w-4 h-4" />
                <span>Cancelar operação</span>
              </button>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-2">
      {/* Modal de Análise de IA */}
      <AIAnalysisModal 
        isOpen={showAiAnalysisModal}
        aiModel={aiModel}
        assetName={selectedAsset?.name || 'ativo selecionado'}
        onComplete={handleCompleteAnalysis}
      />
      
      {/* Modal de Ativos Recomendados */}
      <RecommendedAssetsModal
        isOpen={showRecommendedAssetsModal}
        onClose={() => setShowRecommendedAssetsModal(false)}
        onSelectAsset={handleSelectRecommendedAsset}
      />
      
      {/* Modal de Resumo de Trading */}
      <TradingSummaryModal
        isOpen={showTradingSummary}
        summary={tradingSummary}
        onClose={() => setShowTradingSummary(false)}
      />
      
      {/* Feedback de operação (apenas quando não há operação ativa) */}
      {renderOperationStatus()}
      
      {/* Status de operação ativa */}
      {renderActiveOperationStatus()}
      
      {/* Artificial Intelligence - Com novo destaque */}
      {!shouldHideControls && (
        <div className="relative" ref={aiDropdownRef}>
          <div 
            className={`bg-zinc-900 p-2.5 rounded-lg flex items-center border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer`}
            onClick={() => {
              setShowAiDropdown(!showAiDropdown);
              setShowStrategyDropdown(false);
            }}
          >
            <div className="flex-1">
              <div className="text-xs mb-0.5 flex items-center text-blue-400">
                <BrainCircuit className="w-4 h-4 mr-1.5 animate-pulse" />
                <span>Artificial Intelligence</span>
              </div>
              <div className="text-white font-bold text-sm">{aiModel}</div>
            </div>
            <ChevronDown className="text-gray-400" />
          </div>

          {showAiDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-zinc-900 rounded-md shadow-lg max-h-60 overflow-auto border border-zinc-700">
              {aiModels.map((model) => (
                <div 
                  key={model} 
                  className="px-4 py-3 text-sm text-white hover:bg-zinc-800 cursor-pointer"
                  onClick={() => {
                    setAiModel(model);
                    setShowAiDropdown(false);
                  }}
                >
                  {model}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strategy */}
      {!shouldHideControls && (
        <div className="relative" ref={strategyDropdownRef}>
          <div 
            className="bg-zinc-800 p-2 rounded-md cursor-pointer flex items-center"
            onClick={() => {
              setShowStrategyDropdown(!showStrategyDropdown);
              setShowAiDropdown(false);
            }}
          >
            <div className="flex-1">
              <div className="text-gray-400 text-xs mb-0.5">
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                  </svg>
                  Strategy
                </div>
              </div>
              <div className="text-white text-sm">{strategy}</div>
            </div>
            <ChevronDown className="text-gray-400" />
          </div>

          {showStrategyDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-zinc-900 rounded-md shadow-lg">
              {strategies.map((strat) => (
                <div 
                  key={strat} 
                  className="px-4 py-3 text-sm text-white hover:bg-zinc-800 cursor-pointer"
                  onClick={() => {
                    setStrategy(strat);
                    setShowStrategyDropdown(false);
                  }}
                >
                  {strat}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entry value - Apenas inteiros */}
      {!shouldHideControls && (
        <div className={`bg-zinc-800 p-2 rounded-md border-2 transition-colors ${
          !entryValueValidation.isValid ? 'border-red-500' : 'border-transparent'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <span className="text-gray-400 text-xs mr-1">$</span>
              <span className="text-gray-400 text-xs">Entry value</span>
              {!entryValueValidation.isValid && (
                <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
              )}
            </div>
            <Tooltip content="Mínimo: R$5 • Máximo: R$5.000 • Apenas valores inteiros">
              <Info className="h-4 w-4 text-gray-500 hover:text-gray-400 transition-colors" />
            </Tooltip>
          </div>
          <div className="flex items-center">
            <span className="text-white mr-2">R$</span>
            <input
              type="text"
              value={entryValueInput}
              onChange={handleEntryValueChange}
              onBlur={handleEntryValueBlur}
              className={`bg-transparent text-sm font-medium w-full focus:outline-none ${
                !entryValueValidation.isValid ? 'text-red-400' : 'text-white'
              }`}
              placeholder="5"
            />
          </div>
          {!entryValueValidation.isValid && (
            <div className="mt-2 text-red-400 text-xs flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {entryValueValidation.message}
            </div>
          )}
        </div>
      )}

      {/* Goal - Apenas inteiros */}
      {!shouldHideControls && (
        <div className={`bg-zinc-800 p-2 rounded-md border-2 transition-colors ${
          !goalValidation.isValid ? 'border-red-500' : 'border-transparent'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-400 text-xs">Goal</span>
              {!goalValidation.isValid && (
                <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
              )}
            </div>
            <Tooltip content="Mínimo: R$50 • Máximo: R$50.000 • Apenas valores inteiros">
              <Info className="h-4 w-4 text-gray-500 hover:text-gray-400 transition-colors" />
            </Tooltip>
          </div>
          <div className="flex items-center">
            <span className="text-white mr-2">R$</span>
            <input
              type="text"
              value={goalInput}
              onChange={handleGoalChange}
              onBlur={handleGoalBlur}
              className={`bg-transparent text-sm font-medium w-full focus:outline-none ${
                !goalValidation.isValid ? 'text-red-400' : 'text-white'
              }`}
              placeholder="50"
            />
          </div>
          {!goalValidation.isValid && (
            <div className="mt-2 text-red-400 text-xs flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {goalValidation.message}
            </div>
          )}
        </div>
      )}

      {/* Stop loss - Apenas inteiros */}
      {!shouldHideControls && (
        <div className={`bg-zinc-800 p-2 rounded-md border-2 transition-colors ${
          !stopLossValidation.isValid ? 'border-red-500' : 'border-transparent'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-gray-400 text-xs">Stop loss</span>
              {!stopLossValidation.isValid && (
                <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
              )}
            </div>
            <Tooltip content="Mínimo: R$50 • Máximo: R$50.000 • Apenas valores inteiros">
              <Info className="h-4 w-4 text-gray-500 hover:text-gray-400 transition-colors" />
            </Tooltip>
          </div>
          <div className="flex items-center">
            <span className="text-white mr-2">R$</span>
            <input
              type="text"
              value={stopLossInput}
              onChange={handleStopLossChange}
              onBlur={handleStopLossBlur}
              className={`bg-transparent text-sm font-medium w-full focus:outline-none ${
                !stopLossValidation.isValid ? 'text-red-400' : 'text-white'
              }`}
              placeholder="50"
            />
          </div>
          {!stopLossValidation.isValid && (
            <div className="mt-2 text-red-400 text-xs flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {goalValidation.message}
            </div>
          )}
        </div>
      )}

      {/* Start Button - Ocultado durante operação ativa */}
      {!shouldHideControls && (
        <button 
          className={`w-full font-bold py-2 rounded-md flex items-center justify-center gap-2 mt-3 transition-all ${
            areAllValuesValid && !isCreatingTrade && !isOperationInProgress && !isProcessingOperation.current
              ? 'bg-green-500 hover:bg-green-600 text-black cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-75'
          }`}
          onClick={handleStartAnalysis}
          disabled={!areAllValuesValid || isCreatingTrade || isOperationInProgress || showAiAnalysisModal || isProcessingOperation.current}
        >
          {isCreatingTrade ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Criando operação...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>START</span>
            </>
          )}
        </button>
      )}

      {/* Recommended Assets - Oculto durante operação */}
      {!shouldHideControls && (
        <button 
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2 py-3 rounded-md"
          onClick={() => setShowRecommendedAssetsModal(true)}
        >
          <Star className="h-5 w-5 text-amber-500" />
          ATIVOS RECOMENDADOS
        </button>
      )}
    </div>
  );
}