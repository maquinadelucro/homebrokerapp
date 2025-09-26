import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  numeric,
  jsonb,
  serial,
  smallint,
  bigserial,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ========================================
// ENUMS
// ========================================

export const providerEnum = pgEnum('provider', ['homebroker']);
export const accountTypeEnum = pgEnum('account_type', ['real', 'demo']);
export const directionEnum = pgEnum('direction', ['up', 'down']);
export const tradeResultEnum = pgEnum('trade_result', ['pending', 'win', 'loss', 'draw', 'cancelled']);
export const marketEnum = pgEnum('market', ['forex', 'crypto', 'indices', 'stocks', 'otc']);
export const timeframeEnum = pgEnum('timeframe', ['S', 'M1', 'M5', 'M15', 'H1', 'D1']);
export const tradeEventTypeEnum = pgEnum('trade_event_type', [
  'created', 'filled', 'settled', 'cancelled', 'balance_update', 'webhook_retry'
]);
export const auditActionEnum = pgEnum('audit_action', [
  'user_login', 'user_logout', 'trade_created', 'trade_settled', 'balance_updated',
  'settings_updated', 'password_changed', 'token_refreshed'
]);
export const webhookStatusEnum = pgEnum('webhook_status', ['pending', 'processed', 'failed']);
export const candleSourceEnum = pgEnum('candle_source', ['provider', 'derived']);

// ========================================
// REUSABLE COLUMN DEFINITIONS
// ========================================

const timestamps = {
  createdAt: timestamp('created_at', { 
    mode: 'date', 
    precision: 3, 
    withTimezone: true 
  }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { 
    mode: 'date', 
    precision: 3, 
    withTimezone: true 
  }).defaultNow().notNull()
};

// ========================================
// AUTHENTICATION & USERS
// ========================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 320 }).notNull(),
  cognitoId: varchar('cognito_id', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 20 }).default('user'),
  country: varchar('country', { length: 3 }).default('BR'),
  currency: varchar('currency', { length: 3 }).default('BRL'),
  verified: boolean('verified').default(false),
  active: boolean('active').default(true),
  isPro: boolean('is_pro').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueEmail: unique().on(table.email),
  uniqueCognitoId: unique().on(table.cognitoId),
}));

export const userIdentities = pgTable('user_identities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessTokenEncrypted: text('access_token_encrypted'),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: jsonb('scopes'),
  ...timestamps,
}, (table) => ({
  uniqueUserProvider: unique().on(table.userId, table.provider),
  uniqueProviderUser: unique().on(table.provider, table.providerUserId),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionTokenHash: varchar('session_token_hash', { length: 255 }).unique().notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).unique(),
  csrfTokenHash: varchar('csrf_token_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
}, (table) => ({
  userExpiresIndex: index().on(table.userId, table.expiresAt.desc()),
}));

// ========================================
// TRADING ASSETS & MARKET DATA
// ========================================

export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  market: marketEnum('market').notNull(),
  isTradable: boolean('is_tradable').default(true).notNull(),
  minBetCents: integer('min_bet_cents').default(100).notNull(),
  payoutRateBps: integer('payout_rate_bps').default(8000).notNull(), // 80% = 8000 basis points
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  openHours: jsonb('open_hours'),
  ...timestamps,
}, (table) => ({
  tradableIndex: index().on(table.isTradable),
}));

export const candles = pgTable('candles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  assetId: integer('asset_id').notNull().references(() => assets.id),
  timeframe: timeframeEnum('timeframe').notNull(),
  timeStart: timestamp('time_start', { withTimezone: true }).notNull(),
  open: numeric('open', { precision: 18, scale: 8 }).notNull(),
  high: numeric('high', { precision: 18, scale: 8 }).notNull(),
  low: numeric('low', { precision: 18, scale: 8 }).notNull(),
  close: numeric('close', { precision: 18, scale: 8 }).notNull(),
  volume: bigint('volume', { mode: 'bigint' }),
  source: candleSourceEnum('source').default('provider').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueCandle: unique().on(table.assetId, table.timeframe, table.timeStart),
  assetTimeIndex: index().on(table.assetId, table.timeStart.desc()),
  timeframeIndex: index().on(table.timeframe, table.timeStart.desc()),
}));

export const lastQuotes = pgTable('last_quotes', {
  assetId: integer('asset_id').primaryKey().references(() => assets.id),
  price: numeric('price', { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// TRADING OPERATIONS
// ========================================

export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  accountId: uuid('account_id').references(() => tradingAccounts.id), // Nullable for backward compatibility
  assetId: integer('asset_id').notNull().references(() => assets.id),
  direction: directionEnum('direction').notNull(),
  amountCents: integer('amount_cents').notNull(),
  durationMs: integer('duration_ms').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  expiryTime: timestamp('expiry_time', { withTimezone: true }).notNull(),
  entryPrice: numeric('entry_price', { precision: 18, scale: 8 }).notNull(),
  exitPrice: numeric('exit_price', { precision: 18, scale: 8 }),
  result: tradeResultEnum('result').default('pending').notNull(),
  profitCents: integer('profit_cents'),
  accountType: accountTypeEnum('account_type').default('real').notNull(),
  externalOpId: varchar('external_op_id', { length: 255 }).unique(),
  isMartingale: boolean('is_martingale').default(false).notNull(),
  martingaleLevel: smallint('martingale_level').default(0),
  mainTradeId: uuid('main_trade_id'),
  ...timestamps,
}, (table) => ({
  userCreatedIndex: index().on(table.userId, table.createdAt.desc()),
  accountUserIndex: index().on(table.accountId, table.userId), // Index for multi-account queries
  resultExpiryIndex: index().on(table.result, table.expiryTime),
  assetStartIndex: index().on(table.assetId, table.startTime),
  mainTradeIndex: index().on(table.mainTradeId),
  positiveAmount: check('positive_amount', sql`${table.amountCents} > 0`),
  positiveDuration: check('positive_duration', sql`${table.durationMs} > 0`),
  validMartingaleLevel: check('valid_martingale_level', 
    sql`${table.martingaleLevel} >= 0 AND ${table.martingaleLevel} <= 2`),
}));

export const tradeEvents = pgTable('trade_events', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tradeId: uuid('trade_id').notNull().references(() => trades.id, { onDelete: 'cascade' }),
  type: tradeEventTypeEnum('type').notNull(),
  payload: jsonb('payload'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  externalEventId: varchar('external_event_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tradeOccurredIndex: index().on(table.tradeId, table.occurredAt),
}));

export const riskSettings = pgTable('risk_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  strategy: jsonb('strategy'),
  goalCents: integer('goal_cents'),
  stopLossCents: integer('stop_loss_cents'),
  martingaleEnabled: boolean('martingale_enabled').default(false).notNull(),
  maxMartingaleLevel: smallint('max_martingale_level').default(2),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// PORTFOLIO & USER CONFIGURATION
// ========================================

export const watchlists = pgTable('watchlists', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const watchlistAssets = pgTable('watchlist_assets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  watchlistId: uuid('watchlist_id').notNull().references(() => watchlists.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id').notNull().references(() => assets.id),
  position: integer('position').default(0).notNull(),
}, (table) => ({
  uniqueWatchlistAsset: unique().on(table.watchlistId, table.assetId),
}));

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  locale: varchar('locale', { length: 10 }).default('en-US'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  uiPrefs: jsonb('ui_prefs'),
});

// ========================================
// BALANCE & AUDIT
// ========================================

export const accountBalances = pgTable('account_balances', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountType: accountTypeEnum('account_type').notNull(),
  balanceCents: integer('balance_cents').notNull(),
  asOf: timestamp('as_of', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 20 }).default('webhook').notNull(),
}, (table) => ({
  uniqueUserAccountTime: unique().on(table.userId, table.accountType, table.asOf),
  userAsOfIndex: index().on(table.userId, table.asOf.desc()),
}));

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 255 }),
  metadata: jsonb('metadata'),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index().on(table.userId, table.createdAt.desc()),
  actionCreatedIndex: index().on(table.action, table.createdAt.desc()),
}));

export const webhooksInbound = pgTable('webhooks_inbound', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  eventId: varchar('event_id', { length: 255 }).unique().notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  status: webhookStatusEnum('status').default('pending').notNull(),
  error: text('error'),
  retryCount: integer('retry_count').default(0).notNull(),
}, (table) => ({
  providerProcessedIndex: index().on(table.provider, table.processedAt),
}));

// ========================================
// TRADING ACCOUNTS (MULTI-ACCOUNT SUPPORT)
// ========================================

export const tradingAccounts = pgTable('trading_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountName: varchar('account_name', { length: 100 }).notNull(),
  accountType: accountTypeEnum('account_type').notNull(),
  brokerAccountId: varchar('broker_account_id', { length: 255 }).notNull(), // ID da conta no Homebroker
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  balanceCents: integer('balance_cents').default(0).notNull(),
  currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
  lastBalanceUpdate: timestamp('last_balance_update', { withTimezone: true }),
  ...timestamps,
}, (table) => ({
  uniqueUserBrokerAccount: unique().on(table.userId, table.brokerAccountId),
  userActiveIndex: index().on(table.userId, table.isActive),
  // Nota: Controle de conta default será feito via lógica de aplicação
  // pois Drizzle não suporta partial unique indexes nativamente
}));

// ========================================
// EXPORT ALL TABLES
// ========================================

export const schema = {
  users,
  userIdentities,
  sessions,
  assets,
  candles,
  lastQuotes,
  trades,
  tradeEvents,
  riskSettings,
  watchlists,
  watchlistAssets,
  userSettings,
  accountBalances,
  auditLogs,
  webhooksInbound,
  tradingAccounts,
};

// ========================================
// TYPE EXPORTS
// ========================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;

export type TradeEvent = typeof tradeEvents.$inferSelect;
export type NewTradeEvent = typeof tradeEvents.$inferInsert;

export type AccountBalance = typeof accountBalances.$inferSelect;
export type NewAccountBalance = typeof accountBalances.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type NewTradingAccount = typeof tradingAccounts.$inferInsert;