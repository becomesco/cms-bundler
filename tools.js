const childProcess = require('child_process');
const fse = require('fs-extra');
const fs = require('fs');
const util = require('util');
const path = require('path');

const exec = async (cmd, output) => {
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
async function spawn(cmd, args, options) {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(cmd, args, options);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(code);
      } else {
        resolve();
      }
    });
  });
}
/**
 * @param {Array<{
 *  title: string;
 *  task: () => Promise<void>;
 * }>} tasks
 */
const Tasks = (tasks) => {
  return {
    run: async () => {
      for (let i = 0; i < tasks.length; i = i + 1) {
        const t = tasks[i];
        console.log(`${i + 1}. ${t.title}`);
        try {
          await t.task();
          console.log(`✓`);
        } catch (error) {
          console.log(`⨉`);
          throw error;
        }
      }
    },
  };
};
const parseArgs = (rawArgs) => {
  const args = {};
  let i = 2;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    let value = '';
    if (rawArgs[i + 1]) {
      value = rawArgs[i + 1].startsWith('--') ? '' : rawArgs[i + 1];
    }
    args[arg] = value;
    if (value === '') {
      i = i + 1;
    } else {
      i = i + 2;
    }
  }
  return {
    bundle: args['--bundle'] === '' || args['--bundle'] === 'true' || false,
    link: args['--link'] === '' || args['--link'] === 'true' || false,
    unlink: args['--unlink'] === '' || args['--unlink'] === 'true' || false,
    publish: args['--publish'] === '' || args['--publish'] === 'true' || false,
  };
};
const bundle = async () => {
  const tasks = Tasks([
    {
      title: 'Remove dist directory.',
      task: async () => {
        await fse.remove(path.join(__dirname, 'dist'));
      },
    },
    {
      title: 'Compile Typescript.',
      task: async () => {
        await exec('npm run build:ts');
      },
    },
    {
      title: 'Copy package.json.',
      task: async () => {
        const data = JSON.parse(
          (
            await util.promisify(fs.readFile)(
              path.join(__dirname, 'package.json'),
            )
          ).toString(),
        );
        data.devDependencies = undefined;
        data.nodemonConfig = undefined;
        data.scripts = undefined;
        await util.promisify(fs.writeFile)(
          path.join(__dirname, 'dist', 'package.json'),
          JSON.stringify(data, null, '  '),
        );
      },
    },
    {
      title: 'Copy LICENSE',
      task: async () => {
        await util.promisify(fs.copyFile)(
          path.join(__dirname, 'LICENSE'),
          path.join(__dirname, 'dist', 'LICENSE'),
        );
      },
    },
  ]);
  await tasks.run();
};
const link = async () => {
  await exec('cd dist && npm i && sudo npm link');
};
const unlink = async () => {
  await exec('cd dist && sudo npm unlink');
};
const publish = async () => {
  if (
    await util.promisify(fse.exists)(
      path.join(__dirname, 'dist', 'node_modules'),
    )
  ) {
    throw new Error(
      `Please remove "${path.join(__dirname, 'dist', 'node_modules')}"`,
    );
  }
  await spawn('npm', ['publish', '--access=public'], {
    cwd: path.join(process.cwd(), 'dist'),
    stdio: 'inherit',
  });
};

async function main() {
  const options = parseArgs(process.argv);
  if (options.bundle === true) {
    await bundle();
  } else if (options.link === true) {
    await link();
  } else if (options.unlink === true) {
    await unlink();
  } else if (options.publish === true) {
    await publish();
  }
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
