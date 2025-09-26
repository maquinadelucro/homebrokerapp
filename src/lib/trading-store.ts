import { create } from 'zustand';
import { tradingApi } from './api';
import { Asset, TimeFrame, AIModel, Strategy, TradeConfig, TradeResult, CandleData, ApiCandleData, TradingOperation, ChartMarker } from './types';
import { isAssetOpenForTrading } from './utils';
import { getPusherService } from './pusher-service';
import { debugLog, errorLog } from './utils/security';

interface TradingState {
  assets: Asset[];
  selectedAsset: Asset | null;
  timeFrames: { [key: string]: TimeFrame[] };
  selectedTimeFrame: TimeFrame | null;
  aiModels: AIModel[];
  selectedAIModel: AIModel | null;
  strategies: Strategy[];
  selectedStrategy: Strategy | null;
  isLoading: boolean;
  error: string | null;
  tradeConfig: TradeConfig;
  isTrading: boolean;
  tradeResults: TradeResult[];
  
  // Dados do gráfico
  chartData: CandleData[];
  chartMarkers: ChartMarker[]; // Marcadores para operações no gráfico
  isLoadingChart: boolean;
  chartError: string | null;
  
  // WebSocket e dados em tempo real
  isWebSocketConnected: boolean;
  lastRealTimeUpdate: ApiCandleData | null;
  
  // Operações de trading
  operations: TradingOperation[];
  
  // Dados para acumular preços para velas de 30 segundos
  currentCandleData: {
    timeStart: number;
    prices: number[];
    high: number;
    low: number;
    open: number;
    assetSymbol: string;
  } | null;
  
  // Saldo do usuário
  userBalance: number | null;
  loadingBalance: boolean;
  balanceError: string | null;
  
  // Último resultado de operação
  lastTradeResult: {
    operationId: string;
    status: string;
    message?: string;
    amount?: number;
    profit?: number;
    isWin: boolean;
  } | null;
  
  // Ações
  fetchAssets: () => Promise<void>;
  selectAsset: (assetId: string) => void;
  selectTimeFrame: (timeFrame: TimeFrame) => void;
  updateTradeConfig: (config: Partial<TradeConfig>) => void;
  startTrading: () => void;
  stopTrading: () => void;
  
  // Ações para o gráfico
  fetchChartData: () => Promise<void>;
  
  // Ações para Pusher
  connectToPusher: () => Promise<void>;
  disconnectFromPusher: () => void;
  subscribeToAssetUpdates: (assetSymbol: string) => void;
  unsubscribeFromAssetUpdates: (assetSymbol: string) => void;
  subscribeToUserEvents: (userId: string) => void;
  
  // Método para processar dados em tempo real
  processRealTimeUpdate: (assetSymbol: string, data: any) => void;
  
  // Métodos para gerenciar operações de trading
  addOperation: (operation: Omit<TradingOperation, 'status' | 'result' | 'userId'>) => void;
  updateOperationStatus: (operationId: string, status: TradingOperation['status'], result?: number) => void;
  getActiveOperations: () => TradingOperation[];
  getUserOperations: () => TradingOperation[]; // NOVO: Filtrar operações por usuário
  clearOperations: () => void; // NOVO: Limpar operações ao trocar usuário
  processTradeOperationResult: (data: any) => void;
  processBalanceUpdate: (data: any) => void;
  
  // Ações para o saldo
  fetchUserBalance: () => Promise<void>;
  updateUserBalance: (newBalance: number) => void;
  
  // Métodos para martingale
  createMartingaleOperation: (failedOperationId: string) => Promise<boolean>;
  getMartingaleGroupOperations: (operationId: string) => TradingOperation[];
  isMartingaleEnabled: boolean;
  toggleMartingaleEnabled: () => void;
  isCreatingGale: boolean;
  
  // Polling de operações
  operationPollingInterval: NodeJS.Timeout | null;
  isPolling: boolean;
  checkOperationStatus: (operationId: string) => Promise<any>;
  pollPendingOperations: () => Promise<void>;
  startOperationPolling: () => void;
  stopOperationPolling: () => void;
}

// Verificar se um ativo é OTC baseado no símbolo
const isOtcAsset = (assetSymbol: string): boolean => {
  // Símbolos OTC geralmente têm o sufixo "-OTC"
  return assetSymbol.includes('-OTC');
};

// Função auxiliar para converter timeFrame para timespan e multiple
const parseTimeFrame = (timeFrame: string): { timespan: string; multiple: number } => {
  if (!timeFrame) {
    return { timespan: 'seconds', multiple: 30 }; // Valor padrão
  }
  
  // Formato pode ser: "30s", "1m", "5m", "1h", etc.
  const match = timeFrame.match(/^(\d+)([smhd])$/);
  if (!match) {
    return { timespan: 'seconds', multiple: 30 }; // Valor padrão
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return { timespan: 'seconds', multiple: value };
    case 'm':
      return { timespan: 'minutes', multiple: value };
    case 'h':
      return { timespan: 'hour', multiple: value };
    case 'd':
      return { timespan: 'day', multiple: value };
    default:
      return { timespan: 'seconds', multiple: 30 };
  }
};

// Função para converter dados da API para o formato do gráfico
const convertApiDataToChartFormat = (apiData: ApiCandleData[]): CandleData[] => {
  return apiData.map(item => {
    // Converter a string de data para timestamp em segundos (necessário para a biblioteca de gráficos)
    const timestamp = Math.floor(new Date(item.time_stamp).getTime() / 1000);
    
    return {
      time: timestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    };
  });
};

// Converte um único dado de vela da API para o formato do gráfico
const convertSingleCandleToChartFormat = (apiCandle: ApiCandleData): CandleData => {
  return {
    time: Math.floor(new Date(apiCandle.time_stamp).getTime() / 1000),
    open: apiCandle.open,
    high: apiCandle.high,
    low: apiCandle.low,
    close: apiCandle.close
  };
};

// Função para obter o menor tempo disponível em segundos para um ativo
const getMinTradeTime = (betTimeOptions: number[] | undefined): number => {
  if (!betTimeOptions || !Array.isArray(betTimeOptions) || betTimeOptions.length === 0) {
    return Number.MAX_SAFE_INTEGER; // Se não tem opções, colocar no final da lista
  }
  return Math.min(...betTimeOptions);
};

// Função para ordenar timeframes em ordem crescente (do menor para o maior)
const sortTimeFrames = (timeFrames: TimeFrame[]): TimeFrame[] => {
  return [...timeFrames].sort((a, b) => {
    // Extrair o valor numérico e a unidade
    const matchA = a.match(/^(\d+)([smhd])$/);
    const matchB = b.match(/^(\d+)([smhd])$/);
    
    if (!matchA || !matchB) return 0;
    
    const valueA = parseInt(matchA[1], 10);
    const unitA = matchA[2];
    const valueB = parseInt(matchB[1], 10);
    const unitB = matchB[2];
    
    // Converter tudo para segundos para comparação
    const getSecondsValue = (value: number, unit: string): number => {
      switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 24 * 60 * 60;
        default: return value;
      }
    };
    
    const secondsA = getSecondsValue(valueA, unitA);
    const secondsB = getSecondsValue(valueB, unitB);
    
    return secondsA - secondsB;
  });
};

// Intervalo em segundos para cada vela
const CANDLE_INTERVAL = 30;

export const useTradingStore = create<TradingState>((set, get) => ({
  // Estado inicial - arrays vazios e null para estado não inicializado
  assets: [],
  selectedAsset: null,
  timeFrames: {},
  selectedTimeFrame: null,
  chartData: [],
  chartMarkers: [], // Inicializa os marcadores vazios
  isLoadingChart: false,
  chartError: null,
  isWebSocketConnected: false,
  lastRealTimeUpdate: null,
  currentCandleData: null, // Dados para a vela atual em construção
  operations: [], // Início vazio - operações serão carregadas por usuário
  
  // Saldo do usuário
  userBalance: null,
  loadingBalance: false,
  balanceError: null,
  
  // Último resultado de operação
  lastTradeResult: null,
  
  // Estado para martingale
  isMartingaleEnabled: true, // Inicialmente ativado
  isCreatingGale: false, // Trava para criação de gales
  
  // Estado para polling de operações
  operationPollingInterval: null,
  isPolling: false,
  
  // Lista atualizada de modelos de IA
  aiModels: [
    { id: 'ai1', name: 'ChatGPT 5.0 (OpenAI)' },
    { id: 'ai2', name: 'Claude 3.0 Opus (Anthropic)' },
    { id: 'ai3', name: 'Gemini Ultra 1.5 (Google)' },
    { id: 'ai4', name: 'Llama 3 70B (Meta)' },
    { id: 'ai5', name: 'Titan v2 (Amazon)' }
  ],
  selectedAIModel: null,
  
  strategies: [
    { id: 'strategy1', name: 'Conservative' },
    { id: 'strategy2', name: 'Balanced' },
    { id: 'strategy3', name: 'Aggressive' }
  ],
  selectedStrategy: null,
  
  isLoading: false,
  error: null,
  
  tradeConfig: {
    aiModel: 'ai1',
    strategy: 'strategy2',
    entryValue: 100,
    goal: 500,
    stopLoss: 50
  },
  
  isTrading: false,
  tradeResults: [],
  
  // Método para processar os resultados de operações de trading recebidos do WebSocket
  processTradeOperationResult: (data) => {
    if (!data || !data.id) {
      return;
    }

    const operationId = data.id;
    const operation = get().operations.find(op => op.id === operationId);

    if (!operation || operation.status !== 'pending') {
      return;
    }

    // CORREÇÃO: Usar 'Gain' para vitória e 'Loss' para derrota
    const status = data.result === 'Gain' ? 'win' : 'loss';
    const profit = data.profit_usd_cents / 100; // Convertendo de centavos para reais

    // Atualizar o status da operação
    get().updateOperationStatus(operationId, status, profit);

    // Atualizar a UI com o resultado
    set({
      lastTradeResult: {
        operationId: operationId,
        status: status,
        message: status === 'win' 
          ? 'Operação finalizada com ganho!' 
          : 'Operação finalizada com perda.',
        amount: operation.amount,
        profit: profit,
        isWin: status === 'win'
      }
    });

    // Buscar saldo atualizado após finalizar operação
    (async () => {
      try {
        debugLog('🔄 Operação finalizada, atualizando saldo...');
        await get().fetchUserBalance();
        debugLog('✅ Saldo atualizado após finalização da operação');
      } catch (balanceError) {
        errorLog('⚠️ Falha ao atualizar saldo após finalização:', balanceError);
      }
    })();

    // Lógica de Martingale
    if (status === 'loss' && get().isMartingaleEnabled) {
      get().createMartingaleOperation(operationId);
    }
  },
  
  // Método para criar uma operação martingale baseada em uma operação que falhou
  createMartingaleOperation: async (failedOperationId: string): Promise<boolean> => {
    // Ativar a trava para impedir chamadas duplicadas
    if (get().isCreatingGale) {
      return false;
    }

    try {
      set({ isCreatingGale: true });

      const operations = get().operations;
      const failedOperation = operations.find(op => op.id === failedOperationId);
      
      if (!failedOperation) {
        return false;
      }
      
      let martingaleLevel = 1;
      let mainOperationId = failedOperationId;
      
      if (failedOperation.isMartingale) {
        martingaleLevel = (failedOperation.martingaleLevel || 1) + 1;
        mainOperationId = failedOperation.mainOperationId || failedOperationId;
      }
      
      if (martingaleLevel > 2) {
        return false;
      }
      
      const existingPendingGale = operations.find(op => 
          op.mainOperationId === mainOperationId &&
          op.martingaleLevel === martingaleLevel &&
          op.status === 'pending'
      );

      if (existingPendingGale) {
          return false;
      }
      
      const mainOperation = failedOperation.isMartingale 
        ? operations.find(op => op.id === mainOperationId) 
        : failedOperation;
      
      if (!mainOperation) {
        return false;
      }
      
      const entryValue = failedOperation.amount * 2;
      
      const currentPrice = get().lastRealTimeUpdate?.close || failedOperation.entryPrice;
      const durationMs = failedOperation.duration;
      const martingaleId = `${failedOperationId}_gale${martingaleLevel}`;
      
      const tradeParams = {
        symbol: failedOperation.symbol,
        direction: failedOperation.direction,
        betValue: entryValue,
        durationMilliseconds: durationMs,
        accountType: 'real' as const
      };
      
      const result = await tradingApi.createTrade(tradeParams);
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      const userId = localStorage.getItem('user_id') || '';
      
      const martingaleOperation: Omit<TradingOperation, 'status' | 'result'> = {
        id: result.id || martingaleId,
        symbol: failedOperation.symbol,
        direction: failedOperation.direction,
        entryPrice: currentPrice,
        entryTime: currentTime,
        duration: durationMs,
        expiryTime: currentTime + Math.floor(durationMs / 1000),
        amount: entryValue,
        isMartingale: true,
        martingaleLevel: martingaleLevel,
        mainOperationId: mainOperationId,
        userId: userId
      };
      
      get().addOperation(martingaleOperation);
      
      set(state => {
        const updatedOperations = state.operations.map(op => {
          if (op.id === mainOperationId) {
            const currentMartingaleOperations = op.martingaleOperations || [];
            return {
              ...op,
              martingaleOperations: [...currentMartingaleOperations, martingaleOperation.id]
            };
          }
          return op;
        });
        return { operations: updatedOperations };
      });
      
      return true;
      
    } catch (error) {
      return false;
    } finally {
      // Liberar a trava
      set({ isCreatingGale: false });
    }
  },
  
  // Método para obter todas as operações de um grupo martingale
  getMartingaleGroupOperations: (operationId: string) => {
    const operations = get().operations;
    const operation = operations.find(op => op.id === operationId);
    
    if (!operation) return [];
    
    // Se for um martingale, encontrar a operação principal
    if (operation.isMartingale && operation.mainOperationId) {
      const mainOperationId = operation.mainOperationId;
      const mainOperation = operations.find(op => op.id === mainOperationId);
      
      if (!mainOperation) return [operation];
      
      // Encontrar todos os martingales associados
      const martingaleOperations = operations.filter(op => 
        op.mainOperationId === mainOperationId || op.id === mainOperationId
      );
      
      return martingaleOperations;
    }
    
    // Se for a operação principal, encontrar todos os martingales associados
    const martingaleOperations = operations.filter(op => 
      op.mainOperationId === operationId || op.id === operationId
    );
    
    return martingaleOperations;
  },
  
  // Alternar ativação/desativação do martingale
  toggleMartingaleEnabled: () => {
    set(state => ({ isMartingaleEnabled: !state.isMartingaleEnabled }));
  },
  
  // Método para processar eventos de alteração de saldo (apenas saldo real)
  processBalanceUpdate: (data) => {
    let newBalance: number | null = null;

    if (data) {
      // Formato 1: {"message":{"balance":...}} - saldo real em centavos
      if (data.message && typeof data.message === 'object' && data.message.balance !== undefined) {
        const balanceInCents = Number(data.message.balance);
        if (!isNaN(balanceInCents)) {
          newBalance = balanceInCents / 100; // Converter de centavos para reais
        }
      }
      // Formato 2: { balance: number } - saldo real em centavos
      else if (data.balance !== undefined) {
        const balanceInCents = Number(data.balance);
        if (!isNaN(balanceInCents)) {
          newBalance = balanceInCents / 100;
        }
      }
      // Formato 3: Estrutura legacy com real: { balance: number }
      else if (data.real && data.real.balance !== undefined) {
        const balanceInCents = Number(data.real.balance);
        if (!isNaN(balanceInCents)) {
          newBalance = balanceInCents / 100;
        }
      }
    }

    if (newBalance !== null) {
      get().updateUserBalance(newBalance);
    }
  },
  
  // Atualizar o saldo do usuário
  updateUserBalance: (newBalance) => {
    // Se o saldo for o mesmo, não atualizar
    if (get().userBalance === newBalance) {
      return;
    }
    
    // Atualizar o saldo
    set({ userBalance: newBalance });
    
    // Tentar salvar o saldo no localStorage para persistência (opcional)
    try {
      localStorage.setItem('user_balance', newBalance.toString());
    } catch (e) {
      // silent
    }
  },
  
  // Buscar o saldo atual do usuário (apenas saldo real)
  fetchUserBalance: async () => {
    set({ loadingBalance: true, balanceError: null });
    
    try {
      // Verificar se há token de autenticação
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Usuário não está logado');
      }
      
      // Buscar saldo da API (agora retorna apenas saldo real)
      const response = await tradingApi.getBalance();
      
      // A API agora retorna apenas o saldo real no formato: { balance: number, currency: string, id: number }
      if (response && response.balance !== undefined) {
        // O saldo já vem convertido em reais da API
        const balanceInReais = response.balance;
        
        set({ userBalance: balanceInReais, loadingBalance: false });
        return;
      }
      
      // Se não encontrou o saldo no formato esperado
      throw new Error('Saldo real não encontrado na resposta da API');
      
    } catch (error) {
      set({
        loadingBalance: false,
        balanceError: error instanceof Error ? error.message : 'Falha ao obter saldo'
      });
    }
  },
  
  // Método para se inscrever em eventos do usuário
  subscribeToUserEvents: (userId: string)=> {
    if (!userId) {
      return;
    }
    
    const pusherService = getPusherService();
    
    // Inscrever-se no canal do usuário
    pusherService.subscribeToUserChannel(userId);
    
    // Registrar handler para eventos de operações de trading
    pusherService.addSpecialEventHandler('trade-operation', (data) => {
      get().processTradeOperationResult(data);
    });
    
    // Registrar handler para eventos de alteração de saldo
    pusherService.addSpecialEventHandler('change-balance', (data) => {
      // Agora processamos a atualização do saldo
      get().processBalanceUpdate(data);
    });
    
    // Registrar handler global para qualquer evento que possa estar relacionado ao saldo
    pusherService.addGlobalMessageHandler((type, data) => {
      if (type === 'change-balance' || type.includes('balance')) {
        get().processBalanceUpdate(data);
      }
    });
  },
  
  // Método para adicionar uma nova operação
  addOperation: (operation) => {
    // Obter userId do localStorage para isolamento de usuário
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      errorLog('❌ Erro: Usuário não está logado');
      return;
    }
    
    const timestamp = operation.entryTime;
    const expiryTime = operation.entryTime + Math.floor(operation.duration / 1000);
    
    // Definir cores específicas para operações martingale
    let color = operation.direction === 'up' ? '#00FF00' : '#FF0000';
    let text = operation.direction === 'up' ? '⬆️' : '⬇️';
    
    // Se for uma operação martingale, usar cores diferentes
    if (operation.isMartingale) {
      // Martingale nível 1: usar laranja
      if (operation.martingaleLevel === 1) {
        color = operation.direction === 'up' ? '#FFA500' : '#FF8C00'; // Laranja
        text = operation.direction === 'up' ? '⬆️ G1' : '⬇️ G1'; // Indicar gale 1
      } 
      // Martingale nível 2: usar roxo
      else if (operation.martingaleLevel === 2) {
        color = operation.direction === 'up' ? '#9932CC' : '#8B008B'; // Roxo
        text = operation.direction === 'up' ? '⬆️ G2' : '⬇️ G2'; // Indicar gale 2
      }
    }
    
    // Criar a operação com status inicial 'pending' e userId
    const newOperation: TradingOperation = {
      ...operation,
      userId, // NOVO: Adicionar userId para isolamento
      status: 'pending',
      expiryTime: expiryTime
    };
    
    // Criar um marcador para o ponto de entrada da operação
    const entryMarker: ChartMarker = {
      time: timestamp,
      position: 'aboveBar',
      color: color,
      shape: operation.direction === 'up' ? 'arrow_up' : 'arrow_down',
      text: `${text} R$${operation.amount.toFixed(2)}`,
      operationId: operation.id,
      size: 3
    };
    
    // Criar um marcador para o ponto de expiração da operação
    const expiryMarker: ChartMarker = {
      time: expiryTime,
      position: 'aboveBar',
      color: '#FFFF00', // Amarelo para expiração
      shape: 'circle',
      text: '⏱️',
      operationId: operation.id,
      size: 2
    };
    
    // Atualizar o estado com a nova operação e marcadores
    set(state => {
      // Combinar os novos marcadores com os existentes e ordenar por tempo
      const newMarkers = [...state.chartMarkers, entryMarker, expiryMarker];
      
      // Ordenar todos os marcadores por tempo em ordem crescente
      newMarkers.sort((a, b) => a.time - b.time);
      
      return {
        operations: [...state.operations, newOperation],
        chartMarkers: newMarkers
      };
    });
    
    // Tentar buscar no localStorage o ID do usuário para inscrever nos eventos
    try {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        get().subscribeToUserEvents(userId);
      }
    } catch (e) {
      // silent
    }
  },
  
  // Método para atualizar o status de uma operação
  updateOperationStatus: (operationId, status, result) => {
    // Atualizar a operação
    set(state => {
      const updatedOperations = state.operations.map(op => {
        if (op.id === operationId) {
          return { ...op, status, result };
        }
        return op;
      });
      
      // Atualizar o marcador de expiração para refletir o resultado
      const updatedMarkers = state.chartMarkers.map(marker => {
        if (marker.operationId === operationId && marker.shape === 'circle') {
          // Atualizar o marcador de expiração
          return {
            ...marker,
            color: status === 'win' ? '#00FF00' : status === 'loss' ? '#FF0000' : '#FFFF00',
            text: status === 'win' ? '✅' : status === 'loss' ? '❌' : '⏱️',
            size: 3,
            position: 'aboveBar' as const
          };
        }
        return marker;
      });
      
      // Verificar se a ordem dos marcadores foi alterada e re-ordenar se necessário
      const sortedMarkers = [...updatedMarkers].sort((a, b) => a.time - b.time);
      
      return { 
        operations: updatedOperations, 
        chartMarkers: sortedMarkers 
      };
    });
  },
  
  // Método para obter operações ativas
  getActiveOperations: () => {
    return get().operations.filter(op => op.status === 'pending');
  },
  
  // NOVO: Método para obter operações do usuário atual (isolamento)
  getUserOperations: () => {
    try {
      // Verificar se estamos no client-side antes de acessar localStorage
      if (typeof window === 'undefined') {
        return []; // Server-side: retornar array vazio
      }
      
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        debugLog('⚠️ UserId não encontrado - retornando array vazio');
        return [];
      }
      
      const userOps = get().operations.filter(op => op.userId === userId);
      debugLog(`🔍 Operações do usuário ${userId}:`, userOps.length);
      return userOps;
    } catch (error) {
      errorLog('❌ Erro ao obter operações do usuário:', error);
      return [];
    }
  },
  
  // NOVO: Limpar operações ao trocar usuário
  clearOperations: () => {
    debugLog('🧹 Limpando operações e marcadores');
    set({
      operations: [],
      chartMarkers: []
    });
  },
  
  // Conectar ao Pusher para OTC WebSocket e Regular WebSocket
  connectToPusher: async () => {
    try {
      debugLog('🔌 Iniciando conexão com Pusher WebSockets...');
      const pusherService = getPusherService();
      
      // Conectar a ambos WebSockets
      await pusherService.connect('all');
      
      debugLog('✅ Conexão Pusher estabelecida com sucesso');
      
      // Atualizar estado de conexão
      set({ isWebSocketConnected: pusherService.isConnectedStatus });
      
      // Se já tiver um ativo selecionado, inscrever-se para atualizações em tempo real
      const selectedAsset = get().selectedAsset;
      if (selectedAsset) {
        get().subscribeToAssetUpdates(selectedAsset.symbol);
      }
      
      // Tentar inscrever-se nos eventos do usuário se temos o ID
      try {
        const userId = localStorage.getItem('user_id');
        if (userId) {
          debugLog('👤 Inscrevendo-se em eventos do usuário:', userId);
          get().subscribeToUserEvents(userId);
        }
      } catch (e) {
        debugLog('⚠️ Falha ao inscrever em eventos do usuário:', e);
      }
      
      // Iniciar polling automático de operações
      get().startOperationPolling();
    } catch (error) {
      errorLog('❌ Falha na conexão Pusher:', error);
      // Tentar reconectar após um tempo
      setTimeout(() => {
        debugLog('🔄 Tentativa de reconexão Pusher...');
        get().connectToPusher();
      }, 5000);
    }
  },
  
  // Desconectar do Pusher
  disconnectFromPusher: () => {
    const selectedAsset = get().selectedAsset;
    if (selectedAsset) {
      get().unsubscribeFromAssetUpdates(selectedAsset.symbol);
    }
    getPusherService().disconnect();
    set({ isWebSocketConnected: false });
    // Parar polling de operações
    get().stopOperationPolling();
  },
  
  // Processar atualizações em tempo real recebidas do Pusher
  processRealTimeUpdate: (assetSymbol: string, data: any) => {
    const state = get();
    if (state.isLoadingChart || !state.selectedAsset || state.selectedAsset.symbol !== assetSymbol) {
      return;
    }

    if (!data || typeof data !== 'object' || data.price === undefined) {
      return;
    }

    const price = parseFloat(data.price);
    const askPrice = data.ask_price !== undefined ? parseFloat(data.ask_price) : price;
    const bidPrice = data.bid_price !== undefined ? parseFloat(data.bid_price) : price;

    if (isNaN(price)) {
      return;
    }

    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const intervalStart = Math.floor(currentTimeInSeconds / CANDLE_INTERVAL) * CANDLE_INTERVAL;

    let candleAccumulator = state.currentCandleData;

    if (!candleAccumulator || candleAccumulator.timeStart !== intervalStart || candleAccumulator.assetSymbol !== assetSymbol) {
      const lastCandleInChart = state.chartData.find(c => c.time === intervalStart);
      
      if (lastCandleInChart) {
        candleAccumulator = {
          timeStart: intervalStart,
          prices: [lastCandleInChart.close, price],
          high: Math.max(lastCandleInChart.high, price, askPrice),
          low: Math.min(lastCandleInChart.low, price, bidPrice),
          open: lastCandleInChart.open,
          assetSymbol: assetSymbol,
        };
      } else {
        candleAccumulator = {
          timeStart: intervalStart,
          prices: [price],
          high: Math.max(price, askPrice),
          low: Math.min(price, bidPrice),
          open: price,
          assetSymbol: assetSymbol,
        };
      }
    } else {
      candleAccumulator = {
        ...candleAccumulator,
        prices: [...candleAccumulator.prices, price],
        high: Math.max(candleAccumulator.high, price, askPrice),
        low: Math.min(candleAccumulator.low, price, bidPrice),
      };
    }

    set(currentState => {
      const newChartData = [...currentState.chartData];
      const candleForChart: CandleData = {
        time: candleAccumulator.timeStart,
        open: candleAccumulator.open,
        high: candleAccumulator.high,
        low: candleAccumulator.low,
        close: price,
      };

      const existingIndex = newChartData.findIndex(c => c.time === candleForChart.time);
      if (existingIndex !== -1) {
        newChartData[existingIndex] = candleForChart;
      } else {
        newChartData.push(candleForChart);
        newChartData.sort((a, b) => a.time - b.time);
      }

      if (newChartData.length > 300) newChartData.shift();

      return {
        chartData: newChartData,
        currentCandleData: candleAccumulator,
        lastRealTimeUpdate: {
          time_stamp: new Date().toISOString(),
          symbol: assetSymbol,
          open: candleAccumulator.open,
          close: price,
          high: candleAccumulator.high,
          low: candleAccumulator.low,
          volume: -1,
          count: -1,
        },
      };
    });
  },
  
  // Inscrever-se para atualizações em tempo real de um ativo
  subscribeToAssetUpdates: (assetSymbol: string) => {
    if (!assetSymbol) {
      return;
    }
    
    const pusherService = getPusherService();
    
    pusherService.subscribeToAsset(assetSymbol, (data) => {
      get().processRealTimeUpdate(assetSymbol, data);
    });
  },
  
  // Cancelar inscrição de atualizações em tempo real de um ativo
  unsubscribeFromAssetUpdates: (assetSymbol: string) => {
    if (!assetSymbol) return;
    
    getPusherService().unsubscribeFromAsset(assetSymbol);
  },
  
  // Ações
  fetchAssets: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Usuário não está logado');
      }
      
      const assetsData = await tradingApi.getAssets();
      
      if (!assetsData.results || !Array.isArray(assetsData.results)) {
        throw new Error('Formato de resposta inválido');
      }
      
      const assets: Asset[] = assetsData.results
        .filter((item: any) => item.is_active === true)
        .map((item: any) => {
          const tradingHours = {
            monday: { start: item.monday_period_start_time, end: item.monday_period_end_time, secondStart: item.monday_second_half_period_start_time, secondEnd: item.monday_second_half_period_end_time },
            tuesday: { start: item.tuesday_period_start_time, end: item.tuesday_period_end_time, secondStart: item.tuesday_second_half_period_start_time, secondEnd: item.tuesday_second_half_period_end_time },
            wednesday: { start: item.wednesday_period_start_time, end: item.wednesday_period_end_time, secondStart: item.wednesday_second_half_period_start_time, secondEnd: item.wednesday_second_half_period_end_time },
            thursday: { start: item.thursday_period_start_time, end: item.thursday_period_end_time, secondStart: item.thursday_second_half_period_start_time, secondEnd: item.thursday_second_half_period_end_time },
            friday: { start: item.friday_period_start_time, end: item.friday_period_end_time, secondStart: item.friday_second_half_period_start_time, secondEnd: item.friday_second_half_period_end_time },
            saturday: { start: item.saturday_period_start_time, end: item.saturday_period_end_time, secondStart: item.saturday_second_half_period_start_time, secondEnd: item.saturday_second_half_period_end_time },
            sunday: { start: item.sunday_period_start_time, end: item.sunday_period_end_time, secondStart: item.sunday_second_half_period_start_time, secondEnd: item.sunday_second_half_period_end_time }
          };
          
          const asset: Asset = {
            id: item.id || item.symbol,
            symbol: item.symbol,
            name: item.name,
            price: 0,
            change: 0,
            logo: item.icon,
            market: item.market_name,
            profitPayout: item.profit_payout,
            minTradeValue: item.min_trade_value,
            maxTradeValue: item.max_trade_value,
            isActive: item.is_active,
            tradingHours: tradingHours
          };
          
          asset.isOpen = isAssetOpenForTrading(asset);
          return asset;
        });
      
      const timeFrames: { [key: string]: TimeFrame[] } = {};
      assetsData.results
        .filter((item: any) => item.is_active === true)
        .forEach((item: any) => {
          if (item.bet_time_seconds_options && Array.isArray(item.bet_time_seconds_options)) {
            const convertedTimeFrames = item.bet_time_seconds_options.map((seconds: number) => {
              if (seconds < 60) return `${seconds}s` as TimeFrame;
              else if (seconds < 3600) return `${Math.floor(seconds / 60)}m` as TimeFrame;
              else return `${Math.floor(seconds / 3600)}h` as TimeFrame;
            });
            timeFrames[item.id || item.symbol] = sortTimeFrames(convertedTimeFrames);
          }
        });
      
      if (assets.length === 0) {
        set({ isLoading: false, error: 'Nenhum ativo disponível no momento' });
        return;
      }
      
      const openAssets = assets.filter(asset => asset.isOpen);
      const sortedAssets = [...assets].sort((a, b) => {
        const assetAMin = getMinTradeTime(assetsData.results.find((item: any) => item.id === a.id || item.symbol === a.id)?.bet_time_seconds_options);
        const assetBMin = getMinTradeTime(assetsData.results.find((item: any) => item.id === b.id || item.symbol === b.id)?.bet_time_seconds_options);
        return assetAMin - assetBMin;
      });
      
      let initialAsset = get().selectedAsset;
      if (!initialAsset || !sortedAssets.find(a => a.id === initialAsset?.id)) {
        const sortedOpenAssets = [...openAssets].sort((a, b) => {
          const assetAMin = getMinTradeTime(assetsData.results.find((item: any) => item.id === a.id || item.symbol === a.id)?.bet_time_seconds_options);
          const assetBMin = getMinTradeTime(assetsData.results.find((item: any) => item.id === b.id || item.symbol === b.id)?.bet_time_seconds_options);
          return assetAMin - assetBMin;
        });
        initialAsset = sortedOpenAssets.length > 0 ? sortedOpenAssets[0] : (sortedAssets.length > 0 ? sortedAssets[0] : null);
      }
      
      set({ assets: sortedAssets, timeFrames, isLoading: false, selectedAsset: initialAsset });
      
      if (initialAsset && timeFrames[initialAsset.id]?.length > 0) {
        set({ selectedTimeFrame: timeFrames[initialAsset.id][0] });
      }
      
      if (initialAsset) {
        get().fetchChartData();
      }
      
      if (!get().isWebSocketConnected) {
        get().connectToPusher();
      } else if (initialAsset) {
        get().subscribeToAssetUpdates(initialAsset.symbol);
      }
      
      try {
        const userId = localStorage.getItem('user_id');
        if (userId) {
          get().subscribeToUserEvents(userId);
        }
      } catch (e) {
        // silent
      }
      
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Falha ao buscar ativos', assets: [] });
    }
  },
  
  selectAsset: (assetId: string) => {
    const currentAsset = get().selectedAsset;
    const asset = get().assets.find(a => a.id === assetId);
    
    if (asset) {
      if (currentAsset) {
        get().unsubscribeFromAssetUpdates(currentAsset.symbol);
      }
      
      set({ currentCandleData: null });
      
      const assetTimeFrames = get().timeFrames[assetId] || [];
      const smallestTimeFrame = assetTimeFrames.length > 0 ? assetTimeFrames[0] : null;
      
      set({ selectedAsset: asset, selectedTimeFrame: smallestTimeFrame });
      
      setTimeout(() => {
        get().fetchChartData();
        if (get().isWebSocketConnected) {
          get().subscribeToAssetUpdates(asset.symbol);
        }
      }, 0);
    }
  },
  
  selectTimeFrame: (timeFrame: TimeFrame) => {
    set({ selectedTimeFrame: timeFrame });
    setTimeout(() => {
      get().fetchChartData();
    }, 0);
  },
  
  fetchChartData: async () => {
    const asset = get().selectedAsset;
    const timeFrame = get().selectedTimeFrame;
    
    if (!asset || !timeFrame) {
      set({ chartData: [], chartError: 'Selecione um ativo e um timeframe' });
      return;
    }
    
    set({ isLoadingChart: true, chartError: null });
    
    try {
      const { timespan, multiple } = parseTimeFrame(timeFrame);
      const hoursBack = timespan === 'seconds' || timespan === 'minutes' ? 1 : 24;
      
      const chartDataResponse = await tradingApi.getChartData(asset.symbol, timespan, multiple, hoursBack);
      
      if (!chartDataResponse.values || !Array.isArray(chartDataResponse.values)) {
        throw new Error('Formato de resposta inválido para dados do gráfico');
      }
      
      const formattedData = convertApiDataToChartFormat(chartDataResponse.values);
      
      if (formattedData.length === 0) {
        set({ chartData: [], isLoadingChart: false, chartError: 'Sem dados disponíveis para este ativo e timeframe' });
        return;
      }
      
      // **LÓGICA DE MESCLAGEM FINAL**
      set(state => {
        const historicalMap = new Map(formattedData.map(c => [c.time, c]));
        const prematureCandleAccumulator = state.currentCandleData;
        const currentAssetSymbol = state.selectedAsset?.symbol;

        // Se uma vela prematura em tempo real foi criada para o ativo atual enquanto os dados históricos eram carregados
        if (prematureCandleAccumulator && prematureCandleAccumulator.assetSymbol === currentAssetSymbol) {
            const candleFromAccumulator: CandleData = {
                time: prematureCandleAccumulator.timeStart,
                open: prematureCandleAccumulator.open,
                high: prematureCandleAccumulator.high,
                low: prematureCandleAccumulator.low,
                close: prematureCandleAccumulator.prices[prematureCandleAccumulator.prices.length - 1]
            };
            
            // A vela do acumulador é a fonte da verdade para seu timestamp, então ela sobrescreve a histórica se houver conflito.
            historicalMap.set(candleFromAccumulator.time, candleFromAccumulator);
        }

        const finalChartData = Array.from(historicalMap.values()).sort((a, b) => a.time - b.time);

        return {
            chartData: finalChartData,
            isLoadingChart: false,
            // Reseta o acumulador. A próxima atualização em tempo real irá recriá-lo corretamente a partir dos dados mesclados.
            currentCandleData: null
        };
      });
      
    } catch (error) {
      set({ chartData: [], isLoadingChart: false, chartError: error instanceof Error ? error.message : 'Falha ao obter dados do gráfico' });
    }
  },
  
  updateTradeConfig: (config: Partial<TradeConfig>) => {
    set({ tradeConfig: { ...get().tradeConfig, ...config } });
  },
  
  startTrading: () => {
    set({ isTrading: true });
  },
  
  stopTrading: () => {
    set({ isTrading: false });
  },

  // Função para verificar o status de uma operação específica
  checkOperationStatus: async (operationId: string) => {
    try {
      debugLog(`📊 Verificando status da operação: ${operationId}`);
      
      // Obter token de autorização do localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        errorLog(`❌ Token não encontrado para verificar operação ${operationId}`);
        // Remover operação inválida da lista
        set(state => ({
          operations: state.operations.filter(op => op.id !== operationId)
        }));
        return null;
      }
      
      const response = await fetch(`/api/trading/get-operation/${operationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        errorLog(`❌ Falha ao verificar operação ${operationId}:`, response.status);
        // Se for erro 401/403, remover operação inválida
        if (response.status === 401 || response.status === 403) {
          set(state => ({
            operations: state.operations.filter(op => op.id !== operationId)
          }));
        }
        return null;
      }
      
      const data = await response.json();
      debugLog(`✅ Status da operação ${operationId}:`, data);
      
      return data;
    } catch (error) {
      errorLog(`⚠️ Erro ao verificar operação ${operationId}:`, error);
      return null;
    }
  },

  // Função para fazer polling inteligente de operações pendentes
  pollPendingOperations: async () => {
    // Verificar se já há um polling em andamento para evitar concorrência
    if (get().isPolling) {
      debugLog('⏭️ Polling já em andamento, pulando ciclo...');
      return;
    }
    
    const pendingOperations = get().operations.filter(op => op.status === 'pending');
    
    if (pendingOperations.length === 0) {
      return;
    }
    
    // Marcar como em polling
    set({ isPolling: true });
    
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      console.log(`🔄 Fazendo polling de ${pendingOperations.length} operações pendentes...`);
      
      // CORREÇÃO: Verificar operações após 10 segundos (operações são processadas rapidamente)
      const operationsToCheck = pendingOperations.filter(operation => {
        const timeSinceCreation = currentTime - operation.entryTime;
        // Começar a verificar 10 segundos após a criação (operações processam rapidamente)
        return timeSinceCreation >= 10;
      });
      
      if (operationsToCheck.length === 0) {
        console.log('⏳ Nenhuma operação próxima do vencimento ainda...');
        return;
      }
      
      console.log(`🎯 Verificando ${operationsToCheck.length} operações próximas do vencimento...`);
      
      // Verificar cada operação pendente
      for (const operation of operationsToCheck) {
        if (operation.id) {
          const result = await get().checkOperationStatus(operation.id);
          
          // Se a operação foi processada, atualizar o estado local
          if (result && (result.status === 'processed' || result.status === 'Processed')) {
            const isWin = result.result === 'gain' || result.result === 'Gain';
            const profit = result.profit_usd_cents ? result.profit_usd_cents / 100 : 0;
            
            console.log(`🏆 Operação processada: ${operation.id}, Resultado: ${isWin ? 'GANHO' : 'PERDA'}, Profit: ${profit}`);
            
            // Atualizar o status da operação
            get().updateOperationStatus(operation.id, isWin ? 'win' : 'loss', profit);
            
            // Atualizar último resultado
            const tradeResult = {
              operationId: operation.id,
              status: isWin ? 'win' : 'loss',
              message: isWin ? 'Operação finalizada com ganho!' : 'Operação finalizada com perda.',
              amount: operation.amount,
              profit: profit,
              isWin: isWin
            };
            
            console.log('📦 Atualizando lastTradeResult:', tradeResult);
            
            set({
              lastTradeResult: tradeResult
            });
            
            // Atualizar saldo
            setTimeout(() => {
              console.log('💰 Atualizando saldo após operação finalizada...');
              get().fetchUserBalance();
            }, 1000);
            
            // Lógica de Martingale
            if (!isWin && get().isMartingaleEnabled) {
              setTimeout(() => {
                get().createMartingaleOperation(operation.id);
              }, 2000);
            }
          }
          
          // Aguardar um pouco entre as verificações para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.log('⚠️ Erro durante polling de operações:', error);
    } finally {
      // Sempre limpar o flag de polling
      set({ isPolling: false });
    }
  },

  // Iniciar polling automático otimizado
  startOperationPolling: () => {
    // Verificar se já há polling ativo para evitar duplicação
    if (get().operationPollingInterval) {
      console.log('⚠️ Polling já está ativo, não iniciando duplicado...');
      return;
    }
    
    console.log('🚀 Iniciando polling automático otimizado de operações...');
    
    // Fazer a primeira verificação após 10 segundos
    setTimeout(() => {
      get().pollPendingOperations();
    }, 10000);
    
    // Configurar polling a cada 10 segundos (reduzido de 5 para 10)
    const intervalId = setInterval(() => {
      get().pollPendingOperations();
    }, 10000);
    
    // Armazenar o ID do interval no store
    set({ operationPollingInterval: intervalId });
  },

  // Parar polling automático
  stopOperationPolling: () => {
    const intervalId = get().operationPollingInterval;
    if (intervalId) {
      console.log('⏹️ Parando polling automático de operações...');
      clearInterval(intervalId);
      set({ operationPollingInterval: null, isPolling: false });
    }
  }
}));