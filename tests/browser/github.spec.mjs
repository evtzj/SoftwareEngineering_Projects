import { test, expect } from '@playwright/test';

test('仓库分支子目录、CDN 回退、failed 计数与 11 列报表', async ({ page }) => {
  const apiRequests = [];
  const rawRequests = [];
  await page.route('https://api.github.com/**', async route => {
    apiRequests.push({ url: route.request().url(), auth: route.request().headers().authorization });
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/commits/dev')) return route.fulfill({ json: { sha: 'abc123', commit: { tree: { sha: 'tree123' } } } });
    if (url.pathname.endsWith('/git/trees/tree123')) return route.fulfill({ json: { tree: [
      { path: 'src', type: 'tree' }, { path: 'src/demo.py', type: 'blob' },
      { path: 'src/fail.py', type: 'blob' }, { path: 'outside.py', type: 'blob' },
      { path: 'src/readme.md', type: 'blob' },
    ] } });
    return route.fulfill({ status:404, body:'not found' });
  });
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status:503, body:'unavailable' }));
  await page.route('https://raw.githubusercontent.com/**', route => {
    rawRequests.push(route.request());
    return route.request().url().endsWith('/demo.py')
      ? route.fulfill({ body:'def add(a, b):\n    return a + b\n' })
      : route.fulfill({ status:404, body:'missing' });
  });
  await page.goto('/#code');
  await page.locator('.repository-details > summary').click();
  await page.locator('#repository-url').fill('https://github.com/example/project/tree/dev/src');
  await page.getByText('访问 Token（可选）', { exact:true }).click();
  await page.locator('#repository-token').fill('test-token');
  await page.locator('#count-repository').click();
  await expect(page.locator('#code-status')).toContainText('已统计 1 个文件');
  await expect(page.locator('#code-status')).toContainText('failed 1');
  await expect(page.locator('#code-status')).toContainText('src/fail.py');
  await expect(page.locator('#code-summary thead th')).toHaveCount(11);
  await expect(page.locator('#code-summary tbody tr').last()).toContainText('SUM');
  expect(rawRequests).toHaveLength(2);
  expect(rawRequests.every(r => !r.headers().authorization)).toBe(true);
  expect(apiRequests.every(r => r.auth === 'Bearer test-token')).toBe(true);
  await expect(page.locator('#repository-token')).toHaveValue('');
  await page.getByRole("link", { name: "1. 导入源码", exact: true }).click();
  await page.locator(".repository-details > summary").click();
  await page.locator('#repository-url').fill('https://github.com/example/missing');
  await page.locator('#count-repository').click();
  await expect(page.locator('#code-status')).toContainText('404');
  // A failed repository request preserves the previous report.
  await expect(page.locator('.stat-total strong')).toHaveText('2');
});

test('GitHub API 限额提供可操作的提示', async ({ page }) => {
  await page.route('https://api.github.com/**', route => route.fulfill({ status:403, body:'rate limited' }));
  await page.goto('/#code');
  await page.locator('.repository-details > summary').click();
  await page.locator('#repository-url').fill('https://github.com/example/project');
  await page.locator('#count-repository').click();
  await expect(page.locator('#code-status')).toContainText('稍后重试或填写 Token');
  await expect(page.locator('#count-repository')).toBeEnabled();
});
