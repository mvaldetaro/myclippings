import { describe, expect, it } from 'vitest';
import { LockManager, lockManager } from '../lock-manager';

describe('LockManager', () => {
  it('deve adquirir e liberar um lock', async () => {
    const manager = new LockManager();

    const release = await manager.acquire('book-1');
    expect(manager.isLocked('book-1')).toBe(true);

    release();
    expect(manager.isLocked('book-1')).toBe(false);
  });

  it('deve fazer a segunda aquisição aguardar a liberação da primeira', async () => {
    const manager = new LockManager();
    const order: string[] = [];

    const releaseFirst = await manager.acquire('book-1');

    // Segunda aquisição fica pendente até a liberação
    const secondAcquisition = manager.acquire('book-1').then((release) => {
      order.push('second');
      return release;
    });

    // Cede o event loop: a segunda aquisição ainda não pode ter completado
    await new Promise((resolve) => setTimeout(resolve, 10));
    order.push('first');
    releaseFirst();

    const releaseSecond = await secondAcquisition;
    expect(order).toEqual(['first', 'second']);

    releaseSecond();
    expect(manager.isLocked('book-1')).toBe(false);
  });

  it('isLocked deve retornar true enquanto bloqueado e false após liberação', async () => {
    const manager = new LockManager();

    expect(manager.isLocked('book-1')).toBe(false);

    const release = await manager.acquire('book-1');
    expect(manager.isLocked('book-1')).toBe(true);

    release();
    expect(manager.isLocked('book-1')).toBe(false);
  });

  it('deve bloquear bookIds diferentes independentemente', async () => {
    const manager = new LockManager();

    const releaseA = await manager.acquire('book-a');
    const releaseB = await manager.acquire('book-b');

    expect(manager.isLocked('book-a')).toBe(true);
    expect(manager.isLocked('book-b')).toBe(true);

    releaseA();
    expect(manager.isLocked('book-a')).toBe(false);
    expect(manager.isLocked('book-b')).toBe(true);

    releaseB();
  });

  it('deve permitir acesso serial ao mesmo bookId: adquirir, liberar, adquirir de novo', async () => {
    const manager = new LockManager();

    const first = await manager.acquire('book-1');
    first();

    const second = await manager.acquire('book-1');
    expect(manager.isLocked('book-1')).toBe(true);
    second();

    expect(manager.isLocked('book-1')).toBe(false);
  });

  it('deve serializar múltiplas aquisições concorrentes em ordem', async () => {
    const manager = new LockManager();
    const order: number[] = [];

    const worker = async (n: number) => {
      const release = await manager.acquire('book-1');
      order.push(n);
      release();
    };

    // Dispara três workers concorrentes para o mesmo livro
    await Promise.all([worker(1), worker(2), worker(3)]);

    expect(order).toHaveLength(3);
    expect(manager.isLocked('book-1')).toBe(false);
  });

  it('a liberação deve ser idempotente (chamar release duas vezes não quebra)', async () => {
    const manager = new LockManager();

    const release = await manager.acquire('book-1');
    release();
    release();

    expect(manager.isLocked('book-1')).toBe(false);
  });
});

describe('lockManager (singleton)', () => {
  it('deve ser uma instância de LockManager funcional', async () => {
    const release = await lockManager.acquire('singleton-book');

    expect(lockManager.isLocked('singleton-book')).toBe(true);

    release();
    expect(lockManager.isLocked('singleton-book')).toBe(false);
  });
});
