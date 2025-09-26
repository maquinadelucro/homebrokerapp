import { NextResponse } from 'next/server';

// URL da API de registro (corrigida para o domínio correto)
const REGISTER_API_URL = 'https://bot-account-manager-api.homebroker.com/v3/register';

export async function POST(request: Request) {
  try {
    // Obter os dados de registro do corpo da requisição
    const body = await request.json();
    
    // Verificar credenciais da aplicação
    const APP_LOGIN = 'copytrade';
    const APP_PASSWORD = 'l649sQ|wZ+3?';
    
    // Criar Basic Auth token para autenticação da aplicação
    const credentials = `${APP_LOGIN}:${APP_PASSWORD}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    
    // Fazer a requisição para a API de registro
    const response = await fetch(REGISTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Credentials}`
      },
      body: JSON.stringify(body),
    });
    
    // Se a resposta não for bem-sucedida, retornar o erro
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Falha no registro', details: errorText },
        { status: response.status }
      );
    }
    
    // Processar a resposta como JSON
    const responseData = await response.json();
    
    // Retornar os dados de registro/autenticação
    return NextResponse.json(responseData);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno no servidor de registro' },
      { status: 500 }
    );
  }
}