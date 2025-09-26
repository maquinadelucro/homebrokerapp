import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/security';
import { db } from '@/lib/database/client';
import { trades, assets, users, sessions, userIdentities, tradingAccounts } from '../../../../../shared/schema';
import { eq, and, sql, gt } from 'drizzle-orm';
import { createHash } from 'crypto';
import { getUserBrokerToken, getUserDefaultAccount } from '@/lib/database/operations';

// URL da API de trading
const TRADE_API_URL = 'https://trade-api-edge.homebroker.com/op/';

// Função para obter userId autenticado da sessão
async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const sessionToken = authHeader.substring(7);
    const hashedToken = createHash('sha256').update(sessionToken).digest('hex');
    
    const session = await db.select({ userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          eq(sessions.sessionTokenHash, hashedToken),
          sql`${sessions.revokedAt} IS NULL`,
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);
      
    return session.length > 0 ? session[0].userId : null;
  } catch (error) {
    console.error('❌ Erro ao verificar autenticação:', error);
    return null;
  }
}

// Função centralizada em @/lib/database/operations

export async function POST(request: Request) {
  try {
    safeLog('🎯 Tentativa de criar operação de trading...');
    
    // Verificar autenticação
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      console.log('❌ Usuário não autenticado');
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }
    
    // Obter os dados do corpo da requisição
    const body = await request.json();
    const { tradeData, accountId } = body;
    
    // Determinar qual conta usar (accountId fornecido ou conta padrão)
    let targetAccount;
    if (accountId) {
      // Verificar se a conta pertence ao usuário E é conta Real
      const [account] = await db.select()
        .from(tradingAccounts)
        .where(and(
          eq(tradingAccounts.id, accountId),
          eq(tradingAccounts.userId, userId),
          eq(tradingAccounts.accountType, 'real'), // Forçar apenas contas Real
          eq(tradingAccounts.isActive, true)
        ))
        .limit(1);
      
      if (!account) {
        console.log('❌ Conta não encontrada ou não pertence ao usuário');
        return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
      }
      targetAccount = account;
    } else {
      // Usar conta padrão
      const defaultAccount = await getUserDefaultAccount(userId);
      if (!defaultAccount) {
        console.log('❌ Nenhuma conta padrão encontrada para o usuário');
        return NextResponse.json({ error: 'Nenhuma conta de trading configurada' }, { status: 404 });
      }
      targetAccount = defaultAccount;
    }
    
    // Obter token do broker para a conta específica
    const brokerToken = await getUserBrokerToken(userId, targetAccount.id);
    if (!brokerToken) {
      console.log('❌ Token do broker não encontrado para a conta');
      return NextResponse.json({ error: 'Token do broker não encontrado para a conta' }, { status: 401 });
    }
    
    if (!tradeData) {
      console.log('❌ Dados da operação não fornecidos');
      return NextResponse.json({ error: 'Dados da operação não fornecidos' }, { status: 400 });
    }
    
    // Sistema opera apenas com contas Real
    const operationData = {
      ...tradeData,
      account_type: 'real' // Sempre 'real' conforme especificação
    };
    
    safeLog('📊 Dados da operação:', {
      id: operationData.id,
      direction: operationData.direction,
      bet_value_usd_cents: operationData.bet_value_usd_cents,
      duration_milliseconds: operationData.duration_milliseconds,
      ticker_symbol: operationData.ticker_symbol,
      account_type: operationData.account_type,
      currency: operationData.currency
    });
    
    // Fazer a requisição para a API externa
    const response = await fetch(TRADE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${brokerToken}`,
      },
      body: JSON.stringify(operationData)
    });
    
    safeLog('📡 Resposta da API de operação:', {
      status: response.status,
      statusText: response.statusText,
      url: TRADE_API_URL
    });
    
    // Obter o texto da resposta para debug
    const responseText = await response.text();
    
    // Tentar converter para JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('❌ Erro ao fazer parse da resposta:', responseText);
      return NextResponse.json(
        { error: 'Erro ao processar resposta da API externa', responseText },
        { status: 500 }
      );
    }
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      console.log('❌ Falha ao criar operação:', responseData);
      return NextResponse.json(
        { error: 'Falha ao criar operação', details: responseData },
        { status: response.status }
      );
    }
    
    safeLog('✅ Operação criada com sucesso:', {
      operationId: responseData.id || operationData.id
    });
    
    // Salvar operação na tabela local para polling
    try {
      // Verificar se o ativo existe na tabela local
      let existingAsset = await db.select()
        .from(assets)
        .where(eq(assets.symbol, operationData.ticker_symbol))
        .limit(1);
      
      let assetId: number;
      if (existingAsset.length === 0) {
        // Criar ativo se não existir
        const [newAsset] = await db.insert(assets).values({
          symbol: operationData.ticker_symbol,
          name: operationData.ticker_symbol,
          market: 'otc',
          minBetCents: 100,
          payoutRateBps: 8000
        }).returning({ id: assets.id });
        assetId = newAsset.id;
      } else {
        assetId = existingAsset[0].id;
      }
      
      // Usar o userId autenticado da sessão
      // (userId já foi verificado no início da função)
      
      const startTime = new Date();
      const expiryTime = new Date(startTime.getTime() + operationData.duration_milliseconds);
      
      // Salvar operação na tabela trades
      await db.insert(trades).values({
        userId: userId,
        accountId: targetAccount.id, // Associar à conta específica
        assetId: assetId,
        direction: operationData.direction as 'up' | 'down',
        amountCents: operationData.bet_value_usd_cents,
        durationMs: operationData.duration_milliseconds,
        startTime: startTime,
        expiryTime: expiryTime,
        entryPrice: '0', // Será atualizado quando disponível
        result: 'pending',
        accountType: 'real', // Sistema opera apenas com contas Real
        externalOpId: responseData.id || operationData.id,
        isMartingale: false,
        martingaleLevel: 0
      });
      
      console.log(`💾 Operação salva na tabela local: ${responseData.id || operationData.id}`);
      
    } catch (dbError) {
      console.error('⚠️ Erro ao salvar operação na tabela local:', dbError);
      // Não falha a operação principal, apenas registra o erro
    }
    
    // Retornar os dados da resposta
    return NextResponse.json(responseData, { status: 201 });
    
  } catch (error) {
    console.error('❌ Erro interno ao processar criação de operação:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar criação de operação' },
      { status: 500 }
    );
  }
}