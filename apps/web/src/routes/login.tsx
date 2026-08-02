import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ApiError } from '../lib/api';
import { useLogin } from '../queries/auth';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          router.navigate({ to: '/books' });
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Erro ao fazer login. Tente novamente.');
          }
        },
      },
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-sm">
        <h1 className="headline-display text-center mb-2">Entrar</h1>
        <p className="body-md text-muted text-center mb-8">Acesse sua conta para ver seus livros</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="body-sm text-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full mt-2" loading={login.isPending}>
            Entrar
          </Button>
        </form>

        <p className="body-sm text-muted text-center mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </Card>
    </div>
  );
}
