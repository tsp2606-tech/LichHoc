import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndPaginateLogs } from './logs.js';

test('filterAndPaginateLogs filters by email and paginates 15 items per page', () => {
  const logs = Array.from({ length: 35 }, (_, index) => ({
    id: index + 1,
    user_email: index % 2 === 0 ? 'student@example.com' : 'admin@example.com',
    action: 'Đăng nhập',
    details: `Log ${index + 1}`,
  }));

  const result = filterAndPaginateLogs(logs, 'student', 15, 2);

  assert.equal(result.totalItems, 18);
  assert.equal(result.totalPages, 2);
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].details, 'Log 31');
  assert.equal(result.items.at(-1).details, 'Log 35');
});

test('filterAndPaginateLogs handles empty search and page overflow safely', () => {
  const logs = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    user_email: `user${index + 1}@example.com`,
    action: 'Cập nhật',
    details: `Detail ${index + 1}`,
  }));

  const result = filterAndPaginateLogs(logs, '', 15, 99);

  assert.equal(result.totalItems, 20);
  assert.equal(result.totalPages, 2);
  assert.equal(result.currentPage, 2);
  assert.equal(result.items.length, 5);
});
