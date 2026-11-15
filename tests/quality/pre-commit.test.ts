import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Quality Seam: Git Pre-Commit Hook Guardrails', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const preCommitHookPath = path.join(rootDir, '.husky/pre-commit');
  const lintStagedConfigPath = path.join(rootDir, '.lintstagedrc.json');
  const packageJsonPath = path.join(rootDir, 'package.json');

  it('validates .husky/pre-commit hook existence, executable permissions, and guardrail commands', () => {
    expect(existsSync(preCommitHookPath)).toBe(true);

    const stats = statSync(preCommitHookPath);
    // Ensure file has executable permissions (user, group, or other)
    const isExecutable = (stats.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);

    const hookContent = readFileSync(preCommitHookPath, 'utf-8');
    expect(hookContent).toContain('lint-staged');
    expect(hookContent).toContain('typecheck');
  });

  it('validates .lintstagedrc.json configuration file exists and has correct Biome commands', () => {
    expect(existsSync(lintStagedConfigPath)).toBe(true);

    const configContent = readFileSync(lintStagedConfigPath, 'utf-8');
    const config = JSON.parse(configContent);

    expect(config).toBeDefined();

    // Check configuration for TS/TSX/JS/JSX
    const tsRule = config['*.{ts,tsx,js,jsx}'];
    expect(tsRule).toBeDefined();
    const tsRuleString = Array.isArray(tsRule)
      ? tsRule.join(' ')
      : String(tsRule);
    expect(tsRuleString).toContain('biome check');
    expect(tsRuleString).toContain('--write');
    expect(tsRuleString).toContain('--no-errors-on-unmatched');

    // Check configuration for JSON/CSS/MD
    const formatRule = config['*.{json,css,md}'];
    expect(formatRule).toBeDefined();
    const formatRuleString = Array.isArray(formatRule)
      ? formatRule.join(' ')
      : String(formatRule);
    expect(formatRuleString).toContain('biome format');
    expect(formatRuleString).toContain('--write');
    expect(formatRuleString).toContain('--no-errors-on-unmatched');
  });

  it('validates package.json contains required husky and pre-commit scripts and devDependencies', () => {
    expect(existsSync(packageJsonPath)).toBe(true);

    const pkgContent = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.prepare).toBe('husky');
    expect(pkg.scripts['pre-commit']).toBeDefined();
    expect(pkg.scripts['pre-commit']).toContain('lint-staged');
    expect(pkg.scripts['pre-commit']).toContain('typecheck');

    expect(pkg.devDependencies).toBeDefined();
    expect(pkg.devDependencies.husky).toBeDefined();
    expect(pkg.devDependencies['lint-staged']).toBeDefined();
  });

  it('executes pnpm exec lint-staged cleanly with zero exit code', () => {
    let output = '';

    expect(() => {
      output = execSync('pnpm exec lint-staged', {
        cwd: rootDir,
        encoding: 'utf-8',
      });
    }).not.toThrow();

    expect(output).toBeDefined();
  });
});
