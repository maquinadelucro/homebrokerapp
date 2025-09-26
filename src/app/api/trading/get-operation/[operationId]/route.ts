import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/security';
import { createHash } from 'crypto';
import { db } from '@/lib/database/client';
import { trades, sessions, userIdentities, tradingAccounts } from '../../../../../../shared/schema';
import { eq, and, sql, gt } from 'drizzle-orm';
import { getUserBrokerToken } from '@/lib/database/operations';

// URL da API de consulta de operações
const GET_OPERATION_API_URL = 'https://bot-trade-api.homebroker.com/op/get';

// Função para obter userId autenticado da sessão
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
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

// Função para verificar ownership da operação e retornar accountId
async function verifyOperationOwnership(userId: string, externalOpId: string): Promise<{ hasOwnership: boolean; accountId?: string }> {
  try {
    const operation = await db.select({ 
      id: trades.id, 
      accountId: trades.accountId 
    })
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          eq(trades.externalOpId, externalOpId)
        )
      )
      .limit(1);
      
    if (operation.length > 0) {
      return { 
        hasOwnership: true, 
        accountId: operation[0].accountId || undefined 
      };
    }
    
    return { hasOwnership: false };
  } catch (error) {
    console.error('❌ Erro ao verificar ownership:', error);
    return { hasOwnership: false };
  }
}

interface OperationData {
  id: string;
  direction: 'up' | 'down';
  bet_value_usd_cents: number;
  ticker_symbol: string;
  status: string;
  profit_usd_cents?: number;
  result?: string;
  start_price?: number;
  end_price?: number;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { operationId: string } }
) {
  try {
    const { operationId } = params;

    safeLog('📊 Consultando dados da operação:', {
      operationId
    });
    
    // Verificar autenticação
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      console.log('❌ Usuário não autenticado');
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    if (!operationId) {
      console.log('❌ ID da operação não fornecido');
      return NextResponse.json(
        { error: 'ID da operação é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem permissão para acessar esta operação
    const ownership = await verifyOperationOwnership(userId, operationId);
    if (!ownership.hasOwnership) {
      console.log('❌ Usuário não tem permissão para acessar esta operação');
      return NextResponse.json({ error: 'Operação não encontrada' }, { status: 404 });
    }

    // Verificar se a operação tem accountId associado (para operações novas)
    if (!ownership.accountId) {
      console.log('⚠️ Operação sem conta associada - usando conta padrão para backward compatibility');
      // Para operações antigas que não têm accountId, usar método legado se necessário
      // Por ora, retornar erro para forçar migração
      return NextResponse.json({ error: 'Operação sem conta associada' }, { status: 400 });
    }

    // Obter token do broker para a conta específica
    const brokerToken = await getUserBrokerToken(userId, ownership.accountId);
    if (!brokerToken) {
      console.log('❌ Token do broker não encontrado para a conta');
      return NextResponse.json({ error: 'Token do broker não encontrado para a conta' }, { status: 401 });
    }

    // Fazer requisição para API do HomeBroker
    const response = await fetch(`${GET_OPERATION_API_URL}/${operationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${brokerToken}`,
        'Content-Type': 'application/json',
      }
    });

    safeLog('📡 Resposta da API de consulta:', {
      status: response.status,
      statusText: response.statusText,
      url: `${GET_OPERATION_API_URL}/${operationId}`
    });

    // Obter o texto da resposta para debug
    const responseText = await response.text();
    
    // Tentar converter para JSON
    let responseData: OperationData;
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
      console.log('❌ Falha ao consultar operação:', responseData);
      return NextResponse.json(
        { error: 'Operação não encontrada', details: responseData },
        { status: response.status }
      );
    }

    safeLog('✅ Dados da operação obtidos com sucesso:', {
      operationId: responseData.id,
      status: responseData.status,
      result: responseData.result,
      profit: responseData.profit_usd_cents
    });

    // Retornar os dados da operação
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erro interno ao consultar operação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao consultar operação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}