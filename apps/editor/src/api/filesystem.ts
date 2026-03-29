import client from './client';

export interface FsEntry {
  name: string;
  path: string;
  absolutePath: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: string;
  ext: string | null;
}

export interface FsListResult {
  root: string;
  path: string;
  items: FsEntry[];
}

export interface FsReadResult {
  path: string;
  absolutePath: string;
  content: string;
  size: number;
  modifiedAt: string;
  ext: string;
}

export interface FsExecResult {
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface FsSearchResult {
  query: string;
  root: string;
  results: { path: string; line: number; text: string }[];
}

const fs = {
  list: (root: string, dirPath = '.') =>
    client.get<FsListResult>('/api/fs/list', { params: { root, path: dirPath } }).then(r => r.data),

  read: (root: string, filePath: string) =>
    client.get<FsReadResult>('/api/fs/read', { params: { root, path: filePath } }).then(r => r.data),

  write: (root: string, filePath: string, content: string, createDirs = true) =>
    client.post('/api/fs/write', { root, path: filePath, content, createDirs }).then(r => r.data),

  patch: (root: string, filePath: string, oldStr: string, newStr: string) =>
    client.post('/api/fs/patch', { root, path: filePath, oldStr, newStr }).then(r => r.data),

  append: (root: string, filePath: string, content: string) =>
    client.post('/api/fs/append', { root, path: filePath, content }).then(r => r.data),

  delete: (root: string, filePath: string) =>
    client.delete('/api/fs/delete', { params: { root, path: filePath } }).then(r => r.data),

  rename: (root: string, from: string, to: string) =>
    client.post('/api/fs/rename', { root, from, to }).then(r => r.data),

  mkdir: (root: string, dirPath: string) =>
    client.post('/api/fs/mkdir', { root, path: dirPath }).then(r => r.data),

  search: (root: string, q: string, dirPath = '.', limit = 50) =>
    client.get<FsSearchResult>('/api/fs/search', { params: { root, q, path: dirPath, limit } }).then(r => r.data),

  exec: (root: string, command: string, timeout = 30000) =>
    client.post<FsExecResult>('/api/fs/exec', { root, command, timeout }).then(r => r.data),

  stat: (root: string, filePath: string) =>
    client.get('/api/fs/stat', { params: { root, path: filePath } }).then(r => r.data),

  pickFolder: () =>
    client.get<{ path: string | null; cancelled?: boolean }>('/api/fs/pick-folder').then(r => r.data),
};

export default fs;
