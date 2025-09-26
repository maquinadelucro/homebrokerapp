import { NextResponse } from 'next/server';
import { createUser, getUserByEmail, createUserIdentity, getUserIdentityByProvider, updateUserIdentityTokens, createSession, logUserAction, ensureUserHasTradingAccount } from '@/lib/database/operations';
import { safeLog, TokenCrypto } from '@/lib/utils/security';
import crypto from 'crypto';

// URL da API de autenticação (corrigida para o domínio correto)
const AUTH_API_URL = 'https://bot-account-manager-api.homebroker.com/v3/login';

export async function POST(request: Request) {
  try {
    // Obter os dados de login do corpo da requisição
    const body = await request.json();
    
    // Verificar credenciais da aplicação a partir das variáveis de ambiente
    const APP_LOGIN = process.env.HOMEBROKER_APP_LOGIN;
    const APP_PASSWORD = process.env.HOMEBROKER_APP_PASSWORD;
    
    if (!APP_LOGIN || !APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Credenciais da aplicação não configuradas' },
        { status: 500 }
      );
    }
    
    // Criar Basic Auth token para autenticação da aplicação
    const credentials = `${APP_LOGIN}:${APP_PASSWORD}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    
    safeLog('🔐 Tentativa de login:', {
      endpoint: AUTH_API_URL,
      username: body.username,
      hasPassword: !!body.password,
      role: "hbb",
      authHeaderLength: base64Credentials.length
    });
    
    // Fazer a requisição para a API de autenticação
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Credentials}`
      },
      body: JSON.stringify({
        username: body.username,
        password: body.password,
        role: "hbb"
      }),
    });
    
    // Log da resposta (sem dados sensíveis)
    safeLog('📡 Resposta da API:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    
    // Se a resposta não for bem-sucedida, retornar o erro com mais detalhes
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erro na autenticação:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Falha na autenticação', 
          details: errorText,
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }
    
    // Processar a resposta como JSON
    const responseData = await response.json();
    
    safeLog('✅ Login bem-sucedido:', {
      hasAccessToken: !!responseData.accessToken,
      hasRefreshToken: !!responseData.refreshToken,
      hasCognitoId: !!responseData.cognitoId
    });
    
    // Extrair tokens de forma segura
    const accessToken = responseData.accessToken || responseData.access_token;
    const refreshToken = responseData.refreshToken || responseData.refresh_token;
    const cognitoId = responseData.cognitoId || responseData.cognito_id;

    if (!accessToken || !refreshToken || !cognitoId) {
      return NextResponse.json(
        { error: 'Resposta incompleta da API de autenticação' },
        { status: 500 }
      );
    }

    try {
      // Persistir no banco de dados
      let user = await getUserByEmail(body.username);
      
      if (!user) {
        // Criar novo usuário
        user = await createUser({
          email: body.username,
          cognitoId: cognitoId,
        });
        
        safeLog('👤 Novo usuário criado:', { userId: user.id, email: user.email });
      }

      // Criar ou atualizar identidade do usuário
      const encryptedAccessToken = await TokenCrypto.encrypt(accessToken);
      const encryptedRefreshToken = await TokenCrypto.encrypt(refreshToken);
      
      // Calcular expiração do token (assumindo 2 horas)
      const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      // Verificar se já existe identidade para este usuário e provedor
      let identity = await getUserIdentityByProvider(user.id, 'homebroker');
      
      if (identity) {
        // Atualizar tokens existentes
        await updateUserIdentityTokens(
          identity.id, 
          encryptedAccessToken, 
          encryptedRefreshToken, 
          tokenExpiresAt
        );
        safeLog('🔄 Identidade atualizada:', { identityId: identity.id });
      } else {
        // Criar nova identidade
        identity = await createUserIdentity({
          userId: user.id,
          provider: 'homebroker',
          providerUserId: cognitoId,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt,
        });
        safeLog('🆕 Nova identidade criada:', { identityId: identity.id });
      }

      // Criar sessão para o usuário
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
      
      const session = await createSession({
        userId: user.id,
        sessionTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      // NOVO: Garantir que o usuário tenha uma conta de trading configurada
      try {
        await ensureUserHasTradingAccount(
          user.id,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiresAt
        );
        safeLog('✅ Conta de trading garantida para o usuário');
      } catch (tradingAccountError) {
        console.error('⚠️ Erro ao garantir conta de trading:', tradingAccountError);
        // Não falha o login, apenas registra o erro
      }

      // Log da ação para auditoria
      await logUserAction(
        user.id,
        'user_login',
        { identityId: identity.id, sessionId: session.id },
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        request.headers.get('user-agent') || undefined
      );

      safeLog('✅ Login persistido no banco:', {
        userId: user.id,
        identityId: identity.id,
        sessionId: session.id
      });

      // Normalizar resposta para o frontend
      const normalizedResponse = {
        access_token: accessToken,
        refresh_token: refreshToken,
        cognito_id: cognitoId,
        session_token: sessionToken,
        user_id: user.id,
      };

      return NextResponse.json(normalizedResponse);

    } catch (dbError) {
      console.error('❌ Erro ao persistir no banco:', dbError);
      
      // Mesmo que o banco falhe, retornar os tokens para não quebrar o login
      const normalizedResponse = {
        access_token: accessToken,
        refresh_token: refreshToken,
        cognito_id: cognitoId,
      };

      return NextResponse.json(normalizedResponse);
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno no servidor de autenticação' },
      { status: 500 }
    );
  }
}