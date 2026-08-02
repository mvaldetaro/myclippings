import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Rota raiz — redireciona para /books se autenticado,
 * ou /login se não autenticado.
 */
export const Route = createFileRoute('/')({
  component: IndexComponent,
  beforeLoad: () => {
    // TanStack Start redireciona no servidor se possível.
    // No cliente, será feito na primeira render.
    throw redirect({ to: '/books' });
  },
});

function IndexComponent() {
  return null;
}
