/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['src/server.js', 'index.js', 'src', 'scripts', 'tests'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', '.next', 'package']);

const isJavaScriptFile = (filePath) => filePath.endsWith('.js');

const collectFiles = (targetPath, files) => {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    if (isJavaScriptFile(targetPath)) {
      files.push(targetPath);
    }
    return;
  }

  if (!stat.isDirectory()) {
    return;
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      collectFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && isJavaScriptFile(fullPath)) {
      files.push(fullPath);
    }
  }
};

const runNodeCheck = (filePath) => {
  return spawnSync(process.execPath, ['--check', filePath], {
    cwd: ROOT,
    encoding: 'utf8',
  });
};

const main = () => {
  const files = [];

  for (const target of TARGETS) {
    collectFiles(path.join(ROOT, target), files);
  }

  const uniqueFiles = [...new Set(files)].sort();

  if (uniqueFiles.length === 0) {
    console.log('No JavaScript files found for syntax check.');
    return;
  }

  let failedCount = 0;

  for (const file of uniqueFiles) {
    const result = runNodeCheck(file);

    if (result.status !== 0) {
      failedCount += 1;
      const relativePath = path.relative(ROOT, file).replace(/\\/g, '/');
      console.error(`\n[lint] Syntax error in ${relativePath}`);
      if (result.stderr) {
        console.error(result.stderr.trim());
      }
      if (result.stdout) {
        console.error(result.stdout.trim());
      }
    }
  }

  if (failedCount > 0) {
    console.error(`\n[lint] Failed: ${failedCount} file(s) have syntax errors.`);
    process.exit(1);
  }

  console.log(`[lint] OK: ${uniqueFiles.length} JavaScript file(s) passed syntax check.`);
};

main();
