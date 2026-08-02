import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Import, ImportResult, ImportStatus } from '../import';

describe('ImportStatus', () => {
  it('deve aceitar os quatro status de importação', () => {
    // Atribuição a variável tipada garante em tempo de compilação que a união aceita os valores
    const statuses: ImportStatus[] = ['pending', 'processing', 'completed', 'failed'];

    expect(statuses).toHaveLength(4);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('processing');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
  });

  it('ImportStatus deve ser exatamente a união esperada', () => {
    expectTypeOf<ImportStatus>().toEqualTypeOf<'pending' | 'processing' | 'completed' | 'failed'>();
  });
});

describe('tipo Import', () => {
  it('deve ter os campos esperados com os tipos esperados', () => {
    expectTypeOf<Import['id']>().toEqualTypeOf<string>();
    expectTypeOf<Import['userId']>().toEqualTypeOf<string>();
    expectTypeOf<Import['filename']>().toEqualTypeOf<string>();
    expectTypeOf<Import['fileHash']>().toEqualTypeOf<string>();
    expectTypeOf<Import['status']>().toEqualTypeOf<ImportStatus>();
    expectTypeOf<Import['totalRecords']>().toEqualTypeOf<number>();
    expectTypeOf<Import['importedRecords']>().toEqualTypeOf<number>();
    expectTypeOf<Import['duplicateRecords']>().toEqualTypeOf<number>();
    expectTypeOf<Import['invalidRecords']>().toEqualTypeOf<number>();
    expectTypeOf<Import['startedAt']>().toEqualTypeOf<string>();
    expectTypeOf<Import['completedAt']>().toEqualTypeOf<string | null>();
    expectTypeOf<Import['errorMessage']>().toEqualTypeOf<string | null>();
  });

  it('deve ser possível construir um Import concluído', () => {
    const importRecord: Import = {
      id: '01J00000000000000000000000',
      userId: '01J00000000000000000000001',
      filename: 'My Clippings.txt',
      fileHash: 'sha256-do-arquivo',
      status: 'completed',
      totalRecords: 100,
      importedRecords: 90,
      duplicateRecords: 8,
      invalidRecords: 2,
      startedAt: '2026-07-25T10:00:00.000Z',
      completedAt: '2026-07-25T10:00:05.000Z',
      errorMessage: null,
    };

    expect(importRecord.status).toBe('completed');
    expect(importRecord.errorMessage).toBeNull();
  });

  it('deve aceitar completedAt e errorMessage nulos durante o processamento', () => {
    const importRecord: Import = {
      id: '01J00000000000000000000000',
      userId: '01J00000000000000000000001',
      filename: 'My Clippings.txt',
      fileHash: 'sha256-do-arquivo',
      status: 'processing',
      totalRecords: 0,
      importedRecords: 0,
      duplicateRecords: 0,
      invalidRecords: 0,
      startedAt: '2026-07-25T10:00:00.000Z',
      completedAt: null,
      errorMessage: null,
    };

    expect(importRecord.completedAt).toBeNull();
  });
});

describe('tipo ImportResult', () => {
  it('deve ter os campos esperados com os tipos esperados', () => {
    expectTypeOf<ImportResult['importId']>().toEqualTypeOf<string>();
    expectTypeOf<ImportResult['status']>().toEqualTypeOf<ImportStatus>();
    expectTypeOf<ImportResult['totalRecords']>().toEqualTypeOf<number>();
    expectTypeOf<ImportResult['importedRecords']>().toEqualTypeOf<number>();
    expectTypeOf<ImportResult['duplicateRecords']>().toEqualTypeOf<number>();
    expectTypeOf<ImportResult['invalidRecords']>().toEqualTypeOf<number>();
    expectTypeOf<ImportResult['updatedBooks']>().toEqualTypeOf<string[]>();
  });

  it('deve ser possível construir um ImportResult válido', () => {
    const result: ImportResult = {
      importId: '01J00000000000000000000000',
      status: 'completed',
      totalRecords: 100,
      importedRecords: 90,
      duplicateRecords: 8,
      invalidRecords: 2,
      updatedBooks: ['01J00000000000000000000002'],
    };

    expect(result.updatedBooks).toHaveLength(1);
  });
});
