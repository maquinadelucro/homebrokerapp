import { NextResponse } from "next/server";
import { safeLog } from "@/lib/utils/security";

// URL da API de dados do usuário
const USER_API_URL = "https://bot-user-api.homebroker.com/users/read-user";

export async function GET(request: Request) {
  try {
    safeLog("👤 Tentativa de obter dados do usuário...");

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
    safeLog("🔐 Token extraído, fazendo requisição para:", {
      url: USER_API_URL,
    });

    // Configurando headers para a API
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Fazendo a requisição para a API externa
    const response = await fetch(USER_API_URL, {
      method: "GET",
      headers: headers,
    });

    safeLog("📡 Resposta da API de usuário:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });

    // Se a resposta não for bem-sucedida, tratar o erro
    if (!response.ok) {
      let errorInfo = "";

      try {
        errorInfo = await response.text();
      } catch (e) {
        // Falha ao ler corpo da resposta
      }

      return NextResponse.json(
        {
          error: "Falha ao obter dados do usuário",
          statusCode: response.status,
          message: errorInfo || response.statusText,
        },
        { status: response.status },
      );
    }

    // Se a resposta for bem-sucedida, processar os dados
    let userData;

    try {
      userData = await response.json();
      safeLog("👤 Dados do usuário recebidos:", {
        hasData: !!userData,
        hasCognitoId: !!userData?.cognito_id,
        hasEmail: !!userData?.email,
        role: userData?.role,
        country: userData?.country,
        currency: userData?.currency,
      });
    } catch (e) {
      console.log("❌ Erro ao fazer parse do JSON dos dados do usuário");
      return NextResponse.json(
        { error: "Erro ao processar dados do usuário" },
        { status: 500 },
      );
    }

    // Retornar os dados do usuário
    return NextResponse.json(userData);
  } catch (error) {
    console.error("❌ Erro interno ao obter dados do usuário:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao obter dados do usuário",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
