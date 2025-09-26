import { NextResponse } from 'next/server';

// URL da API de autenticação para trading
const TRADING_AUTH_URL = 'https://trading-api.homebroker.com/authenticate';

export async function POST(request: Request) {
  try {
    // Obter o token de autenticação do corpo da requisição
    const body = await request.json();
    
    if (!body.token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }
    
    // Fazer a requisição para a API de autenticação de trading
    const response = await fetch(TRADING_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${body.token}`
      },
    });
    
    // Obter a resposta como texto
    const responseText = await response.text();
    
    // Se a resposta não for bem-sucedida, retornar o erro
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha na autenticação para trading', details: responseText },
        { status: response.status }
      );
    }
    
    // Tentar fazer o parse da resposta como JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        { error: 'Erro ao processar resposta de autenticação para trading' },
        { status: 500 }
      );
    }
    
    // Retornar os dados de autenticação para trading
    return NextResponse.json(responseData);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno no servidor de autenticação para trading' },
      { status: 500 }
    );
  }
}