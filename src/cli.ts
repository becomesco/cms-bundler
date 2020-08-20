import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { ArgParser } from './util';

const exec = async (
  cmd: string,
  output: (type: 'stderr' | 'stdout', chunk: string) => void,
) => {
  return new Promise((resolve, reject) => {
    const proc = childProcess.exec(cmd);
    if (output) {
      proc.stdout.on('data', (data) => {
        output('stdout', data);
      });
      proc.stderr.on('data', (data) => {
        output('stderr', data);
      });
    }
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(code);
      } else {
        resolve();
      }
    });
  });
};

export async function cli(args: string[]) {
  const options = ArgParser.parse(args);
  if (options.dev) {
    if (options.backend) {
      devBackend();
    } else if (options.ui) {
      devUi();
    } else {
      devBackend();
      devUi();
    }
  }
}

async function devBackend() {
  exec('bcms-backend', (type, chunk) => {
    process[type].write(chunk);
  }).catch((error) => {
    throw error;
  });
}

async function devUi() {
  let router = (
    await util.promisify(fs.readFile)(
      path.join(
        __dirname,
        '..',
        'node_modules',
        '@becomes',
        'cms-ui',
        'src',
        'router',
        'index.js',
      ),
    )
  ).toString();
  let mainJS = (
    await util.promisify(fs.readFile)(
      path.join(
        __dirname,
        '..',
        'node_modules',
        '@becomes',
        'cms-ui',
        'src',
        'main.js',
      ),
    )
  ).toString();
  if (await util.promisify(fs.exists)(path.join(process.cwd(), 'ui'))) {
    mainJS = `import bundlerRouter from './router/index.temp.js';\n` + mainJS;
    router =
      `import CustomPortal from '${path.join(
        process.cwd(),
        'ui',
        'App.vue',
      )}';\n` +
      router.replace(
        '// %CustomPortal%',
        `
        {
          path: "/custom-portal",
          name: "CustomPortal",
          component: CustomPortal,
          props: {
            msg: 'This is test!',
          },
        },
        `,
      );
    await util.promisify(fs.writeFile)(
      path.join(
        __dirname,
        '..',
        'node_modules',
        '@becomes',
        'cms-ui',
        'src',
        'router',
        'index.temp.js',
      ),
      router,
    );
  }
  await util.promisify(fs.writeFile)(
    path.join(
      __dirname,
      '..',
      'node_modules',
      '@becomes',
      'cms-ui',
      'src',
      'main.temp.js',
    ),
    mainJS,
  );

  process.chdir(
    path.join(__dirname, '..', 'node_modules', '@becomes', 'cms-ui'),
  );
  exec('bcms-ui serve src/main.temp.js', (type, chunk) => {
    process[type].write(chunk);
  }).catch((error) => {
    throw error;
  });
}
