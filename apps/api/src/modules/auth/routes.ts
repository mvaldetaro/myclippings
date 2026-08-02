import type { FastifyPluginAsync } from 'fastify';
import { registerHandler } from './register';
import { loginHandler } from './login';
import { logoutHandler } from './logout';

/**
 * Rotas de autenticação:
 * - POST /auth/register: cadastro de usuário com Argon2id
 * - POST /auth/login: login com emissão de JWT (httpOnly cookie)
 * - POST /auth/logout: invalida o cookie de sessão
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', registerHandler);
  app.post('/login', loginHandler);
  app.post('/logout', logoutHandler);
};
