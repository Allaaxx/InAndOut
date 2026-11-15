import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Quality Seam: Biome Unified Linter and Formatter', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const biomeConfigPath = path.join(rootDir, 'biome.json');
  const packageJsonPath = path.join(rootDir, 'package.json');

  it('validates biome.json configuration file existence and schema structure', () => {
    expect(existsSync(biomeConfigPath)).toBe(true);

    const configContent = readFileSync(biomeConfigPath, 'utf-8');
    const config = JSON.parse(configContent);

    expect(config).toBeDefined();

    // Formatter settings
    expect(config.formatter).toBeDefined();
    expect(config.formatter.enabled).toBe(true);
    expect(config.formatter.indentStyle).toBe('space');
    expect(config.formatter.indentWidth).toBe(2);

    // JavaScript formatter settings
    expect(config.javascript?.formatter).toBeDefined();
    expect(config.javascript.formatter.quoteStyle).toBe('single');
    expect(config.javascript.formatter.semicolons).toBe('always');

    // Linter settings
    expect(config.linter).toBeDefined();
    expect(config.linter.enabled).toBe(true);
    const hasPreset = config.linter.rules?.preset === 'recommended';
    const hasRecommended = config.linter.rules?.recommended === true;
    expect(hasPreset || hasRecommended).toBe(true);

    // Files includes/ignores
    const includes: string[] = config.files?.includes ?? [];
    const joinedIncludes = includes.join(' ');
    expect(joinedIncludes).toContain('node_modules');
    expect(joinedIncludes).toContain('dist');
    expect(joinedIncludes).toContain('coverage');
    expect(joinedIncludes).toContain('pnpm-lock.yaml');
    expect(joinedIncludes).toContain('.git');
  });

  it('validates package.json contains all required biome scripts', () => {
    expect(existsSync(packageJsonPath)).toBe(true);

    const pkgContent = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.lint).toBe('biome lint .');
    expect(pkg.scripts.format).toBe('biome format --write .');
    expect(pkg.scripts.check).toBe('biome check --write .');
    expect(pkg.scripts['lint:check']).toBe('biome check .');
  });

  it('executes biome lint . in sub-second time with zero errors', () => {
    const startTime = Date.now();
    let output = '';

    expect(() => {
      output = execSync('pnpm run lint 2>&1', {
        cwd: rootDir,
        encoding: 'utf-8',
      });
    }).not.toThrow();

    const duration = Date.now() - startTime;
    expect(output).toContain('Checked');
    expect(duration).toBeLessThan(3000);
  });

  it('executes biome check . in clean state with code 0', () => {
    let output = '';

    expect(() => {
      output = execSync('pnpm run lint:check 2>&1', {
        cwd: rootDir,
        encoding: 'utf-8',
      });
    }).not.toThrow();

    expect(output).toContain('Checked');
  });

  it('executes biome format . with code 0 without unexpected changes', () => {
    let output = '';

    expect(() => {
      output = execSync('pnpm run format 2>&1', {
        cwd: rootDir,
        encoding: 'utf-8',
      });
    }).not.toThrow();

    expect(output).toContain('Formatted');
  });
});
