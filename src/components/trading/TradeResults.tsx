'use client';

import React, { useEffect, useState } from 'react';
import { useTradingStore } from '@/lib/trading-store';
import { TradingOperation } from '@/lib/types';
import { Loader2, Clock, ArrowUp, ArrowDown } from 'lucide-react';

// Tipo para representar um grupo de operações (principal + martingales)
type OperationGroup = {
  mainOperation: TradingOperation;
  martingales: TradingOperation[];
  totalResult: number;
  totalEntry: number;
  finishedEntry: number; // Valor total apenas das operações finalizadas
  isActive: boolean; // Indica se o grupo tem operações em andamento
  isComplete: boolean; // Indica se todas as operações do grupo estão concluídas
};

export default function TradeResults() {
  // Usar o trading store para acessar as operações - AGORA COM ISOLAMENTO POR USUÁRIO
  const { getUserOperations, lastTradeResult, assets } = useTradingStore();
  
  // Obter apenas as operações do usuário atual
  const operations = getUserOperations();
  
  // Estado local para armazenar os resultados
  const [totalResult, setTotalResult] = useState<number>(0);
  const [operationGroups, setOperationGroups] = useState<OperationGroup[]>([]);
  
  // Função para formatar a duração em segundos para um formato legível
  const formatDuration = (durationMs: number): string => {
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      return `${hours}h`;
    }
  };
  
  // Função para processar as operações e agrupá-las por operação principal e seus martingales
  const processOperations = (operations: TradingOperation[]) => {
    // Primeiro, encontrar todas as operações principais (não martingale)
    const mainOperations = operations.filter(op => !op.isMartingale);
    
    if (mainOperations.length === 0) {
      return [];
    }
    
    // Agrupar as operações martingale por operação principal
    const groups: OperationGroup[] = mainOperations.map(mainOp => {
      // Encontrar todos os martingales associados a esta operação principal
      const relatedMartingales = operations.filter(op => 
        op.isMartingale && op.mainOperationId === mainOp.id
      );
      
      // Ordenar martingales por nível
      relatedMartingales.sort((a, b) => (a.martingaleLevel || 0) - (b.martingaleLevel || 0));
      
      // Todas as operações do grupo
      const allOperations = [mainOp, ...relatedMartingales];
      
      // Operações finalizadas (com status win ou loss)
      const completedOperations = allOperations.filter(op => 
        op.status === 'win' || op.status === 'loss'
      );
      
      // Calcular o resultado total apenas de operações finalizadas
      const totalResult = completedOperations.reduce((sum, op) => sum + (op.result || 0), 0);
      
      // CORREÇÃO 1: Calcular o valor de entrada de TODAS as operações para mostrar no cabeçalho
      const totalEntry = allOperations.reduce((sum, op) => sum + op.amount, 0);
      
      // CORREÇÃO 2: Calcular o valor de entrada apenas das operações FINALIZADAS para o total
      const finishedEntry = completedOperations.reduce((sum, op) => sum + op.amount, 0);
      
      // Verificar se alguma operação do grupo está em andamento
      const isActive = allOperations.some(op => op.status === 'pending');
      
      // Verificar se o grupo está completamente finalizado
      const isComplete = allOperations.every(op => op.status === 'win' || op.status === 'loss');
      
      return {
        mainOperation: mainOp,
        martingales: relatedMartingales,
        totalResult,
        totalEntry,
        finishedEntry,
        isActive,
        isComplete
      };
    });
    
    // Ordenar grupos: primeiro os ativos, depois por data (mais recente primeiro)
    groups.sort((a, b) => {
      // Primeiro critério: operações ativas vêm primeiro
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      
      // Segundo critério: data mais recente primeiro
      return b.mainOperation.entryTime - a.mainOperation.entryTime;
    });
    
    return groups;
  };
  
  // Função para extrair e atualizar os dados
  useEffect(() => {
    // Processar operações e agrupá-las
    const groups = processOperations(operations);
    setOperationGroups(groups);
    
    // Calcular o resultado total das operações concluídas
    const completedOperations = operations.filter(op => 
      op.status === 'win' || op.status === 'loss'
    );
    
    const total = completedOperations.reduce((sum, op) => sum + (op.result || 0), 0);
    setTotalResult(total);
    
  }, [operations, lastTradeResult]); // Atualizar quando houver mudanças nas operações ou resultado
  
  // Função para obter o nome do ativo a partir do símbolo
  const getAssetName = (symbol: string): string => {
    const asset = assets.find(a => a.symbol === symbol);
    return asset ? asset.name : symbol;
  };
  
  // Se não há grupos para mostrar, exibir mensagem
  if (operationGroups.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-400">
        <p>Nenhuma operação iniciada ainda</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Título "Histórico" */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-white">Histórico</h3>
      </div>
      
      {/* Detalhes das operações com seus martingales */}
      <div 
        className="space-y-4 max-h-64 overflow-y-auto pr-2 border border-zinc-700/30 rounded-lg p-3"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#71717a #3f3f46',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {operationGroups.map((group, groupIndex) => (
          <div 
            key={group.mainOperation.id} 
            className={`rounded-md border mb-3 ${
              group.isActive 
                ? 'border-blue-500 bg-zinc-900' 
                : 'border-zinc-800 bg-zinc-800'
            }`}
          >
            {/* Cabeçalho da operação principal */}
            <div className="flex justify-between items-center p-3 border-b border-zinc-700">
              <div className="flex items-center">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${group.mainOperation.direction === 'up' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {group.mainOperation.direction === 'up' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-white font-medium">
                          {group.mainOperation.direction === 'up' ? 'Compra' : 'Venda'}
                      </span>
                  </div>
                  <div className="text-gray-400 text-xs flex items-center mt-1">
                    <span className="mr-3">{getAssetName(group.mainOperation.symbol)}</span>
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(group.mainOperation.duration)}
                  </div>
                </div>
              </div>
              <div className={
                group.isActive
                  ? 'px-2 py-1 rounded text-xs border border-blue-500 text-blue-400'
                  : group.totalResult >= 0 
                    ? 'px-2 py-1 rounded text-xs bg-green-500 bg-opacity-20 text-green-500' 
                    : 'px-2 py-1 rounded text-xs bg-red-500 bg-opacity-20 text-red-500'
              }>
                {group.isActive 
                  ? `Entrada: R$${group.totalEntry.toFixed(2)}` 
                  : group.totalResult >= 0 
                    ? `+R$${group.totalResult.toFixed(2)}` 
                    : `R$${group.totalResult.toFixed(2)}`
                }
              </div>
            </div>
            
            {/* Tabela de operações do grupo */}
            <div className="p-3">
              <div className="w-full grid grid-cols-4 gap-2 text-sm">
                <div className="text-gray-400 font-medium">Tipo</div>
                <div className="text-gray-400 font-medium">Entrada</div>
                <div className="text-gray-400 font-medium">Resultado</div>
                <div className="text-gray-400 font-medium">Status</div>
                
                {/* Operação principal */}
                <div className="text-white">Principal</div>
                <div className="text-white">R${group.mainOperation.amount.toFixed(2)}</div>
                <div className={
                  group.mainOperation.status === 'pending'
                    ? 'text-gray-400'
                    : group.mainOperation.result && group.mainOperation.result >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                }>
                  {group.mainOperation.status === 'pending'
                    ? '-'
                    : group.mainOperation.result && group.mainOperation.result >= 0 
                      ? `+R$${group.mainOperation.result.toFixed(2)}` 
                      : `R$${(group.mainOperation.result || 0).toFixed(2)}`
                  }
                </div>
                <div className={
                  group.mainOperation.status === 'pending'
                    ? 'text-blue-400'
                    : group.mainOperation.status === 'win' 
                      ? 'text-green-500' 
                      : 'text-red-500'
                }>
                  {group.mainOperation.status === 'pending' 
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : group.mainOperation.status === 'win' 
                      ? '✓' 
                      : '✗'
                  }
                </div>
                
                {/* Operações de martingale */}
                {group.martingales.map((martingale, index) => (
                  <React.Fragment key={martingale.id}>
                    <div className="text-white">Reentrada</div>
                    <div className="text-white">R${martingale.amount.toFixed(2)}</div>
                    <div className={
                      martingale.status === 'pending'
                        ? 'text-gray-400'
                        : martingale.result && martingale.result >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                    }>
                      {martingale.status === 'pending'
                        ? '-'
                        : martingale.result && martingale.result >= 0 
                          ? `+R$${martingale.result.toFixed(2)}` 
                          : `R$${(martingale.result || 0).toFixed(2)}`
                      }
                    </div>
                    <div className={
                      martingale.status === 'pending'
                        ? 'text-blue-400'
                        : martingale.status === 'win' 
                          ? 'text-green-500' 
                          : 'text-red-500'
                    }>
                      {martingale.status === 'pending' 
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : martingale.status === 'win' 
                          ? '✓' 
                          : '✗'
                      }
                    </div>
                  </React.Fragment>
                ))}
                
                {/* Total do grupo - CORREÇÃO: Mostrar total de operações finalizadas mesmo quando há pendentes */}
                {(group.finishedEntry > 0 || group.isComplete) && (
                  <>
                    <div className="text-white font-bold border-t border-zinc-700 pt-1 mt-1">Total</div>
                    <div className="text-white font-bold border-t border-zinc-700 pt-1 mt-1">
                      {group.finishedEntry > 0 
                        ? `R$${group.finishedEntry.toFixed(2)}`
                        : '-'}
                    </div>
                    <div className={`font-bold border-t border-zinc-700 pt-1 mt-1 ${
                      group.isComplete
                        ? (group.totalResult >= 0 ? 'text-green-500' : 'text-red-500')
                        : 'text-gray-400'
                    }`}>
                      {group.finishedEntry > 0
                        ? (group.totalResult >= 0 
                          ? `+R$${group.totalResult.toFixed(2)}` 
                          : `R$${group.totalResult.toFixed(2)}`)
                        : '-'}
                    </div>
                    <div className="border-t border-zinc-700 pt-1 mt-1"></div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Disclaimer */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>Para visualizar o histórico completo, acesse a corretora</p>
      </div>
    </div>
  );
}