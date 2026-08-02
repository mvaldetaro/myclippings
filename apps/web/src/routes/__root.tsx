import { Outlet, createRootRoute, useRouter } from '@tanstack/react-router';
import { Layout } from '../components/Layout';
import { useCurrentUser, useLogout } from '../queries/auth';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        router.navigate({ to: '/login' });
      },
    });
  };

  return (
    <Layout isAuthenticated={!!user} onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );
}
