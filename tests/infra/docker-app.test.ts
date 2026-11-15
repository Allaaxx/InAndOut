import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Application Containerization and Compose Profile (Ticket #32)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const dockerignorePath = path.join(rootDir, '.dockerignore');
  const dockerfilePath = path.join(rootDir, 'Dockerfile');
  const composePath = path.join(rootDir, 'docker-compose.yml');

  describe('.dockerignore', () => {
    it('exists in the project root', () => {
      expect(fs.existsSync(dockerignorePath)).toBe(true);
    });

    it('ignores node_modules, dist, .git, .env, logs, and tests', () => {
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));

      expect(lines).toContain('node_modules');
      expect(lines).toContain('dist');
      expect(lines).toContain('.git');
      expect(lines).toContain('.env');
      expect(lines.some((l) => l === 'tests' || l === 'tests/')).toBe(true);
      expect(lines.some((l) => l.includes('log'))).toBe(true);
    });
  });

  describe('Dockerfile', () => {
    it('exists in the project root', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('uses node:22-alpine and configures multi-stage build', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/FROM\s+node:22-alpine\s+AS\s+builder/i);
      expect(content).toMatch(/FROM\s+node:22-alpine\s+AS\s+runner/i);
    });

    it('generates prisma client in build stage', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/prisma\s+generate/);
    });

    it('builds application client assets', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/npm\s+run\s+build|vite\s+build/);
    });

    it('exposes port 3000', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/EXPOSE\s+3000/);
    });

    it('defines start CMD with node and tsx', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(
        /CMD\s*\[.*node.*--import.*tsx.*src\/server\/main\/server\.ts.*\]/,
      );
    });
  });

  describe('docker-compose.yml app service', () => {
    it('declares app service with app profile and container name', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/app:\s*\n/);
      expect(content).toMatch(/profiles:\s*\[.*["']app["'].*\]/);
      expect(content).toMatch(/container_name:\s*inandout-app/);
      expect(content).toMatch(/build:\s*\./);
    });

    it('configures app dependency on healthy postgres service', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(
        /depends_on:\s*\n\s+postgres:\s*\n\s+condition:\s*service_healthy/m,
      );
    });

    it('configures app environment variables for database connection, port, and host', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(
        /DATABASE_URL:\s*postgresql:\/\/\$\{POSTGRES_USER:-inandout_user\}:\$\{POSTGRES_PASSWORD:-inandout_pass\}@postgres:5432\/\$\{POSTGRES_DB:-inandout\}\?schema=public/,
      );
      expect(content).toMatch(/PORT:\s*3000/);
      expect(content).toMatch(/HOST:\s*0\.0\.0\.0/);
    });

    it('maps port 3000:3000', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/["']3000:3000["']/);
    });
  });

  describe('docker compose profiles CLI behavior', () => {
    it('lists only postgres by default without profiles', () => {
      const output = execSync('docker compose config --services', {
        cwd: rootDir,
        encoding: 'utf-8',
      }).trim();
      const services = output
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(services).toContain('postgres');
      expect(services).not.toContain('app');
    });

    it('lists both postgres and app when profile app is enabled', () => {
      const output = execSync(
        'docker compose --profile app config --services',
        {
          cwd: rootDir,
          encoding: 'utf-8',
        },
      ).trim();
      const services = output
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(services).toContain('postgres');
      expect(services).toContain('app');
    });
  });
});
