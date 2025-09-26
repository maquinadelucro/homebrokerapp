// API de trading
export const tradingApi = {
  // Obter saldo da conta
  getBalance: async () => {
    const token = localStorage.getItem('homebroker_access_token');
    if (!token) {
      throw new Error('Token do HomeBroker não encontrado. Faça login novamente.');
    }
    
    try {
      const response = await fetch('/api/trading/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao obter saldo da conta');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
  
  // Criar uma operação de trade (sempre conta real)
  createTrade: async (params: {
    symbol: string;
    direction: 'up' | 'down';
    betValue: number; // em reais
    durationMilliseconds: number;
  }) => {
    const token = localStorage.getItem('auth_token'); // Usar session_token para nossas APIs internas
    
    if (!token) {
      throw new Error('Usuário não está logado');
    }
    
    try {
      // Gerar um ID único para a operação
      const operationId = crypto.randomUUID();
      
      // Converter o valor da aposta de reais para centavos
      const betValueCents = Math.round(params.betValue * 100);
      
      // Preparar o corpo da requisição conforme documentação da API
      const requestBody = {
        id: operationId,
        direction: params.direction,
        bet_value_usd_cents: betValueCents,
        duration_milliseconds: params.durationMilliseconds,
        start_time_utc: new Date().toISOString(),
        ticker_symbol: params.symbol,
        account_type: 'real', // Sempre usar conta real conforme solicitado
        currency: 'BRL'
      };
      
      // Fazer a requisição para a API
      const response = await fetch('/api/trading/create-operation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tradeData: requestBody,
          token
        })
      });
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar operação');
      }
      
      // Processar a resposta
      const data = await response.json();
      
      // Buscar saldo atualizado após criar operação
      try {
        console.log('🔄 Operação criada, atualizando saldo...');
        await tradingApi.getBalance();
        console.log('✅ Saldo atualizado após operação');
      } catch (balanceError) {
        console.log('⚠️ Falha ao atualizar saldo após operação:', balanceError);
        // Não falhar a operação se não conseguir buscar saldo
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obter lista de ativos disponíveis
  getAssets: async () => {
    const token = localStorage.getItem('homebroker_access_token');
    
    // Verificar se o usuário está logado
    if (!token) {
      throw new Error('Token do HomeBroker não encontrado. Faça login novamente.');
    }
    
    try {
      const response = await fetch(`/api/trading/assets?token=${encodeURIComponent(token)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao obter lista de ativos');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obter dados históricos para o gráfico
  getChartData: async (symbol: string, timespan: string = 'seconds', multiple: number = 30, hoursBack: number = 1) => {
    const token = localStorage.getItem('homebroker_access_token');
    
    if (!token) {
      throw new Error('Token do HomeBroker não encontrado. Faça login novamente.');
    }
    
    try {
      // Calcular intervalo de datas (padrão: última hora)
      const end = new Date();
      const start = new Date(end.getTime() - (hoursBack * 60 * 60 * 1000));
      
      // Formatar as datas para o formato ISO 8601 exigido pela API
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      
      // Construir a URL da requisição
      const url = `/api/trading/chart-data?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&timespan=${encodeURIComponent(timespan)}&multiple=${multiple}&token=${encodeURIComponent(token)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao obter dados do gráfico');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
};