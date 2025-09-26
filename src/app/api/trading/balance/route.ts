import { NextResponse } from "next/server";

// Definindo a URL da API de saldo
const API_URL = "https://bot-wallet-api.homebroker.com/balance/";

export async function GET(request: Request) {
  try {
    console.log("🏦 Tentativa de obter saldo...");

    // Extrair o token do cabeçalho Authorization
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token não fornecido ou inválido");
      return NextResponse.json(
        { error: "Token de autorização não fornecido" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    console.log("🔐 Token extraído, fazendo requisição para:", API_URL);

    // Configurando headers específicos que podem ser necessários para a API
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Fazendo a requisição para a API externa
    const response = await fetch(API_URL, {
      method: "GET",
      headers: headers,
    });

    console.log("📡 Resposta da API de saldo:", {
      status: response.status,
      statusText: response.statusText,
      url: API_URL,
    });

    // Se a resposta não for bem-sucedida, tratar o erro
    if (!response.ok) {
      let errorInfo = "";

      try {
        // Tentativa de obter o corpo do erro como texto
        errorInfo = await response.text();
      } catch (e) {
        // Falha ao ler corpo da resposta
      }

      // Retornar uma resposta de erro estruturada
      return NextResponse.json(
        {
          error: "Falha ao obter saldo do usuário",
          statusCode: response.status,
          message: errorInfo || response.statusText,
        },
        { status: response.status },
      );
    }

    // Se a resposta for bem-sucedida, processar os dados
    let balanceData;

    try {
      balanceData = await response.json();
      console.log("💰 Dados de saldo recebidos:", balanceData);
    } catch (e) {
      console.log("❌ Erro ao fazer parse do JSON do saldo");
      return NextResponse.json(
        { error: "Erro ao processar dados de saldo" },
        { status: 500 },
      );
    }

    // Usar sempre conta real (ignorar demo conforme solicitado)
    if (balanceData && balanceData.real) {
      const realBalance = balanceData.real;
      const balanceInCents = realBalance.balance;
      const balanceInReais = balanceInCents / 100; // Converter centavos para reais

      console.log("✅ Saldo real processado:", {
        accountType: "real",
        centavos: balanceInCents,
        reais: balanceInReais,
        currency: realBalance.currency,
        id: realBalance.id,
      });

      return NextResponse.json({
        balance: balanceInReais,
        currency: realBalance.currency,
        id: realBalance.id,
        accountType: "real",
      });
    } else {
      console.log("❌ Conta real não encontrada:", balanceData);
      return NextResponse.json(
        { error: "Conta real não encontrada na resposta da API" },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno ao obter saldo",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
