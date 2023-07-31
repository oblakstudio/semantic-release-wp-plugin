import * as path from 'path';
import * as os from 'node:os';
import fs from 'fs-extra';
import { prepare } from '../lib/prepare.js';
import * as contexts from './get-context.js';

function getWorkDir(suffix: string): string {
  const files = fs.readdirSync(os.tmpdir());

  return path.join(
    os.tmpdir(),
    files.find((f) => f === `workDir-${suffix}`) ?? '',
  );
}

describe('Package preparation', () => {
  let releasePath: string;
  let workDir: string;

  beforeEach(() => {
    releasePath = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-release-'));
    workDir = (Math.random() + 1).toString(36).substring(7);
  });

  afterEach(() => {
    fs.rmSync(releasePath, { recursive: true, force: true });
    fs.rmSync(getWorkDir(workDir), { recursive: true, force: true });
  });

  it('Should change the plugin version', async () => {
    await prepare(
      {
        type: 'plugin',
        slug: 'plugin1',
        path: './test/fixtures/plugin1',
        copyFiles: true,
        releasePath,
        workDir,
      },
      contexts.prepareContext,
    );
  });

  it('Should fail on invalid plugin version', async () => {
    try {
      await prepare(
        {
          type: 'plugin',
          slug: 'bad-version',
          path: './test/fixtures/bad-version',
          copyFiles: true,
          releasePath,
          workDir,
        },
        contexts.prepareContext,
      );
    } catch (err) {
      expect(err).toBeInstanceOf(AggregateError);
    }
  });

  it('Should change only the 0.0.0 version', async () => {
    await prepare(
      {
        type: 'plugin',
        slug: 'plugin1',
        path: './test/fixtures/plugin1',
        copyFiles: true,
        versionFiles: ['extra-versions.php'],
        releasePath,
        workDir,
      },
      contexts.prepareContext,
    );

    const versions = fs.readFileSync(
      path.join(getWorkDir(workDir), 'plugin1/extra-versions.php'),
      'utf8',
    );

    expect(versions).toMatch(/1\.0\.0/);
    expect(versions).toMatch(/2\.2\.2/);
  });

  it('Should change the readme.txt version', async () => {
    await prepare(
      {
        type: 'plugin',
        slug: 'plugin-with-readme',
        path: './test/fixtures/plugin-with-readme',
        copyFiles: true,
        withReadme: true,
        releasePath,
        workDir,
      },
      contexts.prepareContext,
    );

    const readme = fs.readFileSync(
      path.join(
        getWorkDir(workDir),
        'plugin-with-readme/.wordpress-org/readme.txt',
      ),
      'utf8',
    );

    expect(readme).toMatch(/Stable tag: 1\.0\.0/);
  });

  it('Should work with empty assets', async () => {
    await prepare(
      {
        type: 'plugin',
        slug: 'plugin-with-readme',
        path: './test/fixtures/plugin-with-readme',
        copyFiles: true,
        withAssets: true,
        withReadme: true,
        releasePath,
        workDir,
      },
      contexts.prepareContext,
    );
  });

  it('Should respect the include/exclude files', async () => {
    await prepare(
      {
        type: 'plugin',
        slug: 'dist-test',
        path: './test/fixtures/dist-test',
        copyFiles: true,
        include: ['dist-test.php', './*.php', 'vendor'],
        exclude: [],
        withVersionFile: false,
        releasePath,
        workDir,
      },
      contexts.prepareContext,
    );

    const distFiles = fs.readdirSync(path.join(releasePath, 'dist-test'));
    const vendorFiles = fs.readdirSync(
      path.join(releasePath, 'dist-test', 'vendor'),
    );
    const versionExists = fs.existsSync(path.join(releasePath, 'VERSION'));

    expect(distFiles).toHaveLength(3);
    expect(distFiles).toStrictEqual(['dist-test.php', 'test1.php', 'vendor']);
    expect(vendorFiles).toHaveLength(1);
    expect(vendorFiles).toStrictEqual(['composer.php']);
    expect(versionExists).toBe(false);
  });

  it('Should copy the assets files', async () => {
    await prepare(
      {
        type: 'plugin',
        slug: 'dist-test',
        path: './test/fixtures/dist-test',
        copyFiles: true,
        withVersionFile: true,
        withAssets: true,
        include: ['dist-test.php', './*.php', 'vendor'],
        exclude: [],
        releasePath,
        workDir,
      },
      contexts.prepareContext,
    );

    const assets = fs.readdirSync(path.join(releasePath, 'assets'));

    expect(assets).toHaveLength(4);
    expect(assets.sort()).toStrictEqual(
      [
        'banner-low.jpg',
        'banner-high.jpg',
        'screenshot-1.jpg',
        'screenshot-2.jpg',
      ].sort(),
    );
  });
});
