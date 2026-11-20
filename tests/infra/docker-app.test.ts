import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(__dirname, '../../');

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
}

function listComposeServices(command: string): string[] {
  return execSync(command, { cwd: rootDir, encoding: 'utf-8' })
    .trim()
    .split('\n')
    .map((service) => service.trim())
    .filter(Boolean);
}

describe('Application Containerization: separate db, api and web containers', () => {
  describe('.dockerignore', () => {
    it('ignores node_modules, dist, .git, .env, logs, tests and the npm lockfile', () => {
      const lines = readProjectFile('.dockerignore')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

      expect(lines).toContain('node_modules');
      expect(lines).toContain('dist');
      expect(lines).toContain('.git');
      expect(lines).toContain('.env');
      expect(lines).toContain('package-lock.json');
      expect(lines.some((line) => line === 'tests' || line === 'tests/')).toBe(
        true,
      );
      expect(lines.some((line) => line.includes('log'))).toBe(true);
    });
  });

  describe('docker/api.Dockerfile', () => {
    const content = readProjectFile('docker/api.Dockerfile');

    it('installs dependencies with pnpm from the frozen lockfile', () => {
      expect(content).toMatch(/corepack\s+enable/);
      expect(content).toMatch(/pnpm\s+install\s+--frozen-lockfile/);
      expect(content).not.toMatch(/npm\s+ci/);
    });

    it('uses node:22-alpine multi-stage build and generates prisma client', () => {
      expect(content).toMatch(/FROM\s+node:22-alpine\s+AS\s+deps/i);
      expect(content).toMatch(/FROM\s+node:22-alpine\s+AS\s+runner/i);
      expect(content).toMatch(/prisma\s+generate/);
    });

    it('exposes port 3000 and starts through the entrypoint', () => {
      expect(content).toMatch(/EXPOSE\s+3000/);
      expect(content).toMatch(/ENTRYPOINT\s*\[.*api-entrypoint\.sh.*\]/);
    });
  });

  describe('docker/api-entrypoint.sh', () => {
    const content = readProjectFile('docker/api-entrypoint.sh');

    it('applies migrations before starting the server with tsx', () => {
      const migrateIndex = content.search(/prisma\s+migrate\s+deploy/);
      const startIndex = content.search(
        /node\s+--import\s+tsx\s+src\/server\/main\/server\.ts/,
      );
      expect(migrateIndex).toBeGreaterThan(-1);
      expect(startIndex).toBeGreaterThan(migrateIndex);
    });
  });

  describe('docker/web.Dockerfile', () => {
    const content = readProjectFile('docker/web.Dockerfile');

    it('builds client assets with vite using a relative API URL', () => {
      expect(content).toMatch(/pnpm\s+install\s+--frozen-lockfile/);
      expect(content).toMatch(/ARG\s+VITE_API_URL=\/api/);
      expect(content).toMatch(/vite\s+build/);
    });

    it('serves the build with nginx', () => {
      expect(content).toMatch(/FROM\s+nginx:[\w.-]+\s+AS\s+runner/i);
      expect(content).toMatch(/\/usr\/share\/nginx\/html/);
    });
  });

  describe('docker/nginx.conf', () => {
    const content = readProjectFile('docker/nginx.conf');

    it('proxies /api (REST and websocket) to the api container', () => {
      expect(content).toMatch(/http:\/\/api:3000/);
      expect(content).toMatch(/location\s+\/api\/\s*\{[^}]*proxy_pass/);
      expect(content).toMatch(/proxy_set_header\s+Upgrade/);
    });

    it('falls back to index.html for client-side routes', () => {
      expect(content).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html/);
    });
  });

  describe('docker-compose.yml', () => {
    const content = readProjectFile('docker-compose.yml');

    it('declares api and web services under the app profile', () => {
      expect(content).toMatch(/container_name:\s*inandout-api/);
      expect(content).toMatch(/container_name:\s*inandout-web/);
      expect(content).toMatch(/dockerfile:\s*docker\/api\.Dockerfile/);
      expect(content).toMatch(/dockerfile:\s*docker\/web\.Dockerfile/);
    });

    it('makes the api wait for a healthy postgres service', () => {
      expect(content).toMatch(
        /depends_on:\s*\n\s+postgres:\s*\n\s+condition:\s*service_healthy/m,
      );
    });

    it('configures api environment for database connection, port and host', () => {
      expect(content).toMatch(
        /DATABASE_URL:\s*postgresql:\/\/\$\{POSTGRES_USER:-inandout_user\}:\$\{POSTGRES_PASSWORD:-inandout_pass\}@postgres:5432\/\$\{POSTGRES_DB:-inandout\}\?schema=public/,
      );
      expect(content).toMatch(/PORT:\s*3000/);
      expect(content).toMatch(/HOST:\s*0\.0\.0\.0/);
    });

    it('publishes api on 3000 and web on 8080 by default', () => {
      expect(content).toMatch(/["']\$\{API_PORT:-3000\}:3000["']/);
      expect(content).toMatch(/["']\$\{WEB_PORT:-8080\}:80["']/);
    });
  });

  describe('docker compose profiles CLI behavior', () => {
    it('lists only postgres by default without profiles', () => {
      const services = listComposeServices('docker compose config --services');
      expect(services).toEqual(['postgres']);
    });

    it('lists postgres, api and web when profile app is enabled', () => {
      const services = listComposeServices(
        'docker compose --profile app config --services',
      );
      expect(services).toEqual(
        expect.arrayContaining(['postgres', 'api', 'web']),
      );
    });
  });
});
