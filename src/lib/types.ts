export type Asset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  logo?: string;
  market?: string;
  profitPayout?: number;
  minTradeValue?: number;
  maxTradeValue?: number;
  isActive?: boolean;
  isOpen?: boolean; // Indica se o ativo está aberto para negociação no momento atual
  
  // Horários de negociação por dia da semana
  tradingHours?: {
    monday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
    tuesday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
    wednesday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
    thursday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
    friday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
    saturday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
    sunday?: { start: string; end: string; secondStart?: string | null; secondEnd?: string | null };
  };
};

export type TimeFrame = string; // '15s' | '30s' | '1m' | '5m' | '15m' | '1h' | '1d';

export type CandleData = {
  time: number; // Timestamp em segundos para a biblioteca de gráficos
  open: number;
  high: number;
  close: number;
  low: number;
};

// Tipo para os dados retornados pela API
export type ApiCandleData = {
  time_stamp: string; // ISO 8601 formato, ex: "2025-08-06T19:35:00Z"
  symbol: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
  count: number;
};

export type AIModel = {
  id: string;
  name: string;
  description?: string;
};

export type Strategy = {
  id: string;
  name: string;
  description?: string;
};

export type TradeConfig = {
  aiModel: string;
  strategy: string;
  entryValue: number;
  goal: number;
  stopLoss: number;
};

export type TradeResult = {
  entry: number;
  profit: number;
};

// Tipo para representar uma operação de trading
export type TradingOperation = {
  id: string;
  userId: string; // NOVO: ID do usuário proprietário da operação
  symbol: string;
  direction: 'up' | 'down';
  entryPrice: number;
  entryTime: number; // Timestamp em segundos
  duration: number; // Duração em milissegundos
  expiryTime: number; // Timestamp em segundos do momento de expiração
  amount: number; // Valor da operação em moeda local
  status: 'pending' | 'win' | 'loss' | 'expired'; // Status da operação
  result?: number; // Resultado financeiro (positivo para ganho, negativo para perda)
  
  // Campos para martingale
  isMartingale?: boolean; // Indica se esta operação é um martingale
  martingaleLevel?: number; // Nível do martingale (1 para o primeiro gale, 2 para o segundo)
  mainOperationId?: string; // ID da operação principal (se for um martingale)
  martingaleOperations?: string[]; // IDs das operações martingale associadas (se for operação principal)
};

// Tipo para representar um marcador no gráfico
export type ChartMarker = {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrow_up' | 'arrow_down' | 'circle' | 'square';
  text: string;
  size?: number;
  operationId?: string; // Referência à operação associada
};