import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CreateUserInput, LoginInput, User } from '../user';

describe('tipo User', () => {
  it('deve ter os campos esperados com os tipos esperados', () => {
    expectTypeOf<User['id']>().toEqualTypeOf<string>();
    expectTypeOf<User['name']>().toEqualTypeOf<string>();
    expectTypeOf<User['email']>().toEqualTypeOf<string>();
    expectTypeOf<User['passwordHash']>().toEqualTypeOf<string>();
    expectTypeOf<User['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<User['updatedAt']>().toEqualTypeOf<string>();
  });

  it('deve ser possível construir um User válido', () => {
    const user: User = {
      id: '01J00000000000000000000000',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      passwordHash: '$2b$10$hash',
      createdAt: '2026-07-25T10:00:00.000Z',
      updatedAt: '2026-07-25T10:00:00.000Z',
    };

    expect(user.email).toBe('ada@example.com');
  });
});

describe('tipo CreateUserInput', () => {
  it('deve ter name, email e password (senha em texto plano)', () => {
    expectTypeOf<CreateUserInput>().toEqualTypeOf<{
      name: string;
      email: string;
      password: string;
    }>();
  });

  it('não deve conter passwordHash', () => {
    expectTypeOf<CreateUserInput>().not.toHaveProperty('passwordHash');
  });
});

describe('tipo LoginInput', () => {
  it('deve ter apenas email e password', () => {
    expectTypeOf<LoginInput>().toEqualTypeOf<{ email: string; password: string }>();
  });

  it('deve ser possível construir um LoginInput válido', () => {
    const login: LoginInput = { email: 'ada@example.com', password: 'senha-secreta' };

    expect(login.email).toBe('ada@example.com');
  });
});
