import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('Quality Seam: Knip Dead-Code & Unused Dependency Auditor', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('declares knip in devDependencies of root package.json', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.devDependencies).toBeDefined();
    expect(pkg.devDependencies.knip).toBeDefined();
  });

  it('declares audit:deps script in root package.json', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts['audit:deps']).toBe('knip');
  });

  it('defines knip.json with required entrypoints, project scopes, and ignore rules', () => {
    const knipConfigPath = path.join(rootDir, 'knip.json');
    expect(fs.existsSync(knipConfigPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(knipConfigPath, 'utf-8'));

    const expectedEntrypoints = [
      'index.html',
      'src/client/main.tsx',
      'src/server/main/server.ts',
      'prisma/seed.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'apps/*/src/index.ts',
    ];

    for (const entry of expectedEntrypoints) {
      expect(config.entry).toContain(entry);
    }

    expect(config.project).toContain('src/**/*.{ts,tsx}');
    expect(config.project).toContain('apps/**/*.{ts,tsx}');

    expect(config.ignoreDependencies).toBeDefined();
    expect(config.ignoreDependencies).toContain('@radix-ui/react-slot');
    expect(config.ignoreDependencies).toContain('react-router-dom');
  });

  it('executes pnpm run audit:deps cleanly with exit code 0 on the clean workspace', () => {
    expect(() => {
      execSync('pnpm run audit:deps', {
        cwd: rootDir,
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('fails with a non-zero exit code when an orphaned file or export is detected', () => {
    const tempFile = path.join(rootDir, 'src/temp-orphaned-file.ts');
    try {
      fs.writeFileSync(tempFile, 'export const orphanedThing = 42;\n');
      expect(() => {
        execSync('pnpm run audit:deps', {
          cwd: rootDir,
          stdio: 'pipe',
        });
      }).toThrow();
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
});
