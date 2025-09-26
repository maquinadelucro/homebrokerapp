'use client';

import React, { useEffect, useState } from 'react';
import { useTradingStore } from '@/lib/trading-store';
import { Play, Settings, TrendingUp } from 'lucide-react';
import Image from 'next/image';

export default function TradeControls() {
  const {
    assets,
    selectedAsset,
    timeFrames,
    selectedTimeFrame,
    aiModels,
    strategies,
    tradeConfig,
    updateTradeConfig,
    isTrading,
    startTrading,
    stopTrading,
    fetchAssets,
    selectAsset,
    selectTimeFrame,
    isLoading,
    error
  } = useTradingStore();

  // Buscar ativos ao carregar o componente
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const selectedAI = aiModels.find(ai => ai.id === tradeConfig.aiModel);
  const selectedStrategy = strategies.find(s => s.id === tradeConfig.strategy);

  const handleStartTrade = () => {
    if (!isTrading) {
      startTrading();
    } else {
      stopTrading();
    }
  };

  const handleValueChange = (field: keyof typeof tradeConfig, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateTradeConfig({ [field]: numValue });
    }
  };

  const handleAssetSelect = (assetId: string) => {
    selectAsset(assetId);
  };

  const handleTimeFrameSelect = (timeFrame: string) => {
    selectTimeFrame(timeFrame);
  };

  const openAssetDropdown = () => {
    document.getElementById('assetDropdown')?.classList.toggle('hidden');
  };

  return (
    <div className="bg-zinc-900 rounded p-4 flex flex-col gap-3">
      {/* Asset Selection */}
      <div className="relative">
        <div 
          className="bg-zinc-800 rounded p-3 flex items-center justify-between cursor-pointer"
          onClick={openAssetDropdown}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Asset</span>
          </div>
          <div className="flex items-center">
            {selectedAsset && (
              <>
                {selectedAsset.logo && (
                  <div className="w-6 h-6 mr-2 relative">
                    <Image 
                      src={selectedAsset.logo}
                      alt={selectedAsset.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  </div>
                )}
                <span className="text-white">{selectedAsset.name}</span>
              </>
            )}
            <svg 
              className="w-5 h-5 text-gray-400 ml-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Asset Dropdown */}
        <div id="assetDropdown" className="absolute left-0 right-0 mt-1 bg-zinc-800 rounded max-h-60 overflow-y-auto z-10 hidden">
          {isLoading ? (
            <div className="p-3 text-center text-gray-400">Carregando ativos...</div>
          ) : error ? (
            <div className="p-3 text-center text-red-400">Erro ao carregar ativos: {error}</div>
          ) : assets.length === 0 ? (
            <div className="p-3 text-center text-yellow-400">Nenhum ativo disponível</div>
          ) : (
            assets.map(asset => (
              <div 
                key={asset.id}
                className={`p-3 flex items-center hover:bg-zinc-700 cursor-pointer ${selectedAsset?.id === asset.id ? 'bg-zinc-700' : ''}`}
                onClick={() => {
                  handleAssetSelect(asset.id);
                  document.getElementById('assetDropdown')?.classList.add('hidden');
                }}
              >
                {asset.logo && (
                  <div className="w-6 h-6 mr-2 relative">
                    <Image 
                      src={asset.logo}
                      alt={asset.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  </div>
                )}
                <span className="text-white">{asset.name}</span>
                {asset.profitPayout && (
                  <span className="ml-auto text-green-400">{asset.profitPayout}%</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Time Frame Selection */}
      <div className="relative">
        <div 
          className="bg-zinc-800 rounded p-3 flex items-center justify-between cursor-pointer"
          onClick={() => document.getElementById('timeFrameDropdown')?.classList.toggle('hidden')}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Tempo</span>
          </div>
          <div className="flex items-center">
            <span className="text-white">{selectedTimeFrame || 'Selecione'}</span>
            <svg 
              className="w-5 h-5 text-gray-400 ml-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Time Frame Dropdown */}
        <div id="timeFrameDropdown" className="absolute left-0 right-0 mt-1 bg-zinc-800 rounded max-h-60 overflow-y-auto z-10 hidden">
          {selectedAsset && timeFrames[selectedAsset.id] ? (
            timeFrames[selectedAsset.id].map((timeFrame, index) => (
              <div 
                key={index}
                className={`p-3 flex items-center hover:bg-zinc-700 cursor-pointer ${selectedTimeFrame === timeFrame ? 'bg-zinc-700' : ''}`}
                onClick={() => {
                  handleTimeFrameSelect(timeFrame);
                  document.getElementById('timeFrameDropdown')?.classList.add('hidden');
                }}
              >
                <span className="text-white">{timeFrame}</span>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-gray-400">Nenhum tempo disponível</div>
          )}
        </div>
      </div>

      {/* Rest of the component remains the same */}
      {/* AI Selection */}
      <div className="bg-zinc-800 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Artificial Intelligence</span>
        </div>
        <div className="flex items-center">
          <span className="text-white">{selectedAI?.name}</span>
          <svg 
            className="w-5 h-5 text-gray-400 ml-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="bg-zinc-800 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Strategy</span>
        </div>
        <div className="flex items-center">
          <span className="text-white">{selectedStrategy?.name}</span>
          <svg 
            className="w-5 h-5 text-gray-400 ml-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Entry Value */}
      <div className="bg-zinc-800 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Entry value</span>
        </div>
        <div className="flex items-center">
          <span className="text-white mr-2">R$</span>
          <input
            type="number"
            value={tradeConfig.entryValue}
            onChange={(e) => handleValueChange('entryValue', e.target.value)}
            className="bg-transparent text-white text-right w-16 focus:outline-none"
          />
        </div>
      </div>

      {/* Goal */}
      <div className="bg-zinc-800 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Goal</span>
        </div>
        <div className="flex items-center">
          <span className="text-white mr-2">R$</span>
          <input
            type="number"
            value={tradeConfig.goal}
            onChange={(e) => handleValueChange('goal', e.target.value)}
            className="bg-transparent text-white text-right w-16 focus:outline-none"
          />
        </div>
      </div>

      {/* Stop Loss */}
      <div className="bg-zinc-800 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Stop loss</span>
        </div>
        <div className="flex items-center">
          <span className="text-white mr-2">R$</span>
          <input
            type="number"
            value={tradeConfig.stopLoss}
            onChange={(e) => handleValueChange('stopLoss', e.target.value)}
            className="bg-transparent text-white text-right w-16 focus:outline-none"
          />
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStartTrade}
        className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-4 rounded flex items-center justify-center gap-2 mt-2"
      >
        <Play className="h-5 w-5" />
        {isTrading ? 'STOP' : 'START'}
      </button>

      {/* Configure Automatically */}
      <button className="text-white flex items-center justify-center gap-2 mt-2">
        <Settings className="h-4 w-4" />
        CONFIGURE AUTOMATICALLY
      </button>

      {/* Recommended Assets */}
      <button className="text-white flex items-center justify-center gap-2">
        <TrendingUp className="h-4 w-4" />
        RECOMMENDED ASSETS
      </button>
    </div>
  );
}