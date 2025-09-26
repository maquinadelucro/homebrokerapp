import { NextResponse } from 'next/server';
import { getSessionByToken, revokeSession } from '@/lib/database/operations';
import { createHash } from 'crypto';

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 401 });
    }
    
    // Criar hash do token para buscar a sessão
    const sessionTokenHash = createHash('sha256').update(sessionToken).digest('hex');
    
    // Buscar a sessão pelo hash do token
    const session = await getSessionByToken(sessionTokenHash);
    
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }
    
    // Revogar a sessão usando o ID
    await revokeSession(session.id);
    
    // Criar resposta de sucesso
    const response = NextResponse.json({ success: true });
    
    // Limpar cookie de sessão
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Erro durante logout:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' }, 
      { status: 500 }
    );
  }
}