import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Quality Seam: Continuous Integration & Smoke Test Pipeline', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const ciWorkflowPath = path.join(rootDir, '.github/workflows/ci.yml');

  it('validates .github/workflows/ci.yml configuration file existence', () => {
    expect(fs.existsSync(ciWorkflowPath)).toBe(true);
  });

  it('validates workflow triggers for push and pull_request on main branch', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');

    // Push trigger
    expect(content).toMatch(/push:\s*\n\s*branches:\s*\n\s*-\s*main/);
    // Pull request trigger
    expect(content).toMatch(/pull_request:\s*\n\s*branches:\s*\n\s*-\s*main/);
  });

  it('validates runner environment and setup steps (ubuntu-latest, pnpm, node LTS cache)', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');

    expect(content).toContain('runs-on: ubuntu-latest');
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('pnpm/action-setup@v4');
    expect(content).toContain('actions/setup-node@v4');
    expect(content).toMatch(/node-version:\s*22/);
    expect(content).toMatch(/cache:\s*['"]?pnpm['"]?/);
  });

  it('validates strict dependency installation and prisma client generation', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');

    expect(content).toContain('pnpm install --frozen-lockfile');
    expect(content).toContain('pnpm exec prisma generate');
  });

  it('validates static verification steps (lint:check, typecheck, audit:deps)', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');

    expect(content).toContain('pnpm run lint:check');
    expect(content).toContain('pnpm run typecheck');
    expect(content).toContain('pnpm run audit:deps');
  });

  it('validates automated test execution step', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');

    expect(content).toContain('pnpm test');
  });

  it('validates build smoke test step and compiled artifact assertions', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');

    expect(content).toContain('pnpm run build');
    expect(content).toContain('dist/index.html');
    expect(content).toMatch(
      /test -f dist\/index\.html\s*&&\s*test -d dist\/assets/,
    );
  });

  it('executes build smoke test assertion cleanly against existing dist artifacts', () => {
    // Ensure build is executed first so artifacts exist
    execSync('pnpm run build', {
      cwd: rootDir,
      stdio: 'pipe',
    });

    const indexHtml = path.join(rootDir, 'dist/index.html');
    const assetsDir = path.join(rootDir, 'dist/assets');

    expect(fs.existsSync(indexHtml)).toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);

    expect(() => {
      execSync('test -f dist/index.html && test -d dist/assets', {
        cwd: rootDir,
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});
