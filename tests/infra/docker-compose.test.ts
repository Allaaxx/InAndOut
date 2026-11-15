import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Infrastructure Configuration (Ticket #30)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const composePath = path.join(rootDir, 'docker-compose.yml');
  const envExamplePath = path.join(rootDir, '.env.example');
  const envPath = path.join(rootDir, '.env');
  const packageJsonPath = path.join(rootDir, 'package.json');

  describe('docker-compose.yml', () => {
    it('exists in the project root', () => {
      expect(fs.existsSync(composePath)).toBe(true);
    });

    it('configures postgres service with 16-alpine image and container name', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/postgres:\s*\n/);
      expect(content).toMatch(/image:\s*postgres:16-alpine/);
      expect(content).toMatch(/container_name:\s*inandout-postgres/);
      expect(content).toMatch(/restart:\s*unless-stopped/);
    });

    it('configures postgres environment variables with defaults', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(
        /POSTGRES_USER:\s*\$\{POSTGRES_USER:-inandout_user\}/,
      );
      expect(content).toMatch(
        /POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:-inandout_pass\}/,
      );
      expect(content).toMatch(/POSTGRES_DB:\s*\$\{POSTGRES_DB:-inandout\}/);
    });

    it('maps port with POSTGRES_PORT defaulting to 5433', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/["']\$\{POSTGRES_PORT:-5433\}:5432["']/);
    });

    it('configures named volume postgres_data', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/postgres_data:\/var\/lib\/postgresql\/data/);
      // Volume declared at root
      expect(content).toMatch(/^volumes:\s*\n\s+postgres_data:/m);
    });

    it('configures postgres healthcheck', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/healthcheck:/);
      expect(content).toMatch(
        /pg_isready -U \$\{POSTGRES_USER:-inandout_user\} -d \$\{POSTGRES_DB:-inandout\}/,
      );
      expect(content).toMatch(/interval:\s*5s/);
      expect(content).toMatch(/timeout:\s*5s/);
      expect(content).toMatch(/retries:\s*5/);
    });
  });

  describe('.env.example and .env', () => {
    it('.env.example exists and documents all required variables', () => {
      expect(fs.existsSync(envExamplePath)).toBe(true);
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      expect(content).toMatch(/^PORT=/m);
      expect(content).toMatch(/^HOST=/m);
      expect(content).toMatch(/^NODE_ENV=/m);
      expect(content).toMatch(/^POSTGRES_USER=/m);
      expect(content).toMatch(/^POSTGRES_PASSWORD=/m);
      expect(content).toMatch(/^POSTGRES_DB=/m);
      expect(content).toMatch(/^POSTGRES_PORT=5433/m);
      expect(content).toMatch(/^DATABASE_URL=/m);
      expect(content).toContain(
        'postgresql://inandout_user:inandout_pass@localhost:5433/inandout?schema=public',
      );
    });

    it('.env exists and contains working values for local development', () => {
      expect(fs.existsSync(envPath)).toBe(true);
      const content = fs.readFileSync(envPath, 'utf-8');

      expect(content).toMatch(/^PORT=/m);
      expect(content).toMatch(/^HOST=/m);
      expect(content).toMatch(/^NODE_ENV=/m);
      expect(content).toMatch(/^POSTGRES_USER=/m);
      expect(content).toMatch(/^POSTGRES_PASSWORD=/m);
      expect(content).toMatch(/^POSTGRES_DB=/m);
      expect(content).toMatch(/^POSTGRES_PORT=5433/m);
      expect(content).toMatch(/^DATABASE_URL=/m);
      expect(content).toContain(
        'postgresql://inandout_user:inandout_pass@localhost:5433/inandout?schema=public',
      );
    });
  });

  describe('package.json scripts', () => {
    it('defines db:up and db:down scripts', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts['db:up']).toBe('docker compose up -d postgres');
      expect(pkg.scripts['db:down']).toBe('docker compose down');
    });
  });
});
