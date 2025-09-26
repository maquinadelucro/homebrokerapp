import { NextResponse } from 'next/server';

// URL da API de refresh token (corrigida para o domínio correto)
const REFRESH_API_URL = 'https://bot-account-manager-api.homebroker.com/v3/refresh';

export async function POST(request: Request) {
  try {
    // Obter o token de refresh do corpo da requisição
    const body = await request.json();
    
    // Verificar se o token de refresh foi fornecido
    if (!body.refreshToken) {
      return NextResponse.json(
        { error: 'Token de refresh não fornecido' },
        { status: 400 }
      );
    }
    
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
    
    // Fazer a requisição para a API de refresh token
    const response = await fetch(REFRESH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Credentials}`
      },
      body: JSON.stringify({ refreshToken: body.refreshToken }),
    });
    
    // Se a resposta não for bem-sucedida, retornar o erro
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Falha ao renovar token', details: errorText },
        { status: response.status }
      );
    }
    
    // Processar a resposta como JSON
    const responseData = await response.json();
    
    // Normalizar os nomes dos campos para o padrão esperado pelo frontend
    const normalizedResponse = {
      access_token: responseData.accessToken || responseData.access_token,
      refresh_token: responseData.refreshToken || responseData.refresh_token,
      cognito_id: responseData.cognitoId || responseData.cognito_id
    };
    
    // Retornar os novos tokens normalizados
    return NextResponse.json(normalizedResponse);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno no servidor de refresh token' },
      { status: 500 }
    );
  }
}