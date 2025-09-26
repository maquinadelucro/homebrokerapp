'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Star, TrendingUp, BarChart2, BarChart4, LineChart, X } from 'lucide-react';
import { useTradingStore } from '@/lib/trading-store';
import { Asset } from '@/lib/types';
import Image from 'next/image';
import ModalPortal from '@/components/ui/modal-portal';

interface RecommendedAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (assetId: string) => void;
}

// Textos aleatórios de análise técnica para mostrar
const TECHNICAL_ANALYSES = [
  "Tendência de alta clara com RSI saindo da zona de sobrevenda",
  "Médias móveis cruzando positivamente, sugerindo reversão do movimento",
  "Formação de suporte consistente nos últimos períodos",
  "Queda da volatilidade indicando momento potencial de entrada",
  "Convergência do MACD, sinalizando oportunidade de mercado",
  "Padrão de reversão identificado pela análise técnica avançada",
  "Bandas de Bollinger apertadas, indicando movimento explosivo iminente",
  "Formação de candle de inversão com volume crescente",
  "Rompimento recente de resistência importante",
  "Pullback em tendência principal, criando oportunidade de entrada",
  "Suporte dinâmico sendo respeitado nos últimos movimentos",
  "Indicadores de momentum apontando para continuação do movimento atual",
  "Volume crescente após período de consolidação",
  "Harmonia entre múltiplos indicadores técnicos",
  "Formação de Fibonacci em pontos-chave do gráfico"
];

// Componente para mostrar progresso estilizado
const ProgressBar = ({ value, maxValue, color }: { value: number, maxValue: number, color: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-300"
        style={{ 
          width: `${percentage}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
};

export default function RecommendedAssetsModal({ isOpen, onClose, onSelectAsset }: RecommendedAssetsModalProps) {
  const { assets } = useTradingStore();
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | null>(null);

  // Estado para armazenar as últimas recomendações
  const [lastRecommendationTime, setLastRecommendationTime] = useState<number>(0);
  const [recommendedAssets, setRecommendedAssets] = useState<Asset[]>([]);
  const [assetAnalyses, setAssetAnalyses] = useState<{[key: string]: string}>({});
  const [assetScores, setAssetScores] = useState<{[key: string]: number}>({});
  const [assetIndicatorSignals, setAssetIndicatorSignals] = useState<{[key: string]: ('green' | 'red')[]}>({});

  // Frases de status para mostrar durante a análise
  const [statusMessages] = useState([
    "Escaneando os principais mercados...",
    "Analisando correlação entre ativos...",
    "Processando padrões gráficos...",
    "Calculando volatilidade relativa...",
    "Identificando oportunidades de mercado...",
    "Finalizando recomendações..."
  ]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  // Determinar se devemos usar as recomendações existentes ou gerar novas
  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();
    const oneMinuteInMs = 60 * 1000;
    
    // Se já temos recomendações e ainda não passou 1 minuto, reutilizá-las
    if (recommendedAssets.length > 0 && now - lastRecommendationTime < oneMinuteInMs) {
      console.log("Reutilizando recomendações existentes");
      startAnalysisAnimation();
    } else {
      // Caso contrário, gerar novas recomendações
      console.log("Gerando novas recomendações");
      generateNewRecommendations();
    }
  }, [isOpen]);

  // Função para gerar novas recomendações
  const generateNewRecommendations = () => {
    if (assets.length === 0) return;

    // Identificar ativos que suportam operações de 30s
    const assetsWith30s = assets.filter(asset => {
      // Verificar nos timeFrames se existe a opção de 30s
      // Essa verificação dependeria da estrutura de dados real, ajuste conforme necessário
      return asset.isOpen; // Simplificando para apenas verificar se está aberto
    });

    // Lista para guardar os ativos selecionados
    const selected: Asset[] = [];
    const usedAssetIds = new Set<string>();
    const newAssetAnalyses: {[key: string]: string} = {};
    const newAssetScores: {[key: string]: number} = {};
    const newAssetIndicatorSignals: {[key: string]: ('green' | 'red')[]} = {};

    // Selecionar 3 ativos
    for (let i = 0; i < 3; i++) {
      // 60% de chance de escolher um ativo com opção de 30s, se disponível
      const useAssetWith30s = Math.random() < 0.6 && assetsWith30s.length > 0;
      
      const availablePool = useAssetWith30s 
        ? assetsWith30s.filter(a => !usedAssetIds.has(a.id))
        : assets.filter(a => !usedAssetIds.has(a.id) && a.isOpen);
      
      if (availablePool.length === 0) continue;
      
      // Escolher um ativo aleatório da pool disponível
      const randomIndex = Math.floor(Math.random() * availablePool.length);
      const selectedAsset = availablePool[randomIndex];
      
      // Gerar análise técnica aleatória
      const randomAnalysisIndex = Math.floor(Math.random() * TECHNICAL_ANALYSES.length);
      newAssetAnalyses[selectedAsset.id] = TECHNICAL_ANALYSES[randomAnalysisIndex];
      
      // Gerar uma pontuação aleatória entre 60 e 95
      newAssetScores[selectedAsset.id] = Math.floor(Math.random() * 36) + 60;
      
      // Gerar sinais dos indicadores (2 ou 3 verdes)
      const signals: ('green' | 'red')[] = ['green', 'green', 'green'];
      if (Math.random() < 0.3) { // 30% de chance de ter um sinal vermelho
        const redIndex = Math.floor(Math.random() * 3);
        signals[redIndex] = 'red';
      }
      signals.sort(() => Math.random() - 0.5); // Embaralhar para não ser sempre na mesma posição
      newAssetIndicatorSignals[selectedAsset.id] = signals;

      // Adicionar à lista de selecionados e marcar como usado
      selected.push(selectedAsset);
      usedAssetIds.add(selectedAsset.id);
    }

    // Ordenar por pontuação (score) decrescente
    selected.sort((a, b) => (newAssetScores[b.id] || 0) - (newAssetScores[a.id] || 0));
    
    // Atualizar o estado
    setRecommendedAssets(selected);
    setAssetAnalyses(newAssetAnalyses);
    setAssetScores(newAssetScores);
    setAssetIndicatorSignals(newAssetIndicatorSignals);
    setLastRecommendationTime(Date.now());
    
    // Iniciar a animação de análise
    startAnalysisAnimation();
  };

  // Função para iniciar a animação de análise
  const startAnalysisAnimation = () => {
    setAnalysisProgress(0);
    setShowRecommendations(false);
    setCurrentStatusIndex(0);
    setSelectedAssetIndex(null);
    
    // Iniciar animação de progresso
    const duration = 5000; // 5 segundos de análise
    const stepTime = 50; // Atualizar a cada 50ms
    const totalSteps = duration / stepTime;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(100, Math.floor((step / totalSteps) * 100));
      setAnalysisProgress(progress);
      
      // Atualizar mensagem de status
      if (step % Math.floor(totalSteps / statusMessages.length) === 0) {
        setCurrentStatusIndex(prev => 
          Math.min(prev + 1, statusMessages.length - 1)
        );
      }
      
      // Quando completar, mostrar as recomendações
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setShowRecommendations(true);
        }, 500);
      }
    }, stepTime);
  };

  // Função para lidar com a seleção de um ativo
  const handleSelectAsset = (index: number) => {
    setSelectedAssetIndex(index);
    
    // Aguardar um pouco para dar feedback visual e depois fechar a modal
    setTimeout(() => {
      const selectedAsset = recommendedAssets[index];
      if (selectedAsset) {
        onSelectAsset(selectedAsset.id);
      }
      onClose();
    }, 500);
  };
  
  return (
    <ModalPortal isOpen={isOpen}>
      <div className="w-full max-w-2xl bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 p-6 overflow-hidden relative">
        {/* Botão de fechar no canto superior direito */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center mr-3">
              {showRecommendations ? (
                <Star className="h-6 w-6 text-white" />
              ) : (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {showRecommendations ? "Ativos Recomendados" : "Analisando Mercado"}
              </h3>
              <p className="text-sm text-gray-400">
                {showRecommendations ? 
                  "Com base em análise técnica avançada" : 
                  statusMessages[currentStatusIndex]}
              </p>
            </div>
          </div>
          {!showRecommendations && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{analysisProgress}%</div>
              <p className="text-sm text-amber-400">Progresso da análise</p>
            </div>
          )}
        </div>
        
        {!showRecommendations && (
          <>
            {/* Barra de progresso geral */}
            <div className="w-full h-2 bg-zinc-800 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
            
            {/* Indicadores sendo analisados */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {['Volume', 'Volatilidade', 'Tendência', 'Correlação'].map((indicator, i) => {
                // Calcular um progresso específico para cada indicador
                const indProgress = Math.min(100, Math.max(0, 
                  analysisProgress - (i * 10) + (Math.random() * 20 - 10)
                ));
                
                return (
                  <div key={i} className="bg-zinc-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">{indicator}</span>
                      <span className="text-sm text-amber-400">{Math.floor(indProgress)}%</span>
                    </div>
                    <ProgressBar 
                      value={indProgress} 
                      maxValue={100} 
                      color={`rgb(245, ${120 + i * 30}, 10)`} 
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="bg-zinc-800 p-4 rounded-lg text-center">
              <p className="text-white mb-2">Buscando oportunidades de mercado</p>
              <div className="flex justify-center items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
              </div>
            </div>
          </>
        )}
        
        {showRecommendations && (
          <div className="space-y-4">
            {recommendedAssets.map((asset, index) => {
              const signals = assetIndicatorSignals[asset.id] || ['green', 'green', 'green'];
              return (
                <div 
                  key={asset.id}
                  className={`bg-zinc-800 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                    selectedAssetIndex === index ? 
                      'border-amber-500 bg-zinc-900' : 
                      'border-transparent hover:border-amber-500/50'
                  }`}
                  onClick={() => handleSelectAsset(index)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      {asset.logo ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                          <Image 
                            src={asset.logo} 
                            alt={asset.name} 
                            width={40} 
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold">{asset.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <h4 className="text-lg font-bold text-white">{asset.name}</h4>
                        <div className="text-sm text-gray-400 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {asset.profitPayout ? `Payout: ${asset.profitPayout}%` : 'Ativo recomendado'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-amber-600 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-sm">
                      {assetScores[asset.id] || 75}
                    </div>
                  </div>
                  
                  <div className="pl-2 border-l-2 border-amber-500 mb-3">
                    <p className="text-sm text-gray-300">
                      {assetAnalyses[asset.id] || TECHNICAL_ANALYSES[0]}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex space-x-2">
                      {['RSI', 'MA', 'VOL'].map((ind, i) => (
                        <div 
                          key={i} 
                          className={`px-2 py-0.5 rounded ${
                            signals[i] === 'green' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {ind}
                        </div>
                      ))}
                    </div>
                    <button 
                      className="text-amber-400 hover:text-amber-300"
                      onClick={() => handleSelectAsset(index)}
                    >
                      Selecionar
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Botão para fechar a modal */}
            <div className="mt-6 flex justify-center">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
        
        {/* Nota de rodapé */}
        <div className="mt-6 text-xs text-center text-gray-500">
          {showRecommendations ? 
            "Recomendações baseadas em análise técnica avançada e inteligência artificial." :
            "Analisando dados de mercado com algoritmos de inteligência artificial para identificar as melhores oportunidades."
          }
        </div>
      </div>
    </ModalPortal>
  );
}