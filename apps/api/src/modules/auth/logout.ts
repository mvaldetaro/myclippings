import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Handler de logout.
 *
 * Remove o cookie de sessão (token JWT).
 * Não requer autenticação — se não houver cookie, ainda retorna sucesso.
 */
export async function logoutHandler(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.clearCookie('token', { path: '/' });
  return reply.send({ message: 'Logout realizado com sucesso' });
}
