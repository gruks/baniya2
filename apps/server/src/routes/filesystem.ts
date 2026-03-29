import { Router } from 'express';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
export const filesystemRouter: Router = Router();

// ─── Root resolution ──────────────────────────────────────────────
// The agent root can be any absolute path set by the user per-request
// or defaults to the server cwd. No sandboxing — this is intentional
// (same trust model as VS Code / Claude Code running locally).

function resolveRoot(root?: string): string {
  if (root && path.isAbsolute(root)) return root;
  if (root) return path.resolve(process.cwd(), root);
  return process.cwd();
}

function abs(root: string, rel: string): string {
  return path.resolve(root, rel);
}

// ─── Native folder picker ─────────────────────────────────────────
filesystemRouter.get('/pick-folder', async (req, res) => {
  try {
    // Write the PS script to a temp file to avoid quoting hell
    const script = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$dlg = New-Object System.Windows.Forms.FolderBrowserDialog',
      '$dlg.Description = "Select a folder to open"',
      '$dlg.ShowNewFolderButton = $true',
      '$dlg.RootFolder = [System.Environment+SpecialFolder]::MyComputer',
      '$result = $dlg.ShowDialog()',
      'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dlg.SelectedPath }',
    ].join('; ');

    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${script}"`,
      { timeout: 60_000 }
    );
    const selected = stdout.trim();
    if (selected) {
      res.json({ path: selected });
    } else {
      res.json({ path: null, cancelled: true });
    }
  } catch (err: any) {
    res.status(400).json({ error: 'Folder picker failed: ' + err.message });
  }
});

// ─── List directory ───────────────────────────────────────────────
filesystemRouter.get('/list', async (req, res) => {
  try {
    const root = resolveRoot(req.query.root as string);
    const dir = abs(root, (req.query.path as string) || '.');
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const items = await Promise.all(entries.map(async (e) => {
      const fullPath = path.join(dir, e.name);
      let size = 0;
      let modifiedAt = '';
      try {
        const stat = await fs.stat(fullPath);
        size = stat.size;
        modifiedAt = stat.mtime.toISOString();
      } catch { /* ignore */ }
      return {
        name: e.name,
        path: path.relative(root, fullPath).replace(/\\/g, '/'),
        absolutePath: fullPath,
        type: e.isDirectory() ? 'directory' : 'file',
        size,
        modifiedAt,
        ext: e.isFile() ? path.extname(e.name).slice(1) : null,
      };
    }));

    // Dirs first, then files, both alphabetical
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ root, path: path.relative(root, dir).replace(/\\/g, '/') || '.', items });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Read file ────────────────────────────────────────────────────
filesystemRouter.get('/read', async (req, res) => {
  try {
    const root = resolveRoot(req.query.root as string);
    const filePath = abs(root, req.query.path as string);
    const stat = await fs.stat(filePath);

    // Refuse to read files > 5MB as text
    if (stat.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (>5MB). Use binary download.' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    res.json({
      path: (req.query.path as string),
      absolutePath: filePath,
      content,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      ext: path.extname(filePath).slice(1),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Write file (full overwrite) ──────────────────────────────────
filesystemRouter.post('/write', async (req, res) => {
  try {
    const { root, path: filePath, content, createDirs = true } = req.body;
    const rootDir = resolveRoot(root);
    const fullPath = abs(rootDir, filePath);

    if (createDirs) {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
    }

    await fs.writeFile(fullPath, content ?? '', 'utf8');
    const stat = await fs.stat(fullPath);
    res.json({ path: filePath, absolutePath: fullPath, size: stat.size, modifiedAt: stat.mtime.toISOString() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Patch file (apply string replacement) ────────────────────────
filesystemRouter.post('/patch', async (req, res) => {
  try {
    const { root, path: filePath, oldStr, newStr } = req.body;
    const rootDir = resolveRoot(root);
    const fullPath = abs(rootDir, filePath);

    let content = await fs.readFile(fullPath, 'utf8');
    if (!content.includes(oldStr)) {
      return res.status(409).json({ error: 'oldStr not found in file', path: filePath });
    }
    content = content.replace(oldStr, newStr);
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({ path: filePath, patched: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Append to file ───────────────────────────────────────────────
filesystemRouter.post('/append', async (req, res) => {
  try {
    const { root, path: filePath, content } = req.body;
    const rootDir = resolveRoot(root);
    const fullPath = abs(rootDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.appendFile(fullPath, content ?? '', 'utf8');
    const stat = await fs.stat(fullPath);
    res.json({ path: filePath, size: stat.size });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Delete file or directory ─────────────────────────────────────
filesystemRouter.delete('/delete', async (req, res) => {
  try {
    const root = resolveRoot(req.query.root as string);
    const filePath = abs(root, req.query.path as string);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
    res.json({ path: req.query.path, deleted: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Rename / move ────────────────────────────────────────────────
filesystemRouter.post('/rename', async (req, res) => {
  try {
    const { root, from, to } = req.body;
    const rootDir = resolveRoot(root);
    const fromPath = abs(rootDir, from);
    const toPath = abs(rootDir, to);
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.rename(fromPath, toPath);
    res.json({ from, to, moved: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Make directory ───────────────────────────────────────────────
filesystemRouter.post('/mkdir', async (req, res) => {
  try {
    const { root, path: dirPath } = req.body;
    const rootDir = resolveRoot(root);
    const fullPath = abs(rootDir, dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ path: dirPath, absolutePath: fullPath, created: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Search in files (grep-like) ──────────────────────────────────
filesystemRouter.get('/search', async (req, res) => {
  try {
    const root = resolveRoot(req.query.root as string);
    const query = req.query.q as string;
    const dir = abs(root, (req.query.path as string) || '.');
    const maxResults = parseInt(req.query.limit as string) || 50;

    if (!query) return res.status(400).json({ error: 'q is required' });

    const results: object[] = [];

    async function searchDir(d: string) {
      if (results.length >= maxResults) return;
      let entries: fsSync.Dirent[];
      try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        const fullPath = path.join(d, entry.name);
        // Skip common noise dirs
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist', '.next', '__pycache__'].includes(entry.name)) continue;
          await searchDir(fullPath);
        } else {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size > 1024 * 1024) continue; // skip >1MB
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  path: path.relative(root, fullPath).replace(/\\/g, '/'),
                  line: i + 1,
                  text: lines[i].trim(),
                });
                if (results.length >= maxResults) break;
              }
            }
          } catch { /* binary or unreadable */ }
        }
      }
    }

    await searchDir(dir);
    res.json({ query, root, results });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Run shell command ────────────────────────────────────────────
filesystemRouter.post('/exec', async (req, res) => {
  try {
    const { root, command, timeout = 30000 } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });
    const cwd = resolveRoot(root);
    const { stdout, stderr } = await execAsync(command, { cwd, timeout });
    res.json({ command, cwd, stdout, stderr, exitCode: 0 });
  } catch (err: any) {
    res.status(200).json({
      command: req.body.command,
      cwd: resolveRoot(req.body.root),
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message,
      exitCode: err.code ?? 1,
    });
  }
});

// ─── Stat a path ──────────────────────────────────────────────────
filesystemRouter.get('/stat', async (req, res) => {
  try {
    const root = resolveRoot(req.query.root as string);
    const filePath = abs(root, req.query.path as string);
    const stat = await fs.stat(filePath);
    res.json({
      path: req.query.path,
      absolutePath: filePath,
      type: stat.isDirectory() ? 'directory' : 'file',
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      createdAt: stat.birthtime.toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
