import type { FastifyRequest, FastifyReply } from 'fastify';
import { verify } from 'argon2';
import { getDb } from '../../lib/db';
import { schema } from '@my-clippings/database';
import { UnauthorizedError, ValidationError } from '../../lib/errors';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '../../config/env';

const LoginBody = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginBody = z.infer<typeof LoginBody>;

/**
 * Handler de login.
 *
 * 1. Valida o body com Zod
 * 2. Busca usuário por email
 * 3. Verifica a senha com Argon2id
 * 4. Emite JWT e configura cookie httpOnly
 */
export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = LoginBody.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Dados inválidos');
  }

  const { email, password } = parsed.data;
  const db = getDb();

  // Busca usuário
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();

  if (!user) {
    throw new UnauthorizedError('E-mail ou senha inválidos');
  }

  // Verifica senha
  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    throw new UnauthorizedError('E-mail ou senha inválidos');
  }

  // Gera JWT
  const token = await reply.jwtSign(
    { sub: user.id, email: user.email },
    { expiresIn: env.JWT_EXPIRATION },
  );

  // Configura cookie httpOnly + Secure + SameSite
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 horas
  });

  request.log.info({ userId: user.id }, 'Usuário autenticado');

  return reply.send({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}
