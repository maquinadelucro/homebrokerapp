'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, BarChart4, TrendingUp, Activity, LineChart } from 'lucide-react';
import ModalPortal from '@/components/ui/modal-portal';

// Tipos de indicadores que serão "analisados"
type Indicator = {
  name: string;
  icon: React.ReactNode;
  color: string;
  progress: number;
  completed: boolean;
};

interface AIAnalysisModalProps {
  isOpen: boolean;
  aiModel: string;
  assetName: string;
  onComplete: (direction: 'up' | 'down') => void;
}

export default function AIAnalysisModal({ 
  isOpen, 
  aiModel, 
  assetName,
  onComplete 
}: AIAnalysisModalProps) {
  const [analysisTime, setAnalysisTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [indicators, setIndicators] = useState<Indicator[]>([
    { 
      name: 'RSI (Índice de Força Relativa)', 
      icon: <Activity size={20} />, 
      color: 'rgb(99, 102, 241)', 
      progress: 0, 
      completed: false 
    },
    { 
      name: 'Médias Móveis', 
      icon: <LineChart size={20} />, 
      color: 'rgb(59, 130, 246)', 
      progress: 0, 
      completed: false 
    },
    { 
      name: 'MACD', 
      icon: <BarChart4 size={20} />, 
      color: 'rgb(139, 92, 246)', 
      progress: 0, 
      completed: false 
    },
    { 
      name: 'Bandas de Bollinger', 
      icon: <TrendingUp size={20} />, 
      color: 'rgb(236, 72, 153)', 
      progress: 0, 
      completed: false 
    }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [analysisMessages, setAnalysisMessages] = useState<string[]>([
    "Inicializando análise dos padrões de mercado...",
    "Detectando tendências de reversão...",
    "Calculando correlações entre indicadores...",
    "Identificando padrões gráficos recorrentes...",
    "Analisando volatilidade histórica...",
    "Comparando com padrões anteriores...",
    "Finalizando análise preditiva..."
  ]);
  const [currentMessage, setCurrentMessage] = useState(analysisMessages[0]);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [decisionConfidence, setDecisionConfidence] = useState(0);
  
  // Randomizar o tempo de análise entre 5-15 segundos ao abrir a modal
  useEffect(() => {
    if (isOpen) {
      const randomTime = Math.floor(Math.random() * 10) + 5; // 5-15 segundos
      setAnalysisTime(randomTime);
      
      // Reiniciar estado da análise
      setCurrentStep(0);
      setOverallProgress(0);
      setIndicators(indicators.map(ind => ({ ...ind, progress: 0, completed: false })));
      setDirection(null);
      setDecisionConfidence(0);
      setCurrentMessage(analysisMessages[0]);
    }
  }, [isOpen]);
  
  // Efeito principal para controlar a análise
  useEffect(() => {
    if (!isOpen || analysisTime === 0) return;
    
    const totalSteps = 100; // Total de passos da animação
    const stepTime = (analysisTime * 1000) / totalSteps; // Tempo por passo
    
    // Cronômetro para avançar os passos
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        // Calcular novo passo
        const newStep = prev + 1;
        
        // Atualizar progresso geral
        const newProgress = Math.min(100, Math.floor((newStep / totalSteps) * 100));
        setOverallProgress(newProgress);
        
        // Atualizar mensagens de status
        if (newStep % Math.floor(totalSteps / analysisMessages.length) === 0) {
          const msgIndex = Math.min(
            Math.floor(newStep / (totalSteps / analysisMessages.length)),
            analysisMessages.length - 1
          );
          setCurrentMessage(analysisMessages[msgIndex]);
        }
        
        // Atualizar progresso dos indicadores
        setIndicators(prevIndicators => {
          return prevIndicators.map((ind, index) => {
            const startThreshold = (index * (totalSteps / indicators.length)) / 3;
            const endThreshold = startThreshold + (totalSteps * 0.8);
            
            if (newStep > startThreshold && newStep < endThreshold) {
              // Aumentar progressivamente o progresso deste indicador
              const indProgress = Math.min(
                100, 
                Math.floor(((newStep - startThreshold) / (endThreshold - startThreshold)) * 100)
              );
              return { ...ind, progress: indProgress, completed: indProgress >= 100 };
            } else if (newStep >= endThreshold) {
              return { ...ind, progress: 100, completed: true };
            }
            return ind;
          });
        });
        
        // Determinar a direção apenas aos 97% da análise
        if (newStep === Math.floor(totalSteps * 0.97) && !direction) {
          // Randomizar direção (up/down)
          const randomDirection = Math.random() < 0.5 ? 'up' : 'down';
          setDirection(randomDirection);
        }
        
        // Aumentar a confiança da decisão progressivamente na parte final (de 97% a 100%)
        if (newStep > Math.floor(totalSteps * 0.97)) {
          const confidenceProgress = Math.min(
            100,
            Math.floor(
              ((newStep - totalSteps * 0.97) / (totalSteps * 0.03)) * 100
            )
          );
          setDecisionConfidence(confidenceProgress);
        }
        
        // Se terminamos, chamar o callback para completar
        if (newStep >= totalSteps) {
          setTimeout(() => {
            // Garantir que temos uma direção
            const finalDirection = direction || (Math.random() < 0.5 ? 'up' : 'down');
            onComplete(finalDirection);
          }, 500); // Pequeno delay para mostrar o resultado completo
          
          clearInterval(timer);
        }
        
        return newStep;
      });
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [isOpen, analysisTime, direction, indicators.length, analysisMessages, onComplete]);
  
  return (
    <ModalPortal isOpen={isOpen}>
      <div className="w-full max-w-md sm:max-w-2xl bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 p-4 sm:p-6 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">{aiModel}</h3>
              <p className="text-sm text-gray-400">Analisando {assetName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold text-white">{overallProgress}%</div>
            <p className="text-sm text-blue-400">Progresso</p>
          </div>
        </div>
        
        {/* Barra de progresso geral */}
        <div className="w-full h-2 bg-zinc-800 rounded-full mb-3 sm:mb-6 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        
        {/* Mensagem de status */}
        <div className="text-blue-400 mb-3 sm:mb-6 h-6 text-center font-medium text-sm">
          {currentMessage}
        </div>
        
        {/* Grade de indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-6">
          {indicators.map((indicator, i) => (
            <div key={i} className="bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                       style={{ backgroundColor: `${indicator.color}30` }}>
                    <span style={{ color: indicator.color }}>{indicator.icon}</span>
                  </div>
                  <span className="text-white font-medium text-sm">{indicator.name}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: indicator.color }}>
                  {indicator.progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${indicator.progress}%`,
                    backgroundColor: indicator.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Área de recomendação */}
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-1 sm:mb-2">
            <h4 className="text-white font-medium">Recomendação da IA</h4>
            <div className="text-sm font-medium text-white">
              Confiança: <span className="text-blue-400">{decisionConfidence}%</span>
            </div>
          </div>
          
          {/* Mostrar a recomendação apenas quando a direção for determinada */}
          {direction ? (
            <div className="flex items-center justify-center p-3 rounded-lg bg-zinc-900">
              <div className={`text-xl font-bold flex items-center ${
                direction === 'up' ? 'text-green-500' : 'text-red-500'
              }`}>
                {direction === 'up' ? (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    COMPRAR
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    VENDER
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-3 rounded-lg bg-zinc-900">
              <div className="text-blue-400 flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analisando padrões...
              </div>
            </div>
          )}
        </div>
        
        {/* Nota de rodapé */}
        <div className="mt-3 sm:mt-6 text-xs text-center text-gray-500">
          A análise utiliza algoritmos avançados para identificar a melhor direção para sua operação.
        </div>
      </div>
    </ModalPortal>
  );
}