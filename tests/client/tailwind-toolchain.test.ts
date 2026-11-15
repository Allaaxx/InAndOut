import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Toolchain Seam: Tailwind CSS & PostCSS Configuration', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('verifies postcss.config.js is present and configures tailwindcss and autoprefixer', () => {
    const postcssPath = path.join(rootDir, 'postcss.config.js');
    expect(fs.existsSync(postcssPath)).toBe(true);

    const postcssContent = fs.readFileSync(postcssPath, 'utf-8');
    expect(postcssContent).toContain('tailwindcss');
    expect(postcssContent).toContain('autoprefixer');
  });

  it('verifies tailwind.config.js scans index.html and src/**/*.{ts,tsx} with Shadcn UI tokens', () => {
    const tailwindPath = path.join(rootDir, 'tailwind.config.js');
    expect(fs.existsSync(tailwindPath)).toBe(true);

    const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8');
    expect(tailwindContent).toContain('./index.html');
    expect(tailwindContent).toContain('./src/**/*.{ts,tsx}');
    expect(tailwindContent).toContain('--background');
    expect(tailwindContent).toContain('--foreground');
    expect(tailwindContent).toContain('--border');
    expect(tailwindContent).toContain('--ring');
  });

  it('verifies src/client/index.css defines Tailwind directives and CSS variables', () => {
    const cssPath = path.join(rootDir, 'src/client/index.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('@tailwind base;');
    expect(cssContent).toContain('@tailwind components;');
    expect(cssContent).toContain('@tailwind utilities;');
    expect(cssContent).toContain('--background:');
    expect(cssContent).toContain('--foreground:');
    expect(cssContent).toContain('--border:');
    expect(cssContent).toContain('--ring:');
  });

  it('verifies src/client/main.tsx imports ./index.css', () => {
    const mainPath = path.join(rootDir, 'src/client/main.tsx');
    expect(fs.existsSync(mainPath)).toBe(true);

    const mainContent = fs.readFileSync(mainPath, 'utf-8');
    expect(mainContent).toContain("import './index.css';");
  });
});
