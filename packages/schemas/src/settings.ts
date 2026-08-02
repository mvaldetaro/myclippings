import { z } from 'zod';

/** Preferências de interface do usuário */
export const InterfacePreferencesSchema = z.object({
  /** Tamanho da fonte na leitura (rem, padrão 1) */
  fontSize: z.number().min(0.75).max(2).default(1),
  /** Tema da interface (claro/escuro/sistema) */
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export type InterfacePreferences = z.infer<typeof InterfacePreferencesSchema>;

/** Preferências de geração de imagem de citação */
export const QuotePreferencesSchema = z.object({
  /** Cor de fundo da imagem (hex) */
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#00635D'),
  /** Cor do texto (hex) */
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#FFFFFF'),
  /** Mostrar nome do autor na imagem */
  showAuthor: z.boolean().default(true),
  /** Mostrar título do livro na imagem */
  showBookTitle: z.boolean().default(true),
});

export type QuotePreferences = z.infer<typeof QuotePreferencesSchema>;

/** Configurações do usuário */
export const UserSettingsSchema = z.object({
  id: z.string().ulid(),
  userId: z.string().ulid(),
  interfacePreferences: InterfacePreferencesSchema,
  quotePreferences: QuotePreferencesSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

/** Entrada para atualização de configurações */
export const UpdateSettingsInputSchema = z.object({
  interfacePreferences: InterfacePreferencesSchema.partial().optional(),
  quotePreferences: QuotePreferencesSchema.partial().optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInputSchema>;
