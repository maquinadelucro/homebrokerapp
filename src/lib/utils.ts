import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Asset } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Função para verificar se um ativo está aberto para negociação no momento atual
export function isAssetOpenForTrading(asset: Asset): boolean {
  if (!asset.isActive) {
    return false;
  }
  
  if (!asset.tradingHours) {
    return true; // Se não há informações de horário, assumimos que está aberto
  }
  
  // Obter a data e hora atuais em UTC
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();
  
  // Converter para o formato "HH:MM:SS" para comparação
  const currentTimeString = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')}`;
  
  // Obter o dia da semana atual (0 = domingo, 1 = segunda, ..., 6 = sábado)
  const dayOfWeek = now.getUTCDay();
  
  // Mapear o dia da semana para o campo correspondente no objeto tradingHours
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const day = dayMap[dayOfWeek];
  
  // Obter os horários de negociação para o dia atual
  const dayTradingHours = asset.tradingHours[day];
  
  if (!dayTradingHours) {
    return false; // Se não há horários definidos para este dia, assumimos que está fechado
  }
  
  // Verificar se o horário atual está dentro do período de negociação
  const { start, end, secondStart, secondEnd } = dayTradingHours;
  
  // Primeiro período
  const isInFirstPeriod = currentTimeString >= start && currentTimeString <= end;
  
  // Segundo período (se existir)
  let isInSecondPeriod = false;
  if (secondStart && secondEnd) {
    isInSecondPeriod = currentTimeString >= secondStart && currentTimeString <= secondEnd;
  }
  
  return isInFirstPeriod || isInSecondPeriod;
}

// Função para formatar um horário de forma amigável
export function formatTradingHours(asset: Asset): string {
  if (!asset.tradingHours) {
    return "Disponível 24/7";
  }
  
  // Obter o dia da semana atual
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const day = dayMap[dayOfWeek];
  
  // Obter os horários de negociação para o dia atual
  const dayTradingHours = asset.tradingHours[day];
  
  if (!dayTradingHours) {
    return "Fechado hoje";
  }
  
  const { start, end, secondStart, secondEnd } = dayTradingHours;
  
  // Formatar horários para exibição (converter de "HH:MM:SS" para "HH:MM")
  const formatTime = (time: string) => time.substring(0, 5);
  
  let hoursText = `${formatTime(start)} - ${formatTime(end)} UTC`;
  
  if (secondStart && secondEnd) {
    hoursText += ` e ${formatTime(secondStart)} - ${formatTime(secondEnd)} UTC`;
  }
  
  return hoursText;
}