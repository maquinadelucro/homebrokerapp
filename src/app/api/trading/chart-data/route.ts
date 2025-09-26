import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Obter parâmetros da URL
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const symbol = url.searchParams.get('symbol');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const timespan = url.searchParams.get('timespan');
  const multiple = url.searchParams.get('multiple');
  
  // Verificar parâmetros obrigatórios
  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
  }
  
  if (!symbol) {
    return NextResponse.json({ error: 'Símbolo do ativo não fornecido' }, { status: 400 });
  }
  
  if (!start || !end) {
    return NextResponse.json({ error: 'Período de tempo não fornecido' }, { status: 400 });
  }
  
  if (!timespan || !multiple) {
    return NextResponse.json({ error: 'Configuração de timespan não fornecida' }, { status: 400 });
  }
  
  try {
    // Construir a URL da API
    const apiUrl = `https://bot-market-historic-api.homebroker.com/assets/read_values?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&timespan=${encodeURIComponent(timespan)}&multiple=${multiple}`;
    
    // Fazer a requisição para a API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Falha ao obter dados do gráfico' }, 
        { status: response.status }
      );
    }
    
    // Obter os dados da resposta
    const data = await response.json();
    
    // Retornar os dados para o cliente
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar a requisição de dados do gráfico' }, 
      { status: 500 }
    );
  }
}