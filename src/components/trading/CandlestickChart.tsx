'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, TimeScaleOptions, LineStyle, PriceLineOptions } from 'lightweight-charts';
import { ChevronDown, Loader2, ArrowDown, ArrowUp, TrendingUp, Clock, Search } from 'lucide-react';
import { useTradingStore } from '@/lib/trading-store';
import { getPusherService } from '@/lib/pusher-service';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';
import { TradingOperation } from '@/lib/types';

interface CandlestickChartProps {
  className?: string;
}

interface MarkerPosition {
  id: string;
  x: number;
  y: number;
  direction: 'up' | 'down';
  status: TradingOperation['status'];
  operationId: string;
}

export default function CandlestickChart({ className }: CandlestickChartProps) {
  const { 
    assets, 
    selectedAsset, 
    timeFrames, 
    selectedTimeFrame,
    fetchAssets,
    selectAsset,
    isLoading,
    error,
    
    // Dados do gráfico
    chartData,
    isLoadingChart,
    chartError,
    fetchChartData,
    
    // WebSocket e dados em tempo real
    connectToPusher,
    isWebSocketConnected,
    lastRealTimeUpdate,
    
    // Operações de trading
    operations,
  } = useTradingStore();
  
  const isMobile = useIsMobile();
  
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<TradingOperation | null>(null);
  const [customMarkers, setCustomMarkers] = useState<MarkerPosition[]>([]);
  
  // Estados para pesquisa de ativos
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAssets, setFilteredAssets] = useState<typeof assets>([]);
  
  // Refs para controle
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersLayerRef = useRef<HTMLDivElement>(null);
  const entryPriceLineRef = useRef<ReturnType<ISeriesApi<"Line">['createPriceLine']> | null>(null);
  const lastTickTimeRef = useRef<number>(0);
  const lastCandleRef = useRef<CandlestickData | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const chartSizeRef = useRef<{width: number, height: number}>({width: 0, height: 0});
  
  // Refs para controle de clique fora
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Buscar ativos ao carregar o componente e conectar Pusher
  useEffect(() => {
    fetchAssets();
    connectToPusher();
  }, [fetchAssets, connectToPusher]);
  
  // Efeito para detectar cliques fora dos dropdowns (apenas desktop)
  useEffect(() => {
    if (isMobile) return; // No mobile, o seletor está na TopBar
    
    const handleClickOutside = (event: MouseEvent) => {
      // Fechar dropdown de ativos se clicar fora
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setShowAssetDropdown(false);
        setSearchTerm(''); // Limpar pesquisa ao fechar
      }
    };

    // Adicionar listener apenas quando algum dropdown estiver aberto
    if (showAssetDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssetDropdown, isMobile]);
  
  // Efeito para filtrar ativos baseado na pesquisa (apenas desktop)
  useEffect(() => {
    if (isMobile) return; // No mobile, o seletor está na TopBar
    
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
  
  // Efeito para focar no input de pesquisa quando o dropdown abrir (apenas desktop)
  useEffect(() => {
    if (isMobile) return; // No mobile, o seletor está na TopBar
    
    if (showAssetDropdown && searchInputRef.current) {
      // Pequeno delay para garantir que o dropdown foi renderizado
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showAssetDropdown, isMobile]);
  
  // Função simplificada para calcular posições dos marcadores
  const calculateMarkerPositions = () => {
    if (!chartRef.current || !seriesRef.current || operations.length === 0) {
      return [];
    }
    
    const relevantOperations = operations.filter(op => 
      op.status === 'pending' || 
      (Date.now() / 1000 - op.expiryTime < 300)
    );
    
    const newMarkerPositions: MarkerPosition[] = [];
    
    relevantOperations.forEach(operation => {
      try {
        const timeCoordinate = chartRef.current!.timeScale().timeToCoordinate(operation.entryTime);
        if (timeCoordinate === null) return;
        
        const priceCoordinate = seriesRef.current!.priceToCoordinate(operation.entryPrice);
        if (priceCoordinate === null) return;
        
        newMarkerPositions.push({
          id: `marker-${operation.id}-entry`,
          x: timeCoordinate,
          y: priceCoordinate,
          direction: operation.direction,
          status: operation.status,
          operationId: operation.id
        });
        
        const expiryTimeCoordinate = chartRef.current!.timeScale().timeToCoordinate(operation.expiryTime);
        if (expiryTimeCoordinate !== null && operation.status !== 'pending') {
          newMarkerPositions.push({
            id: `marker-${operation.id}-expiry`,
            x: expiryTimeCoordinate,
            y: priceCoordinate,
            direction: operation.direction,
            status: operation.status,
            operationId: operation.id
          });
        }
      } catch (error) {
        // Ignorar erros de cálculo de posição
      }
    });
    
    return newMarkerPositions;
  };
  
  // Função unificada para aplicar atualizações ao gráfico com limitação de taxa
  const applyChartUpdates = () => {
    // Cancelar qualquer timer anterior
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    
    // Verificar se o gráfico foi inicializado
    if (!chartRef.current || !seriesRef.current) return;
    
    // 1. Atualizar dados do gráfico (velas)
    if (chartData && chartData.length > 0) {
      const lastCandle = chartData[chartData.length - 1];
      const currentLastCandle = lastCandleRef.current;
      
      // Verificar se há mudança real nos dados
      if (!currentLastCandle || 
          currentLastCandle.time !== lastCandle.time || 
          currentLastCandle.close !== lastCandle.close) {
        
        // Atualizar os dados do gráfico
        seriesRef.current.setData(chartData);
        
        // Armazenar o último valor para comparação futura
        lastCandleRef.current = lastCandle;
        lastTickTimeRef.current = lastCandle.time;
        
        // Definir o intervalo visível
        const interval = 30; // 30 segundos
        const visibleRange = {
          from: lastCandle.time - (interval * 38),
          to: lastCandle.time + (interval * 5)
        };
        
        chartRef.current.timeScale().setVisibleRange(visibleRange);
      }
    }
    
    // 2. Atualizar os marcadores
    try {
      const newMarkers = calculateMarkerPositions();
      if (JSON.stringify(customMarkers) !== JSON.stringify(newMarkers)) {
        setCustomMarkers(newMarkers);
      }
    } catch (e) {
      // Ignorar erros de cálculo de marcadores
    }
    
    // 3. Verificar se é necessário redimensionar o gráfico
    if (chartContainerRef.current) {
      const width = chartContainerRef.current.clientWidth;
      const height = chartContainerRef.current.clientHeight;
      
      // Apenas redimensionar se as dimensões mudaram significativamente
      if (Math.abs(width - chartSizeRef.current.width) > 5 || 
          Math.abs(height - chartSizeRef.current.height) > 5) {
        
        // Atualizar dimensões de referência
        chartSizeRef.current = { width, height };
        
        // Aplicar redimensionamento se as dimensões são válidas
        if (width > 0 && height > 0) {
          chartRef.current.resize(width, height);
        }
      }
    }
  };
  
  // EFEITO PRINCIPAL: Criar o gráfico uma única vez
  useEffect(() => {
    // Evitar criação duplicada do gráfico
    if (isInitializedRef.current || !chartContainerRef.current) return;
    
    // Obter dimensões iniciais do container
    const containerWidth = chartContainerRef.current.clientWidth || 300;
    const containerHeight = chartContainerRef.current.clientHeight || 300;
    
    // Atualizar referência de tamanho
    chartSizeRef.current = { width: containerWidth, height: containerHeight };

    // Configurações do time scale simplificadas
    const timeScaleOptions: TimeScaleOptions = {
      timeVisible: true,
      secondsVisible: true,
      borderColor: '#1a1a1a',
      rightOffset: 30,
      barSpacing: 10,
      fixLeftEdge: true,
      fixRightEdge: true,
      lockVisibleTimeRangeOnResize: true,
      rightBarStaysOnScroll: true,
    };

    // Criar gráfico com configurações simplificadas
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#d9d9d9',
      },
      width: containerWidth,
      height: containerHeight,
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      timeScale: timeScaleOptions,
      rightPriceScale: {
        borderColor: '#1a1a1a',
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    // Adicionar série de velas
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Armazenar referências
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    
    // Marcar como inicializado
    isInitializedRef.current = true;
    
    // Configurar timer para atualizar o gráfico em intervalos regulares
    updateTimerRef.current = setInterval(() => {
      applyChartUpdates();
    }, 2000); // Atualização a cada 2 segundos
    
    // Aplicar dados iniciais após um curto delay
    setTimeout(() => {
      if (chartData && chartData.length > 0 && seriesRef.current) {
        seriesRef.current.setData(chartData);
        
        // Configurar visibilidade inicial
        chartRef.current?.timeScale().fitContent();
        
        // Atualizar marcadores
        setTimeout(() => {
          const newMarkers = calculateMarkerPositions();
          setCustomMarkers(newMarkers);
        }, 100);
      }
    }, 500);
    
    // Configurar um único evento de redimensionamento simplificado
    const handleResize = () => {
      // Apenas aplicar redimensionamento após um delay
      setTimeout(() => {
        if (chartRef.current && chartContainerRef.current) {
          const width = chartContainerRef.current.clientWidth;
          const height = chartContainerRef.current.clientHeight;
          
          if (width > 0 && height > 0) {
            chartRef.current.resize(width, height);
            chartSizeRef.current = { width, height };
          }
        }
      }, 500);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Limpar recursos
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
      
      isInitializedRef.current = false;
    };
  }, []); // Dependências vazias - executar apenas uma vez

  // Efeito simplificado para monitorar mudanças nos dados do gráfico
  useEffect(() => {
    // Aplicar atualizações ao gráfico quando os dados mudarem
    if (isInitializedRef.current && chartData && chartData.length > 0) {
      applyChartUpdates();
    }
  }, [chartData]);
  
  // Efeito simplificado para monitorar mudanças nas operações
  useEffect(() => {
    // Atualizar marcadores quando as operações mudarem
    if (isInitializedRef.current && operations.length > 0) {
      // Apenas atualizar marcadores, sem redimensionar ou aplicar outras mudanças
      const newMarkers = calculateMarkerPositions();
      setCustomMarkers(newMarkers);
      
      // Atualizar operação ativa para mostrar overlay
      const pendingOperations = operations.filter(op => op.status === 'pending');
      if (pendingOperations.length > 0) {
        const latestOperation = pendingOperations.reduce((latest, op) => 
          op.entryTime > latest.entryTime ? op : latest, pendingOperations[0]);
        
        setActiveOperation(latestOperation);
        
        // Adicionar linha de preço se necessário
        if (seriesRef.current) {
          // Remover linha existente
          if (entryPriceLineRef.current) {
            seriesRef.current.removePriceLine(entryPriceLineRef.current);
          }
          
          // Adicionar nova linha
          const options: PriceLineOptions = {
            price: latestOperation.entryPrice,
            color: latestOperation.direction === 'up' ? '#00FF00' : '#FF0000',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: latestOperation.direction === 'up' ? '▲ COMPRA' : '▼ VENDA',
          };
          
          entryPriceLineRef.current = seriesRef.current.createPriceLine(options);
        }
      } else if (activeOperation && entryPriceLineRef.current && seriesRef.current) {
        // Remover linha de preço se não há operações pendentes
        seriesRef.current.removePriceLine(entryPriceLineRef.current);
        entryPriceLineRef.current = null;
        setActiveOperation(null);
      }
    }
  }, [operations]);
  
  // Efeito para dados em tempo real simplificado
  useEffect(() => {
    if (!lastRealTimeUpdate || !seriesRef.current || !isInitializedRef.current) return;
    
    try {
      // Criar uma nova vela com base nos dados em tempo real
      const timestamp = Math.floor(new Date(lastRealTimeUpdate.time_stamp).getTime() / 1000);
      
      // Obter dados completos da vela
      const open = lastRealTimeUpdate.open;
      const close = lastRealTimeUpdate.close;
      const high = lastRealTimeUpdate.high;
      const low = lastRealTimeUpdate.low;
      
      // Calcular o timestamp alinhado
      const interval = 30;
      const alignedTimestamp = Math.floor(timestamp / interval) * interval;
      
      // Criar objeto de vela
      const candle: CandlestickData = {
        time: alignedTimestamp,
        open,
        high,
        low,
        close
      };
      
      // Verificar se a vela realmente mudou
      const lastCandle = lastCandleRef.current;
      const hasChanged = !lastCandle || 
                         lastCandle.time !== candle.time ||
                         lastCandle.close !== candle.close;
      
      if (hasChanged) {
        // Armazenar a última vela
        lastCandleRef.current = candle;
        
        // Atualizar a vela no gráfico - apenas uma vez por execução
        seriesRef.current.update(candle);
        
        // Atualizar o timestamp da última atualização
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      // Ignorar erros de atualização
    }
  }, [lastRealTimeUpdate]);
  
  // Efeito para inscrever-se no ativo selecionado
  useEffect(() => {
    if (!selectedAsset || !isWebSocketConnected) return;
    
    const pusherService = getPusherService();
    const assetSymbol = selectedAsset.symbol;
    
    // Cancelar inscrição atual se houver
    if (currentSubscription && currentSubscription !== assetSymbol) {
      pusherService.unsubscribeFromAsset(currentSubscription);
    }
    
    // Inscrever-se no novo ativo
    pusherService.subscribeToAsset(assetSymbol, (data) => {
      // Extrair preço dos dados
      const price = data.price || data.close;
      if (price) {
        // Criar um objeto de candle simplificado para os dados em tempo real
        const timestamp = new Date();
        const realTimeUpdate = {
          time_stamp: timestamp.toISOString(),
          symbol: assetSymbol,
          open: price,
          close: price,
          high: price,
          low: price,
          volume: 0,
          count: 0
        };
        
        // Atualizar o estado apenas se necessário
        const currentLastUpdate = useTradingStore.getState().lastRealTimeUpdate;
        if (!currentLastUpdate || 
            currentLastUpdate.close !== price || 
            currentLastUpdate.symbol !== assetSymbol) {
          // Atualizar a última atualização em tempo real
          useTradingStore.setState({ lastRealTimeUpdate: realTimeUpdate });
        }
      }
    });
    
    // Atualizar a inscrição atual
    setCurrentSubscription(assetSymbol);
    
    // Limpar inscrição ao desmontar ou mudar de ativo
    return () => {
      if (assetSymbol && pusherService.isConnectedStatus) {
        pusherService.unsubscribeFromAsset(assetSymbol);
      }
    };
  }, [selectedAsset, isWebSocketConnected]);

  // Manipuladores para selecionar ativo e timeframe
  const handleAssetSelect = (assetId: string) => {
    selectAsset(assetId);
    setShowAssetDropdown(false);
    setSearchTerm('');
  };

  // Função para destacar texto pesquisado
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-400 bg-opacity-30 text-yellow-300 font-medium">
          {part}
        </span>
      ) : part
    );
  };
  
  // Renderizar sobreposição visual para operação ativa
  const renderActiveOperationOverlay = () => {
    if (!activeOperation || !lastRealTimeUpdate) return null;
    
    const currentPrice = lastRealTimeUpdate.close;
    const isWinning = activeOperation.direction === 'up' 
      ? currentPrice > activeOperation.entryPrice
      : currentPrice < activeOperation.entryPrice;
    
    // Cálculo do tempo restante
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = activeOperation.expiryTime - now;
    const timePercent = Math.max(0, Math.min(100, (timeLeft / (activeOperation.duration / 1000)) * 100));
    
    // Só mostrar se ainda tiver tempo restante
    if (timeLeft <= 0) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Faixa no topo indicando a direção e status */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${isWinning ? 'bg-green-500' : 'bg-red-500'}`}></div>
        
        {/* Overlay de cor na parte de cima ou de baixo dependendo da direção */}
        {activeOperation.direction === 'up' && (
          <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-green-500 bg-opacity-5 border-b border-green-500"></div>
        )}
        {activeOperation.direction === 'down' && (
          <div className="absolute top-1/2 left-0 right-0 bottom-0 bg-red-500 bg-opacity-5 border-t border-red-500"></div>
        )}
        
        {/* Indicador de tempo restante */}
        <div className="absolute bottom-2 left-2 right-2 h-1 bg-gray-700 rounded">
          <div 
            className={`h-full rounded ${isWinning ? 'bg-green-500' : 'bg-red-500'}`} 
            style={{ width: `${timePercent}%` }}
          ></div>
        </div>
        
        {/* Texto com informações sobre a operação */}
        <div className="absolute bottom-4 left-2 bg-black bg-opacity-70 p-1 rounded text-xs">
          <span className={isWinning ? 'text-green-500' : 'text-red-500'}>
            {activeOperation.direction === 'up' ? '▲ COMPRA' : '▼ VENDA'} | 
            Tempo: {timeLeft}s | 
            Entrada: {activeOperation.entryPrice.toFixed(2)} | 
            Atual: {currentPrice.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  // Função para renderizar os marcadores personalizados
  const renderCustomMarkers = () => {
    return customMarkers.map(marker => {
      // Determinar o estilo com base na direção e status
      const isEntry = marker.id.includes('-entry');
      const isWin = marker.status === 'win';
      const isLoss = marker.status === 'loss';
      
      // Classes CSS para o círculo externo
      let circleClass = 'absolute rounded-full flex items-center justify-center';
      let iconClass = '';
      
      // Apenas para marcadores de entrada
      if (isEntry) {
        if (marker.direction === 'up') {
          // Marcador de compra (verde)
          circleClass += ' w-7 h-7 border-2 border-green-500 bg-black';
          iconClass = 'text-green-500';
        } else {
          // Marcador de venda (vermelho)
          circleClass += ' w-7 h-7 border-2 border-red-500 bg-black';
          iconClass = 'text-red-500';
        }
      } 
      // Para marcadores de expiração
      else {
        if (isWin) {
          // Marcador de ganho (verde)
          circleClass += ' w-7 h-7 border-2 border-green-500 bg-green-500';
          iconClass = 'text-white';
        } else if (isLoss) {
          // Marcador de perda (vermelho)
          circleClass += ' w-7 h-7 border-2 border-red-500 bg-red-500';
          iconClass = 'text-white';
        } else {
          // Marcador pendente ou expirado (amarelo)
          circleClass += ' w-7 h-7 border-2 border-yellow-500 bg-black';
          iconClass = 'text-yellow-500';
        }
      }
      
      // Aplicar transformação para centralizar o marcador no ponto correto
      const style = {
        transform: `translate(-50%, -50%)`,
        left: `${marker.x}px`,
        top: `${marker.y}px`,
        zIndex: 1000
      };
      
      return (
        <div 
          key={marker.id} 
          className={circleClass} 
          style={style}
          title={`Operação ${marker.direction === 'up' ? 'COMPRA' : 'VENDA'}`}
        >
          {isEntry ? (
            marker.direction === 'up' ? (
              <ArrowUp className={`h-4 w-4 ${iconClass}`} />
            ) : (
              <ArrowDown className={`h-4 w-4 ${iconClass}`} />
            )
          ) : (
            <div className={`text-xs font-bold ${iconClass}`}>
              {isWin ? '✓' : isLoss ? '✗' : '⏱️'}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Cabeçalho do gráfico - apenas para desktop */}
      {!isMobile && (
        <div className="flex flex-col sm:flex-row justify-between items-center p-2 gap-2 bg-black border-b border-zinc-900">
          {/* Seletor de Ativo - Melhorado com pesquisa */}
          <div className="relative" ref={assetDropdownRef}>
            <div 
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 cursor-pointer hover:bg-zinc-700 hover:border-zinc-600 transition-all duration-200 shadow-lg" 
              onClick={() => setShowAssetDropdown(!showAssetDropdown)}
            >
              <div className="flex items-center space-x-3">
                {/* Logo do ativo */}
                <div className="relative">
                  {selectedAsset && selectedAsset.logo ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500 ring-opacity-50">
                      <Image 
                        src={selectedAsset.logo}
                        alt={selectedAsset.name}
                        
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-500 ring-opacity-50">
                      {selectedAsset ? selectedAsset.name.charAt(0) : 'A'}
                    </div>
                  )}
                  
                  {/* Indicador de status */}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${
                    selectedAsset?.isOpen ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                
                {/* Informações do ativo */}
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold text-sm">
                      {selectedAsset ? selectedAsset.name : 'Selecione um ativo'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                  
                  {/* Informações adicionais - Apenas payout */}
                  <div className="flex items-center mt-1">
                    {selectedAsset?.profitPayout && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3 text-green-400" />
                        <span className="text-green-400 text-xs font-medium">
                          {selectedAsset.profitPayout}% payout
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Dropdown de Ativos com pesquisa */}
            {showAssetDropdown && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden">
                {/* Campo de pesquisa */}
                <div className="p-3 border-b border-zinc-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Pesquisar ativo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Lista de ativos */}
                <div className="max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-gray-400 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Carregando ativos...
                    </div>
                  ) : error ? (
                    <div className="p-4 text-red-400 text-center">Erro: {error}</div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="p-4 text-yellow-400 text-center">
                      {searchTerm ? 'Nenhum ativo encontrado' : 'Nenhum ativo disponível no momento'}
                    </div>
                  ) : (
                    filteredAssets.map(asset => (
                      <div 
                        key={asset.id}
                        className={`p-3 flex items-center hover:bg-zinc-700 cursor-pointer transition-colors ${
                          selectedAsset?.id === asset.id ? 'bg-zinc-700 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleAssetSelect(asset.id)}
                      >
                        <div className="relative mr-3">
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
                          
                          {/* Indicador de status */}
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-800 ${
                            asset.isOpen ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">
                              {highlightSearchTerm(asset.name, searchTerm)}
                            </span>
                            {asset.profitPayout && (
                              <span className="text-green-400 text-sm font-medium">
                                {asset.profitPayout}%
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs ${
                              asset.isOpen ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {asset.isOpen ? 'Mercado aberto' : 'Mercado fechado'}
                            </span>
                            
                            {asset.market && (
                              <span className="text-gray-400 text-xs">• {asset.market}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Status do WebSocket e indicador de carregamento */}
          <div className="flex items-center space-x-2">
            {/* Indicador de operações ativas */}
            {activeOperation && (
              <div className={`text-xs ${activeOperation.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {activeOperation.direction === 'up' ? '▲ COMPRA' : '▼ VENDA'} em andamento
              </div>
            )}
            
            {/* Indicador de carregamento do gráfico */}
            {isLoadingChart && (
              <div className="flex items-center text-gray-400 text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                <span>Carregando gráfico...</span>
              </div>
            )}
            
            {/* Mensagem de erro do gráfico */}
            {chartError && (
              <div className="text-red-400 text-xs mx-2">
                Erro: {chartError}
              </div>
            )}
          </div>
          
          {/* Tempo de Operação (Display) */}
          <div className="flex items-center space-x-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-400">Tempo de Operação</div>
              <div className="text-white font-semibold text-sm">
                {selectedTimeFrame || '30s'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative flex-1 w-full h-full">
        {/* Overlay de carregamento */}
        {isLoadingChart && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
              <span className="text-white text-sm">Carregando dados do gráfico...</span>
            </div>
          </div>
        )}
        
        {/* Overlay de erro */}
        {chartError && !isLoadingChart && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="bg-zinc-900 p-4 rounded-md max-w-xs text-center">
              <div className="text-red-400 text-lg mb-2">Erro ao carregar dados</div>
              <div className="text-gray-300 text-sm">{chartError}</div>
              <button 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => fetchChartData()}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
        
        {/* Overlay para operação ativa */}
        {renderActiveOperationOverlay()}
        
        {/* Container do gráfico */}
        <div ref={chartContainerRef} className="w-full h-full" />
        
        {/* Camada de marcadores personalizados */}
        <div ref={markersLayerRef} className="absolute inset-0 pointer-events-none">
          {renderCustomMarkers()}
        </div>
      </div>
    </div>
  );
}