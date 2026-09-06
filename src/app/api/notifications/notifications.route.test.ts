import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentUserId, storeMock } = vi.hoisted(() => ({
  getCurrentUserId: vi.fn<() => Promise<string | null>>(),
  storeMock: { listNotifications: vi.fn(), markRead: vi.fn() },
}));
vi.mock('@/lib/currentUserId', () => ({ getCurrentUserId }));
vi.mock('@/lib/notifications/store', () => storeMock);

import { GET } from './route';
import { POST } from './read/route';

const readReq = (body: unknown) =>
  POST(new Request('http://localhost/api/notifications/read', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserId.mockResolvedValue('u1');
});

describe('GET /api/notifications', () => {
  it('401s when unauthenticated', async () => {
    getCurrentUserId.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/notifications'))).status).toBe(401);
  });

  it('returns items with an unread count in meta', async () => {
    storeMock.listNotifications.mockResolvedValue({ items: [{ id: 'n1' }], unread: 1 });
    const res = await GET(new Request('http://localhost/api/notifications'));
    const body = await res.json();
    expect(body).toEqual({ success: true, data: [{ id: 'n1' }], meta: { unread: 1 } });
  });

  it('clamps a silly limit to the default', async () => {
    storeMock.listNotifications.mockResolvedValue({ items: [], unread: 0 });
    await GET(new Request('http://localhost/api/notifications?limit=9999'));
    expect(storeMock.listNotifications).toHaveBeenCalledWith('u1', 50);
  });
});

describe('POST /api/notifications/read', () => {
  it('marks one by id', async () => {
    storeMock.markRead.mockResolvedValue(1);
    const res = await readReq({ id: 'n1' });
    expect(res.status).toBe(200);
    expect(storeMock.markRead).toHaveBeenCalledWith('u1', 'n1');
  });

  it('marks all when body is empty or {all:true}', async () => {
    storeMock.markRead.mockResolvedValue(3);
    await readReq({});
    await readReq({ all: true });
    expect(storeMock.markRead).toHaveBeenNthCalledWith(1, 'u1', undefined);
    expect(storeMock.markRead).toHaveBeenNthCalledWith(2, 'u1', undefined);
  });

  it('422s on a malformed body', async () => {
    const res = await readReq({ all: false });
    expect(res.status).toBe(422);
  });
});
