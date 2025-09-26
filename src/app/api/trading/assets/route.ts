import { NextResponse } from 'next/server';

// Definindo a URL da API de ativos
const API_URL = 'https://bot-configuration-api.homebroker.com/api/assets/';

export async function GET(request: Request) {
  try {
    // Extrair o token da query string
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }
    
    // Configurando headers com o token de autenticação
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // Fazendo a requisição para a API externa
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: headers,
    });
    
    // Se a resposta não for bem-sucedida, tratar o erro
    if (!response.ok) {
      let errorInfo = '';
      
      try {
        // Tentativa de obter o corpo do erro como texto
        errorInfo = await response.text();
      } catch (e) {
        // Falha ao ler corpo da resposta
      }
      
      // Retornar uma resposta de erro estruturada
      return NextResponse.json(
        { 
          error: 'Falha ao obter lista de ativos',
          statusCode: response.status,
          message: errorInfo || response.statusText
        },
        { status: response.status }
      );
    }
    
    // Se a resposta for bem-sucedida, processar os dados
    let assetsData;
    
    try {
      assetsData = await response.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Erro ao processar dados dos ativos' },
        { status: 500 }
      );
    }
    
    // Retornar os dados de ativos
    return NextResponse.json(assetsData);
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro interno ao obter ativos',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}