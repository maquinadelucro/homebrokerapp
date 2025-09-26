import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from './client';
import { 
  users, 
  userIdentities, 
  sessions,
  trades,
  accountBalances,
  assets,
  auditLogs,
  tradingAccounts,
  type User,
  type NewUser,
  type UserIdentity,
  type NewUserIdentity,
  type Session,
  type NewSession,
  type Trade,
  type NewTrade,
  type AccountBalance,
  type NewAccountBalance,
  type Asset,
  type NewAuditLog,
  type TradingAccount,
  type NewTradingAccount
} from './client';

// ========================================
// USER OPERATIONS
// ========================================

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user || null;
}

// ========================================
// USER IDENTITY OPERATIONS
// ========================================

export async function createUserIdentity(data: NewUserIdentity): Promise<UserIdentity> {
  const [identity] = await db.insert(userIdentities).values(data).returning();
  return identity;
}

export async function getUserIdentityByProvider(
  userId: string, 
  provider: 'homebroker'
): Promise<UserIdentity | null> {
  const [identity] = await db
    .select()
    .from(userIdentities)
    .where(and(eq(userIdentities.userId, userId), eq(userIdentities.provider, provider)))
    .limit(1);
  return identity || null;
}

export async function updateUserIdentityTokens(
  identityId: string,
  accessToken: string | null,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<void> {
  await db
    .update(userIdentities)
    .set({
      accessTokenEncrypted: accessToken,
      refreshTokenEncrypted: refreshToken,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(userIdentities.id, identityId));
}

// ========================================
// SESSION OPERATIONS
// ========================================

export async function createSession(data: NewSession): Promise<Session> {
  const [session] = await db.insert(sessions).values(data).returning();
  return session;
}

export async function getSessionByToken(sessionTokenHash: string): Promise<Session | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(
      eq(sessions.sessionTokenHash, sessionTokenHash),
      sql`${sessions.expiresAt} > NOW()`,
      sql`${sessions.revokedAt} IS NULL`
    ))
    .limit(1);
  return session || null;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function cleanupExpiredSessions(): Promise<void> {
  await db
    .delete(sessions)
    .where(sql`${sessions.expiresAt} < NOW()`);
}

// ========================================
// TRADING OPERATIONS
// ========================================

/**
 * Obter token do broker descriptografado para uma conta específica
 * Verifica se a conta pertence ao usuário informado
 */
export async function getUserBrokerToken(
  userId: string, 
  accountId: string
): Promise<string | null> {
  try {
    const [account] = await db
      .select({ 
        accessTokenEncrypted: tradingAccounts.accessTokenEncrypted,
        userId: tradingAccounts.userId 
      })
      .from(tradingAccounts)
      .where(and(
        eq(tradingAccounts.id, accountId),
        eq(tradingAccounts.userId, userId), // Verificar ownership
        eq(tradingAccounts.accountType, 'real'), // Forçar apenas contas Real
        eq(tradingAccounts.isActive, true)
      ))
      .limit(1);
      
    if (!account || !account.accessTokenEncrypted) {
      return null;
    }
    
    // Importar TokenCrypto aqui para evitar dependência circular
    const { TokenCrypto } = await import('../utils/security');
    return TokenCrypto.decrypt(account.accessTokenEncrypted);
  } catch (error) {
    console.error('❌ Erro ao obter token do broker:', error);
    return null;
  }
}

/**
 * Obter conta Real padrão do usuário
 * Sistema opera apenas com contas Real
 */
export async function getUserDefaultAccount(userId: string): Promise<TradingAccount | null> {
  try {
    const [account] = await db
      .select()
      .from(tradingAccounts)
      .where(and(
        eq(tradingAccounts.userId, userId),
        eq(tradingAccounts.accountType, 'real'), // Apenas contas Real
        eq(tradingAccounts.isDefault, true),
        eq(tradingAccounts.isActive, true)
      ))
      .limit(1);
      
    return account || null;
  } catch (error) {
    console.error('❌ Erro ao obter conta Real padrão:', error);
    return null;
  }
}

export async function createTrade(data: NewTrade): Promise<Trade> {
  const [trade] = await db.insert(trades).values(data).returning();
  return trade;
}

export async function getTradeById(id: string): Promise<Trade | null> {
  const [trade] = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
  return trade || null;
}

export async function getUserTrades(
  userId: string, 
  limit = 50, 
  offset = 0
): Promise<Trade[]> {
  return await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateTradeResult(
  tradeId: string,
  result: 'win' | 'loss' | 'draw' | 'cancelled',
  exitPrice: string,
  profitCents: number | null
): Promise<void> {
  await db
    .update(trades)
    .set({
      result,
      exitPrice,
      profitCents,
      updatedAt: new Date(),
    })
    .where(eq(trades.id, tradeId));
}

// ========================================
// ASSET OPERATIONS
// ========================================

export async function getAllTradableAssets(): Promise<Asset[]> {
  return await db
    .select()
    .from(assets)
    .where(eq(assets.isTradable, true))
    .orderBy(assets.name);
}

export async function getAssetBySymbol(symbol: string): Promise<Asset | null> {
  const [asset] = await db.select().from(assets).where(eq(assets.symbol, symbol)).limit(1);
  return asset || null;
}

// ========================================
// BALANCE OPERATIONS
// ========================================

export async function createAccountBalance(data: NewAccountBalance): Promise<AccountBalance> {
  const [balance] = await db.insert(accountBalances).values(data).returning();
  return balance;
}

export async function getLatestBalance(
  userId: string, 
  accountType: 'real' = 'real' // Sistema opera apenas com contas Real
): Promise<AccountBalance | null> {
  const [balance] = await db
    .select()
    .from(accountBalances)
    .where(and(
      eq(accountBalances.userId, userId),
      eq(accountBalances.accountType, 'real') // Sempre 'real'
    ))
    .orderBy(desc(accountBalances.asOf))
    .limit(1);
  return balance || null;
}

export async function updateUserBalance(
  userId: string,
  accountType: 'real' = 'real', // Sistema opera apenas com contas Real
  balanceCents: number,
  source = 'webhook'
): Promise<AccountBalance> {
  const data: NewAccountBalance = {
    userId,
    accountType: 'real', // Sempre 'real'
    balanceCents,
    asOf: new Date(),
    source,
  };
  return await createAccountBalance(data);
}

// ========================================
// AUDIT OPERATIONS
// ========================================

export async function createAuditLog(data: NewAuditLog): Promise<void> {
  await db.insert(auditLogs).values(data);
}

export async function logUserAction(
  userId: string | null,
  action: string,
  metadata?: any,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: action as any,
    metadata,
    ip,
    userAgent,
  });
}

// ========================================
// TRADING ACCOUNT OPERATIONS
// ========================================

export async function createTradingAccount(data: {
  userId: string;
  accountName: string;
  accountType: 'real';
  brokerAccountId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  isDefault?: boolean;
  currency?: string;
}): Promise<any> {
  try {
    // Se esta for marcada como padrão, desmarcar outras contas padrão do usuário
    if (data.isDefault) {
      await db
        .update(tradingAccounts)
        .set({ isDefault: false })
        .where(and(
          eq(tradingAccounts.userId, data.userId),
          eq(tradingAccounts.isDefault, true)
        ));
    }

    const [account] = await db
      .insert(tradingAccounts)
      .values({
        userId: data.userId,
        accountName: data.accountName,
        accountType: data.accountType,
        brokerAccountId: data.brokerAccountId,
        accessTokenEncrypted: data.accessTokenEncrypted,
        refreshTokenEncrypted: data.refreshTokenEncrypted || '',
        tokenExpiresAt: data.tokenExpiresAt,
        isActive: true,
        isDefault: data.isDefault || false,
        balanceCents: 0,
        currency: data.currency || 'BRL',
      })
      .returning();

    return account;
  } catch (error) {
    console.error('❌ Erro ao criar conta de trading:', error);
    throw error;
  }
}

export async function ensureUserHasTradingAccount(
  userId: string,
  accessTokenEncrypted: string,
  refreshTokenEncrypted?: string,
  tokenExpiresAt?: Date
): Promise<any> {
  try {
    // Verificar se o usuário já tem uma conta padrão
    const existingAccount = await getUserDefaultAccount(userId);
    
    if (existingAccount) {
      console.log('✅ Usuário já possui conta de trading padrão');
      return existingAccount;
    }

    // Criar nova conta padrão
    const newAccount = await createTradingAccount({
      userId,
      accountName: 'Conta Real Principal',
      accountType: 'real',
      brokerAccountId: 'main_real_account',
      accessTokenEncrypted,
      refreshTokenEncrypted: refreshTokenEncrypted || '',
      tokenExpiresAt,
      isDefault: true,
      currency: 'BRL',
    });

    console.log('✅ Nova conta de trading criada automaticamente:', newAccount.id);
    return newAccount;
  } catch (error) {
    console.error('❌ Erro ao garantir conta de trading para usuário:', error);
    throw error;
  }
}

// ========================================
// HEALTH CHECK
// ========================================

export async function healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date }> {
  try {
    await db.execute(sql`SELECT 1`);
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'unhealthy', timestamp: new Date() };
  }
}