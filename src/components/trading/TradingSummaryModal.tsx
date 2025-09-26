'use client';

import React from 'react';
import { X, TrendingUp, TrendingDown, CheckCircle, XCircle, Target, AlertTriangle } from 'lucide-react';

interface TradingSummaryProps {
  isOpen: boolean;
  summary: any;
  onClose: () => void;
}

export default function TradingSummaryModal({ isOpen, summary, onClose }: TradingSummaryProps) {
  if (!isOpen || !summary) return null;
  
  const { 
    isGoalReached,
    isStopLossReached,
    totalGains,
    totalLosses,
    winCount,
    lossCount,
    totalTrades,
    winRate,
    operations 
  } = summary;
  
  // Calcular resultado final
  const finalResult = totalGains - totalLosses;
  const isPositiveResult = finalResult >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-lg shadow-xl overflow-hidden">
        {/* Header com gradiente */}
        <div className={`p-4 ${isGoalReached ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isGoalReached ? (
                <Target className="w-6 h-6 text-white mr-2" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-white mr-2" />
              )}
              <h2 className="text-xl font-bold text-white">
                {isGoalReached ? 'Goal Atingido!' : 'Stop Loss Atingido'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Corpo */}
        <div className="p-6">
          {/* Resultado Final */}
          <div className="mb-6 text-center">
            <h3 className="text-gray-400 mb-2">Resultado Final</h3>
            <div className={`text-4xl font-bold ${isPositiveResult ? 'text-green-500' : 'text-red-500'}`}>
              {isPositiveResult ? '+' : ''}R${finalResult.toFixed(2)}
            </div>
          </div>
          
          {/* Estatísticas em grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Total de ganhos */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span>Total de Ganhos</span>
              </div>
              <div className="text-green-500 font-bold">R${totalGains.toFixed(2)}</div>
            </div>
            
            {/* Total de perdas */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                <span>Total de Perdas</span>
              </div>
              <div className="text-red-500 font-bold">R${totalLosses.toFixed(2)}</div>
            </div>
            
            {/* Operações ganhas */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span>Ops. Ganhas</span>
              </div>
              <div className="text-white font-bold">{winCount}</div>
            </div>
            
            {/* Operações perdidas */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <XCircle className="w-4 h-4 text-red-500 mr-1" />
                <span>Ops. Perdidas</span>
              </div>
              <div className="text-white font-bold">{lossCount}</div>
            </div>
            
            {/* Total de operações */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <span>Total de Operações</span>
              </div>
              <div className="text-white font-bold">{totalTrades}</div>
            </div>
            
            {/* Taxa de acerto */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <span>Taxa de Acerto</span>
              </div>
              <div className="text-white font-bold">{winRate.toFixed(1)}%</div>
            </div>
          </div>
          
          {/* Lista de últimas operações */}
          <div className="mb-4">
            <h3 className="text-gray-400 mb-2">Últimas Operações</h3>
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-700">
                  <tr>
                    <th className="py-2 px-3 text-left text-gray-300">Direção</th>
                    <th className="py-2 px-3 text-left text-gray-300">Valor</th>
                    <th className="py-2 px-3 text-left text-gray-300">Resultado</th>
                    <th className="py-2 px-3 text-left text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.slice(-5).map((op, index) => (
                    <tr key={index} className="border-t border-zinc-700">
                      <td className="py-2 px-3">
                        <span className={op.direction === 'up' ? 'text-green-500' : 'text-red-500'}>
                          {op.direction === 'up' ? '▲ Compra' : '▼ Venda'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white">R${op.amount}</td>
                      <td className={`py-2 px-3 ${op.result >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {op.result !== undefined ? (op.result >= 0 ? '+' : '') + 'R$' + op.result.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3">
                        {op.status === 'win' ? (
                          <span className="text-green-500 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Win
                          </span>
                        ) : (
                          <span className="text-red-500 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" /> Loss
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Botão para fechar */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-medium rounded-md hover:from-blue-700 hover:to-blue-500 transition-colors"
          >
            Fechar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
}