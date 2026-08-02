import { BookOpen, LogOut, Menu, Settings, Upload, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from './Button';

export interface LayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

/** Link de navegação do header */
interface NavLink {
  label: string;
  href: string;
  icon?: ReactNode;
}

export function Layout({ children, isAuthenticated, onLogout }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const authLinks: NavLink[] = [
    { label: 'Livros', href: '/books', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Importar', href: '/import', icon: <Upload className="h-4 w-4" /> },
    { label: 'Configurações', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const guestLinks: NavLink[] = [
    { label: 'Entrar', href: '/login' },
    { label: 'Cadastrar', href: '/register' },
  ];

  const links = isAuthenticated ? authLinks : guestLinks;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip to content — acessibilidade */}
      <a href="#main-content" className="skip-to-content">
        Pular para o conteúdo principal
      </a>

      {/* Header */}
      <header className="border-b border-neutral bg-surface">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            href={isAuthenticated ? '/books' : '/'}
            className="text-primary headline-md font-bold hover:opacity-80 transition-opacity"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            MyClippings
          </a>

          {/* Navegação desktop */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="body-md text-on-surface hover:text-primary transition-colors flex items-center gap-1.5"
              >
                {link.icon}
                {link.label}
              </a>
            ))}
            {isAuthenticated && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={onLogout}
                className="flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            )}
          </nav>

          {/* Botão menu mobile */}
          <button
            type="button"
            className="md:hidden p-2 text-on-surface"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden border-t border-neutral bg-surface px-4 py-4 flex flex-col gap-3"
            aria-label="Menu mobile"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="body-md text-on-surface hover:text-primary transition-colors flex items-center gap-2 py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.icon}
                {link.label}
              </a>
            ))}
            {isAuthenticated && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  onLogout?.();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 justify-start"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            )}
          </nav>
        )}
      </header>

      {/* Conteúdo principal */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-neutral bg-surface py-6">
        <div className="max-w-7xl mx-auto px-4 text-center body-sm text-muted">
          MyClippings — Seus clippings do Kindle, organizados.
        </div>
      </footer>
    </div>
  );
}
