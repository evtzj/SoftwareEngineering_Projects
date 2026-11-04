// Public repository loading is kept separate from source analysis and reporting.
export function parseRepository(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('请输入 https://github.com/用户名/仓库名，可附 /tree/分支/子目录'); }
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || parts.length < 2 || (parts.length > 2 && parts[2] !== 'tree'))
    throw new Error('链接格式无效，请使用 https://github.com/用户名/仓库名 或 /tree/分支/子目录');
  if (parts[2] === 'tree' && parts.length < 4) throw new Error('tree 链接缺少分支');
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, ''), tail: parts.slice(3) };
}
export async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const error = new Error(response.status === 404 ? '仓库、分支或目录不存在，或为无法访问的私有仓库（404）' : response.status === 403 || response.status === 429 ? 'GitHub API 访问受限，请稍后重试或填写 Token（403/429）' : `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return response;
}
export async function repositoryFiles(value, { token = '', branch = '', directory = '', status = () => {} } = {}) {
  const { owner, repo, tail } = parseRepository(value);
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers = { Accept: 'application/vnd.github+json', ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}) };
  const api = async path => (await request(base + path, { headers })).json();
  status('正在读取仓库信息…');
  let commit;
  if (!branch && tail.length) {
    // Find the longest valid ref so branch names containing slashes also work.
    for (let n = tail.length; n > 0; n--) {
      try {
        commit = await api('/commits/' + encodeURIComponent(tail.slice(0, n).join('/')));
        branch = tail.slice(0, n).join('/');
        directory ||= tail.slice(n).join('/');
        break;
      } catch (error) { if (error.status !== 404 || n === 1) throw error; }
    }
  } else {
    branch ||= (await api('')).default_branch;
    commit = await api('/commits/' + encodeURIComponent(branch));
    if (tail.length && !directory) directory = tail.slice(1).join('/');
  }
  directory = directory.replace(/^\/+|\/+$/g, '');
  status('正在获取源码文件列表…');
  const tree = await api('/git/trees/' + commit.commit.tree.sha + '?recursive=1');
  if (tree.truncated) throw new Error('仓库文件列表过大，GitHub 返回了不完整列表，请下载目标文件夹后使用本地统计。');
  const entries = tree.tree.filter(e => e.type === 'blob' && (!directory || e.path.startsWith(directory + '/')));
  if (directory && !tree.tree.some(e => e.path === directory && e.type === 'tree')) throw new Error('指定子目录不存在，请检查目录路径。');
  const revision = commit.sha;
  return entries.map(entry => ({
    name: entry.path,
    async text() {
      const encoded = entry.path.split('/').map(encodeURIComponent).join('/');
      // Token is sent only to api.github.com, never to either download host.
      try { return await (await request(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${revision}/${encoded}`)).text(); }
      catch { return (await request(`https://raw.githubusercontent.com/${owner}/${repo}/${revision}/${encoded}`)).text(); }
    },
  }));
}
