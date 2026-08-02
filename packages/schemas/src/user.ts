import { z } from 'zod';

/** Schema para criação/atualização de usuário */
export const UserSchema = z.object({
  id: z.string().ulid(),
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('E-mail inválido').max(255),
  passwordHash: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

/** Schema para criação de usuário (entrada da API) */
export const CreateUserInputSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

/** Schema para login */
export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

/** Resposta pública do usuário (sem hash da senha) */
export const UserResponseSchema = UserSchema.omit({ passwordHash: true });
export type UserResponse = z.infer<typeof UserResponseSchema>;
