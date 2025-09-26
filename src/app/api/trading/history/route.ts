import { NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { sessions } from '../../../../../shared/schema';
import { eq, and, sql, gt } from 'drizzle-orm';
import { createHash } from 'crypto';
import { getUserTrades } from '@/lib/database/operations';

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

export async function GET(request: Request) {
  try {
    console.log('📊 Tentativa de buscar histórico de operações...');
    
    // Verificar autenticação
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      console.log('❌ Usuário não autenticado');
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }
    
    // Obter parâmetros de query com validação
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    // Validar e sanitizar parâmetros de paginação
    let limit = parseInt(limitParam || '50');
    let offset = parseInt(offsetParam || '0');
    
    // Validação contra NaN e limites
    if (isNaN(limit) || limit < 1) limit = 50;
    if (isNaN(offset) || offset < 0) offset = 0;
    if (limit > 100) limit = 100; // Máximo 100 para performance
    
    console.log(`📊 Buscando histórico para usuário ${userId} (limit: ${limit}, offset: ${offset})`);
    
    // Buscar operações do usuário
    const userTrades = await getUserTrades(userId, limit, offset);
    
    console.log(`✅ Histórico carregado: ${userTrades.length} operações encontradas`);
    
    return NextResponse.json({
      trades: userTrades,
      pagination: {
        limit,
        offset,
        hasMore: userTrades.length === limit
      }
    });
    
  } catch (error) {
    console.error('❌ Erro interno ao buscar histórico:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar histórico de operações' },
      { status: 500 }
    );
  }
}