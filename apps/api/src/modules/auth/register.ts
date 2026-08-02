import type { FastifyRequest, FastifyReply } from 'fastify';
import { hash } from 'argon2';
import { ulid } from 'ulid';
import { getDb } from '../../lib/db';
import { schema } from '@my-clippings/database';
import { ConflictError, ValidationError } from '../../lib/errors';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const RegisterBody = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  email: z.string().email('E-mail inválido').max(255),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
});

type RegisterBody = z.infer<typeof RegisterBody>;

/**
 * Handler de registro de usuário.
 *
 * 1. Valida o body com Zod
 * 2. Verifica se o email já existe (409 Conflict)
 * 3. Gera hash Argon2id da senha
 * 4. Insere no banco e retorna o usuário criado (sem passwordHash)
 */
export async function registerHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = RegisterBody.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Dados inválidos');
  }

  const { name, email, password } = parsed.data;
  const db = getDb();

  // Verifica email duplicado
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();

  if (existing) {
    throw new ConflictError('Este e-mail já está cadastrado');
  }

  // Hash da senha com Argon2id
  const passwordHash = await hash(password);

  // Cria o usuário
  const now = new Date().toISOString();
  const userId = ulid();

  await db.insert(schema.users).values({
    id: userId,
    name,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  request.log.info({ userId, email }, 'Usuário registrado');

  return reply.status(201).send({
    id: userId,
    name,
    email,
    createdAt: now,
  });
}
