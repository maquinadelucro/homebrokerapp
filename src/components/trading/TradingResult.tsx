'use client';

import React from 'react';
import { useTradingStore } from '@/lib/trading-store';

export default function TradingResult() {
  const { lastTradeResult } = useTradingStore();
  
  // Se não há resultado da última operação, não exibir nada
  if (!lastTradeResult) {
    return (
      <div className="mt-4 space-y-3 pt-4 border-t border-[#2A2E39]">
        <div className="text-center text-gray-400 py-8">
          <div className="text-sm">Aguardando resultado da operação...</div>
        </div>
      </div>
    );
  }

  const { profit, amount, isWin, status, message } = lastTradeResult;
  const isNegative = !isWin;
  const displayResult = profit || 0;

  return (
    <div className="mt-4 space-y-3 pt-4 border-t border-[#2A2E39]">
      {/* Resultado principal */}
      <div className="text-center">
        <div className={`text-4xl font-bold ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
          R$ {isNegative ? displayResult.toFixed(2) : `+${displayResult.toFixed(2)}`}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {message || (isWin ? 'Operação Vitoriosa!' : 'Operação com Perda')}
        </div>
      </div>
      
      {/* Detalhes da operação */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-gray-400 text-xs">Entry</div>
          <div className="text-white">R${(amount || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Profit/Loss</div>
          <div className={`${isNegative ? 'text-red-500' : 'text-green-500'}`}>
            {isNegative ? '-' : '+'}R${Math.abs(displayResult).toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Status adicional */}
      <div className="text-center">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
          isWin 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            isWin ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          {isWin ? 'GANHO' : 'PERDA'}
        </div>
      </div>
    </div>
  );
}