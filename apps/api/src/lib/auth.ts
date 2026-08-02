import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from './errors';

/**
 * Middleware de autenticação JWT.
 *
 * Extrai o token do cookie httpOnly ou do header Authorization.
 * Se o token for inválido ou ausente, retorna 401.
 * Injeta `request.userId` para uso nas rotas.
 *
 * Uso:
 *   app.addHook('onRequest', authenticate);
 *   // ou em rotas específicas:
 *   app.get('/protected', { onRequest: [authenticate] }, handler);
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}
