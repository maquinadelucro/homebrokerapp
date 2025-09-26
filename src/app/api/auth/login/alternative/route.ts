import { NextResponse } from 'next/server';

// Credenciais da aplicação
const APP_LOGIN = 'copytrade';
const APP_PASSWORD = 'l649sQ|wZ+3?';
const API_URL = 'https://bot-account-manager-api.homebroker.com/v3';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    console.log('Alt API Route - Tentando login com:', { username });
    
    // Criar o Basic auth token - método alternativo
    const credentials = `${APP_LOGIN}:${APP_PASSWORD}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(credentials);
    const base64Credentials = Buffer.from(data).toString('base64');
    
    console.log('Alt API Route - Token Basic Auth gerado (método alternativo)');
    
    // Log da requisição
    const requestBody = JSON.stringify({ 
      username, 
      password,
      role: "hbb"
    });
    
    try {
      // Teste com método de autenticação alternativo
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Credentials}`,
          'Accept': 'application/json'
        },
        body: requestBody,
      });
      
      console.log('Alt API Route - Status da resposta:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('Alt API Route - Resposta texto bruto:', responseText);
      
      let responseBody;
      try {
        responseBody = JSON.parse(responseText);
      } catch (e) {
        responseBody = { text: responseText };
      }
      
      if (!response.ok) {
        return NextResponse.json(
          { 
            error: 'Falha na autenticação (método alternativo)',
            details: {
              status: response.status,
              statusText: response.statusText,
              body: responseBody,
              textResponse: responseText
            }
          }, 
          { status: response.status }
        );
      }
      
      return NextResponse.json(responseBody);
    } catch (requestError) {
      console.error('Alt API Route - Erro na requisição:', requestError);
      
      return NextResponse.json(
        { error: 'Erro ao se conectar com o servidor da API (método alternativo)' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Alt API Route - Erro ao processar a requisição:', error);
    
    return NextResponse.json(
      { error: 'Erro interno no servidor (método alternativo)' }, 
      { status: 500 }
    );
  }
}