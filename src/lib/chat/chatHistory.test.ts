import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { userId: string; role: string; content: string; createdAt: Date };

const insertMany = vi.fn<(rows: Row[]) => Promise<unknown>>();
const countDocuments = vi.fn<() => Promise<number>>();
const deleteMany = vi.fn<(f: unknown) => Promise<{ deletedCount: number }>>();
let findRows: Row[] = [];

const fakeCol = {
  insertMany,
  countDocuments,
  deleteMany,
  find: vi.fn(() => ({
    sort: () => ({
      limit: () => ({ toArray: async () => findRows }),
    }),
  })),
};
vi.mock('@/lib/mongodb', () => ({ getDb: async () => ({ collection: () => fakeCol }) }));

const { appendTurn, recentUserQuestions, clearHistory, MAX_MESSAGES_PER_USER } = await import(
  './chatHistory'
);

beforeEach(() => {
  vi.clearAllMocks();
  findRows = [];
  countDocuments.mockResolvedValue(2);
  deleteMany.mockResolvedValue({ deletedCount: 0 });
});

describe('appendTurn', () => {
  it('stores the user message then the assistant message', async () => {
    await appendTurn('u1', 'why is TCS down?', 'Margins slipped last quarter.');
    const rows = insertMany.mock.calls[0][0];
    expect(rows.map((r) => r.role)).toEqual(['user', 'assistant']);
    expect(rows[1].createdAt.getTime()).toBeGreaterThan(rows[0].createdAt.getTime());
  });

  it('prunes the oldest rows once past the per-user cap', async () => {
    countDocuments.mockResolvedValue(MAX_MESSAGES_PER_USER + 4);
    findRows = [
      { userId: 'u1', role: 'user', content: 'old', createdAt: new Date('2026-01-01') },
      { userId: 'u1', role: 'assistant', content: 'old', createdAt: new Date('2026-01-02') },
      { userId: 'u1', role: 'user', content: 'old', createdAt: new Date('2026-01-03') },
      { userId: 'u1', role: 'assistant', content: 'old', createdAt: new Date('2026-01-04') },
    ];
    await appendTurn('u1', 'q', 'a');
    expect(deleteMany).toHaveBeenCalledWith({
      userId: 'u1',
      createdAt: { $lte: new Date('2026-01-04') },
    });
  });

  it('never throws when the db is unreachable', async () => {
    insertMany.mockRejectedValue(new Error('mongo down'));
    await expect(appendTurn('u1', 'q', 'a')).resolves.toBeUndefined();
  });
});

describe('recentUserQuestions', () => {
  it('returns user-role contents oldest-first', async () => {
    findRows = [
      { userId: 'u1', role: 'user', content: 'newest', createdAt: new Date(3) },
      { userId: 'u1', role: 'user', content: 'older', createdAt: new Date(2) },
    ];
    expect(await recentUserQuestions('u1')).toEqual(['older', 'newest']);
  });

  it('returns [] on error', async () => {
    fakeCol.find.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(await recentUserQuestions('u1')).toEqual([]);
  });
});

describe('clearHistory', () => {
  it('deletes all of the user rows and returns the count', async () => {
    deleteMany.mockResolvedValue({ deletedCount: 12 });
    expect(await clearHistory('u1')).toBe(12);
    expect(deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
  });
});
