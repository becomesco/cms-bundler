import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { ArgParser, General } from './util';
import { Config, ConfigSchema } from './interfaces';

async function spawn(
  cmd: string,
  args?: string[],
  options?: childProcess.SpawnOptions,
): Promise<void> {
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

export async function cli(args: string[]) {
  const options = ArgParser.parse(args);
  const config: Config = await import(
    `${path.join(process.cwd(), 'bcms.config.js')}`
  );
  General.object.compareWithSchema(config, ConfigSchema, 'config');

  setEnv(config);

  if (options.backend) {
    await spawn('bcms-backend', [], { stdio: 'inherit' });
  }

  // if (options.dev) {
  //   process.env.DEV = 'true';
  //   if (options.plugin) {
  //     if (options.backend) {
  //       await prepareBackend(config, true);
  //       await spawn('bcms-backend', [], { stdio: 'inherit' });
  //     } else if (options.ui) {
  //       await prepareUI(config, true);
  //       await spawn('bcms-ui', ['--dev'], {
  //         cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
  //         stdio: 'inherit',
  //       });
  //     }
  //   } else if (options.backend) {
  //     await prepareBackend(config);
  //     await spawn('bcms-backend', [], { stdio: 'inherit' });
  //   } else if (options.ui) {
  //     await prepareUI(config);
  //     await spawn('bcms-ui', ['--dev'], {
  //       cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
  //       stdio: 'inherit',
  //     });
  //   } else {
  //     await prepareBackend(config);
  //     await prepareUI(config);
  //     spawn('bcms-backend', undefined, { stdio: 'inherit' }).catch((error) => {
  //       console.error('Backend', error);
  //     });
  //     spawn('bcms-ui', ['--dev'], {
  //       cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
  //       stdio: 'inherit',
  //     }).catch((error) => {
  //       console.error('UI', error);
  //     });
  //   }
  // } else {
  //   if (options.backend) {
  //     await prepareBackend(config);
  //     await spawn('bcms-backend', undefined, { stdio: 'inherit' });
  //   } else if (options.ui) {
  //     await prepareUI(config);
  //     await spawn('bcms-ui', ['--build'], {
  //       cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
  //       stdio: 'inherit',
  //     });
  //   } else {
  //     await prepareBackend(config);
  //     await prepareUI(config);
  //     await spawn('bcms-ui', ['--build'], {
  //       cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
  //       stdio: 'inherit',
  //     });
  //     await spawn('bcms-backend', undefined, { stdio: 'inherit' });
  //   }
  // }
}

function setEnv(config: Config) {
  process.env.JWT_ISSUER = config.security.jwt.issuer;
  process.env.JWT_SECRET = config.security.jwt.secret;
  process.env.JWT_EXP_AFTER = config.security.jwt.expireIn
    ? '' + config.security.jwt.expireIn
    : '1200000';
  process.env.API_PORT = '' + config.port;
  if (config.database.fs) {
    process.env.DB_USE_FS = 'true';
    process.env.DB_PRFX = config.database.fs;
  } else if (config.database.mongodb) {
    if (config.database.mongodb.atlas) {
      process.env.DB_NAME = config.database.mongodb.atlas.name;
      process.env.DB_USER = config.database.mongodb.atlas.user;
      process.env.DB_PASS = config.database.mongodb.atlas.password;
      process.env.DB_PRFX = config.database.mongodb.atlas.prefix;
      process.env.DB_CLUSTER = config.database.mongodb.atlas.cluster;
    } else if (config.database.mongodb.selfHosted) {
      process.env.DB_HOST = config.database.mongodb.selfHosted.host;
      process.env.DB_PORT = '' + config.database.mongodb.selfHosted.port;
      process.env.DB_NAME = config.database.mongodb.selfHosted.name;
      process.env.DB_USER = config.database.mongodb.selfHosted.user;
      process.env.DB_PASS = config.database.mongodb.selfHosted.password;
      process.env.DB_PRFX = config.database.mongodb.selfHosted.prefix;
    }
  }
  if (config.plugins.length > 0) {
    process.env.BCMS_PLUGINS = config.plugins.join(',');
  }
}
