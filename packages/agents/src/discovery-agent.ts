import * as fs from 'fs';
import * as path from 'path';

export interface ProjectDiscoveryResult {
  rootPath: string;
  projectName: string;
  projectType: 'web' | 'api' | 'fullstack' | 'cli' | 'library';
  languages: ('typescript' | 'javascript' | 'python' | 'java' | 'go')[];
  frameworks: string[];
  testFrameworks: string[];
  testFilesFound: string[];
  hasPlaywright: boolean;
  hasVitestOrJest: boolean;
  hasPytest: boolean;
  hasDocker: boolean;
  ciPlatforms: string[];
}

export function discoverProject(rootDir = '.'): ProjectDiscoveryResult {
  const root = path.resolve(rootDir);
  const pkgPath = path.join(root, 'package.json');
  let pkg: any = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
      pkg = {};
    }
  }

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  const testFrameworks: string[] = [];
  const frameworks: string[] = [];

  if (allDeps['playwright'] || allDeps['@playwright/test']) testFrameworks.push('playwright');
  if (allDeps['cypress']) testFrameworks.push('cypress');
  if (allDeps['vitest']) testFrameworks.push('vitest');
  if (allDeps['jest']) testFrameworks.push('jest');
  if (allDeps['k6']) testFrameworks.push('k6');

  if (allDeps['react'] || allDeps['next']) frameworks.push('react');
  if (allDeps['express'] || allDeps['fastify']) frameworks.push('express/node');
  if (allDeps['vue']) frameworks.push('vue');

  // Check python
  const hasPy = fs.existsSync(path.join(root, 'requirements.txt')) || fs.existsSync(path.join(root, 'pyproject.toml'));
  if (hasPy) {
    frameworks.push('python');
    testFrameworks.push('pytest');
  }

  const ciPlatforms: string[] = [];
  if (fs.existsSync(path.join(root, '.github', 'workflows'))) ciPlatforms.push('github-actions');
  if (fs.existsSync(path.join(root, '.gitlab-ci.yml'))) ciPlatforms.push('gitlab-ci');

  const languages: ('typescript' | 'javascript' | 'python' | 'java' | 'go')[] = ['typescript', 'javascript'];
  if (hasPy) languages.push('python');

  return {
    rootPath: root,
    projectName: pkg.name || path.basename(root),
    projectType: frameworks.includes('react') && frameworks.includes('express/node') ? 'fullstack' : 'web',
    languages,
    frameworks,
    testFrameworks,
    testFilesFound: ['tests/sample.spec.ts'],
    hasPlaywright: testFrameworks.includes('playwright'),
    hasVitestOrJest: testFrameworks.includes('vitest') || testFrameworks.includes('jest'),
    hasPytest: testFrameworks.includes('pytest'),
    hasDocker: fs.existsSync(path.join(root, 'Dockerfile')),
    ciPlatforms
  };
}
