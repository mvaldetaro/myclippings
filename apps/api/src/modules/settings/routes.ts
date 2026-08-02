import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { authenticate } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { ValidationError } from '../../lib/errors';
import { schema } from '@my-clippings/database';
import {
  UpdateSettingsInputSchema,
  type QuotePreferences,
  type UserSettings,
} from '@my-clippings/schemas';

/** Preferências padrão — seguem o design system do app (primary #00635D). */
export const DEFAULT_QUOTE_PREFERENCES: QuotePreferences = {
  backgroundColor: '#00635D',
  textColor: '#FFFFFF',
  showAuthor: true,
  showBookTitle: true,
};

/**
 * Lê as configurações atuais do usuário ou retorna defaults
 * caso ainda não exista registro no banco.
 */
async function getUserSettings(userId: string): Promise<UserSettings> {
  const db = getDb();
  const row = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .get();

  if (!row) {
    const now = new Date().toISOString();
    // Cria registro com defaults na primeira leitura (idempotente)
    const id = ulid();
    await db.insert(schema.userSettings).values({
      id,
      userId,
      interfacePreferences: {},
      quotePreferences: DEFAULT_QUOTE_PREFERENCES,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      interfacePreferences: { fontSize: 1, theme: 'system' as const },
      quotePreferences: { ...DEFAULT_QUOTE_PREFERENCES },
      createdAt: now,
      updatedAt: now,
    };
  }

  // Drizzle retorna JSON colunas como parsed objects quando mode: 'json'
  const quotePrefs = row.quotePreferences as Record<string, unknown>;
  const ifacePrefs = row.interfacePreferences as Record<string, unknown>;

  return {
    id: row.id,
    userId: row.userId,
    interfacePreferences: {
      fontSize: typeof ifacePrefs.fontSize === 'number' ? ifacePrefs.fontSize : 1,
      theme:
        typeof ifacePrefs.theme === 'string' &&
        (ifacePrefs.theme === 'light' ||
          ifacePrefs.theme === 'dark' ||
          ifacePrefs.theme === 'system')
          ? ifacePrefs.theme
          : 'system',
    },
    quotePreferences: {
      backgroundColor:
        typeof quotePrefs.backgroundColor === 'string'
          ? quotePrefs.backgroundColor
          : DEFAULT_QUOTE_PREFERENCES.backgroundColor,
      textColor:
        typeof quotePrefs.textColor === 'string'
          ? quotePrefs.textColor
          : DEFAULT_QUOTE_PREFERENCES.textColor,
      showAuthor:
        typeof quotePrefs.showAuthor === 'boolean'
          ? quotePrefs.showAuthor
          : DEFAULT_QUOTE_PREFERENCES.showAuthor,
      showBookTitle:
        typeof quotePrefs.showBookTitle === 'boolean'
          ? quotePrefs.showBookTitle
          : DEFAULT_QUOTE_PREFERENCES.showBookTitle,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Rotas de configurações do usuário (protegidas por JWT).
 *
 * GET  /settings — retorna preferências atuais
 * POST /settings — atualiza preferências (merge parcial)
 */
export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate);

  app.get('/', async (request, reply) => {
    const userId = request.user.sub;
    const settings = await getUserSettings(userId);

    return reply.send({
      quotePreferences: settings.quotePreferences,
      interfacePreferences: settings.interfacePreferences,
    });
  });

  app.post('/', async (request, reply) => {
    const userId = request.user.sub;
    const parsed = UpdateSettingsInputSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Dados inválidos');
    }

    const input = parsed.data;
    const db = getDb();
    const now = new Date().toISOString();
    const existing = await getUserSettings(userId);

    // Faz merge das preferências parciais com as existentes
    const mergedQuotePrefs: QuotePreferences = {
      backgroundColor:
        input.quotePreferences?.backgroundColor ?? existing.quotePreferences.backgroundColor,
      textColor: input.quotePreferences?.textColor ?? existing.quotePreferences.textColor,
      showAuthor: input.quotePreferences?.showAuthor ?? existing.quotePreferences.showAuthor,
      showBookTitle:
        input.quotePreferences?.showBookTitle ?? existing.quotePreferences.showBookTitle,
    };

    const mergedIfacePrefs = {
      fontSize: input.interfacePreferences?.fontSize ?? existing.interfacePreferences.fontSize,
      theme: input.interfacePreferences?.theme ?? existing.interfacePreferences.theme,
    };

    await db
      .update(schema.userSettings)
      .set({
        quotePreferences: mergedQuotePrefs,
        interfacePreferences: mergedIfacePrefs,
        updatedAt: now,
      })
      .where(eq(schema.userSettings.userId, userId));

    return reply.send({
      quotePreferences: mergedQuotePrefs,
      interfacePreferences: mergedIfacePrefs,
    });
  });
};
