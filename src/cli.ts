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

  if (options.dev) {
    process.env.DEV = 'true';
    if (options.plugin) {
      if (options.backend) {
        await prepareBackend(config, true);
        await spawn('bcms-backend', [], { stdio: 'inherit' });
      } else if (options.ui) {
        await prepareUI(config, true);
        await spawn('bcms-ui', ['--dev'], {
          cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
          stdio: 'inherit',
        });
      }
    } else if (options.backend) {
      await prepareBackend(config);
      await spawn('bcms-backend', [], { stdio: 'inherit' });
    } else if (options.ui) {
      await prepareUI(config);
      await spawn('bcms-ui', ['--dev'], {
        cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
        stdio: 'inherit',
      });
    } else {
      await prepareBackend(config);
      await prepareUI(config);
      spawn('bcms-backend', undefined, { stdio: 'inherit' }).catch((error) => {
        console.error('Backend', error);
      });
      spawn('bcms-ui', ['--dev'], {
        cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
        stdio: 'inherit',
      }).catch((error) => {
        console.error('UI', error);
      });
    }
  } else {
    await prepareBackend(config);
    await prepareUI(config);
    await spawn('bcms-ui', ['--build'], {
      cwd: path.join(process.cwd(), 'node_modules', '@becomes', 'cms-ui'),
      stdio: 'inherit',
    });
    await spawn('bcms-backend', undefined, { stdio: 'inherit' });
  }
}

function setEnv(config: Config) {
  process.env.JWT_ISSUER = config.backend.security.jwt.issuer;
  process.env.JWT_SECRET = config.backend.security.jwt.secret;
  process.env.JWT_EXP_AFTER = config.backend.security.jwt.expireIn
    ? '' + config.backend.security.jwt.expireIn
    : '1200000';
  process.env.API_PORT = '' + config.backend.port;
  if (config.backend.database.fs) {
    process.env.DB_USE_FS = 'true';
    process.env.DB_PRFX = config.backend.database.fs;
  } else if (config.backend.database.mongodb) {
    if (config.backend.database.mongodb.atlas) {
      process.env.DB_NAME = config.backend.database.mongodb.atlas.name;
      process.env.DB_USER = config.backend.database.mongodb.atlas.user;
      process.env.DB_PASS = config.backend.database.mongodb.atlas.password;
      process.env.DB_PRFX = config.backend.database.mongodb.atlas.prefix;
      process.env.DB_CLUSTER = config.backend.database.mongodb.atlas.cluster;
    } else if (config.backend.database.mongodb.selfHosted) {
      process.env.DB_HOST = config.backend.database.mongodb.selfHosted.host;
      process.env.DB_PORT =
        '' + config.backend.database.mongodb.selfHosted.port;
      process.env.DB_NAME = config.backend.database.mongodb.selfHosted.name;
      process.env.DB_USER = config.backend.database.mongodb.selfHosted.user;
      process.env.DB_PASS = config.backend.database.mongodb.selfHosted.password;
      process.env.DB_PRFX = config.backend.database.mongodb.selfHosted.prefix;
    }
  }
}

async function prepareBackend(config: Config, inPlugin?: boolean) {
  if (
    inPlugin ||
    (await util.promisify(fs.exists)(path.join(process.cwd(), 'plugins')))
  ) {
    await spawn('npm', ['run', 'plugin:build'], {
      stdio: 'inherit',
    });
  }
  const pluginsFile = (
    await util.promisify(fs.readFile)(
      path.join(
        process.cwd(),
        'node_modules',
        '@becomes',
        'cms-backend',
        'plugins',
        'manager.js',
      ),
    )
  ).toString();
  let plugins: Array<{
    controller?: {
      path: string;
      name: string;
    };
    middleware?: {
      path: string;
      name: string;
    };
  }>;
  if (inPlugin) {
    const cntlr = (await util.promisify(fs.exists)(
      path.join(process.cwd(), 'dist', 'backend', 'controller.js'),
    ))
      ? true
      : false;
    const mdlwr = (await util.promisify(fs.exists)(
      path.join(process.cwd(), 'dist', 'backend', 'middleware.js'),
    ))
      ? true
      : false;
    plugins = [
      {
        controller: cntlr
          ? {
              path: path.join(
                process.cwd(),
                'dist',
                'backend',
                'controller.js',
              ),
              name: 'my_awesome_plugin_controller',
            }
          : undefined,
        middleware: mdlwr
          ? {
              path: path.join(
                process.cwd(),
                'dist',
                'backend',
                'middleware.js',
              ),
              name: 'my_awesome_plugin_middleware',
            }
          : undefined,
      },
    ];
  } else {
    plugins = [];
    for (const i in config.plugins) {
      const plugin = config.plugins[i];
      if (plugin.backend) {
        let controllerPath: string;
        if (
          await util.promisify(fs.exists)(
            path.join(
              process.cwd(),
              'plugins',
              plugin.name,
              'backend',
              'controller.js',
            ),
          )
        ) {
          controllerPath = path.join(
            process.cwd(),
            'plugins',
            plugin.name,
            'backend',
            'controller.js',
          );
        } else {
          controllerPath = path.join(
            process.cwd(),
            'node_modules',
            plugin.name,
            'backend',
            'controller.js',
          );
        }
        let middlewarePath: string;
        if (
          await util.promisify(fs.exists)(
            path.join(
              process.cwd(),
              'plugins',
              plugin.name,
              'backend',
              'middleware.js',
            ),
          )
        ) {
          middlewarePath = path.join(
            process.cwd(),
            'plugins',
            plugin.name,
            'backend',
            'middleware.js',
          );
        } else {
          middlewarePath = path.join(
            process.cwd(),
            'node_modules',
            plugin.name,
            'backend',
            'middleware.js',
          );
        }
        plugins.push({
          controller:
            controllerPath && plugin.backend.controller
              ? {
                  path: controllerPath,
                  name:
                    plugin.name
                      .toLowerCase()
                      .replace(/ /g, '_')
                      .replace(/-/g, '_')
                      .replace(/[^0-9a-z_-_]+/g, '') + '_controller',
                }
              : undefined,
          middleware:
            middlewarePath && plugin.backend.middleware
              ? {
                  path: middlewarePath,
                  name:
                    plugin.name
                      .toLowerCase()
                      .replace(/ /g, '_')
                      .replace(/-/g, '_')
                      .replace(/[^0-9a-z_-_]+/g, '') + '_middleware',
                }
              : undefined,
        });
      }
    }
  }
  const assets: Array<{
    import: string;
    controller?: string;
    middleware?: string;
  }> = [
    ...plugins
      .filter((e) => (e.controller ? true : false))
      .map((plugin) => {
        return {
          import: `var ${plugin.controller.name} = require("${plugin.controller.path}")`,
          controller: plugin.controller.name,
        };
      }),
    ...plugins
      .filter((e) => (e.middleware ? true : false))
      .map((plugin) => {
        return {
          import: `var ${plugin.middleware.name} = require("${plugin.middleware.path}");`,
          middleware: plugin.middleware.name,
        };
      }),
  ];
  const importsContentToReplace =
    '/*%IMPORTS_START%*/' +
    General.string.getTextBetween(
      pluginsFile,
      '/*%IMPORTS_START%*/',
      '/*%IMPORTS_END%*/',
    ) +
    '/*%IMPORTS_END%*/';
  const assetsContentToReplace =
    '/*%ASSETS_START%*/' +
    General.string.getTextBetween(
      pluginsFile,
      '/*%ASSETS_START%*/',
      '/*%ASSETS_END%*/',
    ) +
    '/*%ASSETS_END%*/';
  const outputFile = pluginsFile
    .replace(
      importsContentToReplace,
      '/*%IMPORTS_START%*/\n' +
        assets
          .map((e) => {
            return e.import;
          })
          .join('\n') +
        '\n/*%IMPORTS_END%*/',
    )
    .replace(
      assetsContentToReplace,
      '/*%ASSETS_START%*/\n' +
        'exports.controllers = [' +
        assets
          .filter((e) => (e.controller ? true : false))
          .map((e) => {
            return e.controller;
          })
          .join(',') +
        '];\n' +
        'exports.middleware = [' +
        assets
          .filter((e) => (e.middleware ? true : false))
          .map((e) => {
            return e.middleware;
          })
          .join(',') +
        '];\n' +
        '/*%ASSETS_END%*/',
    );
  await util.promisify(fs.writeFile)(
    path.join(
      process.cwd(),
      'node_modules',
      '@becomes',
      'cms-backend',
      'plugins',
      'manager.js',
    ),
    outputFile,
  );
}

async function prepareUI(config: Config, inPlugin?: boolean) {
  interface SveltePlugin {
    displayName: string;
    path: string;
    icon?: string;
    component: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: any;
  }
  let plugins: Array<SveltePlugin & { originalName: string }>;
  if (inPlugin) {
    const name = config.plugins[0].name
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/-/g, '_')
      .replace(/[^0-9a-z_-_]+/g, '');
    plugins = [
      {
        originalName: config.plugins[0].name,
        component: name,
        displayName: config.plugins[0].frontend.displayName,
        path: name.replace(/_/g, '-'),
        props: config.plugins[0].frontend.props,
        icon: '/assets/icons/default-plugin.svg',
      },
    ];
  } else {
    plugins = config.plugins
      .filter((plugin) => (plugin.frontend ? true : false))
      .map((plugin) => {
        const name = plugin.name
          .toLowerCase()
          .replace(/ /g, '_')
          .replace(/-/g, '_')
          .replace(/[^0-9a-z_-_]+/g, '');
        return {
          originalName: plugin.name,
          component: plugin.name
            .toLowerCase()
            .replace(/ /g, '_')
            .replace(/-/g, '_')
            .replace(/[^0-9a-z_-_]+/g, '')
            .split('_')
            .map((e) => {
              return e.substring(0, 1).toUpperCase() + e.substring(1);
            })
            .join(''),
          displayName: plugin.frontend.displayName,
          path: name.replace(/_/g, '-'),
          props: plugin.frontend.props,
          icon: plugin.frontend.icon
            ? plugin.frontend.icon
            : '/assets/icons/default-plugin.svg',
        };
      });
  }
  const mainFilePath = path.join(
    process.cwd(),
    'node_modules',
    '@becomes',
    'cms-ui',
    'src',
    'app.svelte',
  );
  const mainFile = (await util.promisify(fs.readFile)(mainFilePath)).toString();
  const startPluginsFlag = '/*%PLUGINS_START%*/';
  const endPluginsFlag = '/*%PLUGINS_END%*/';
  const startRouterPluginsFlag = '/*%ROUTER_PLUGINS_START%*/';
  const endRouterPluginsFlag = '/*%ROUTER_PLUGINS_END%*/';

  const startPluginsIndex = mainFile.indexOf(startPluginsFlag);
  const endPluginsIndex =
    mainFile.indexOf(endPluginsFlag) + endPluginsFlag.length;

  const startRouterPluginsIndex = mainFile.indexOf(startRouterPluginsFlag);
  const endRouterPluginsIndex =
    mainFile.indexOf(endRouterPluginsFlag) + endRouterPluginsFlag.length;

  const importPaths: string[] = [];
  const pluginElements: string[] = [];
  const routerElements: string[] = [];
  for (const i in plugins) {
    const plugin = plugins[i];
    // Import paths
    {
      let pathToPlugin: string;
      if (inPlugin) {
        pathToPlugin = path.join(
          process.cwd(),
          'plugin',
          'frontend',
          'main.svelte',
        );
      } else {
        if (
          await util.promisify(fs.exists)(
            path.join(
              process.cwd(),
              'node_modules',
              plugin.originalName,
              'frontend',
              'main.svelte',
            ),
          )
        ) {
          pathToPlugin = path.join(
            process.cwd(),
            'node_modules',
            plugin.originalName,
            'frontend',
            'main.svelte',
          );
        } else {
          pathToPlugin = path.join(
            process.cwd(),
            'plugins',
            plugin.originalName,
            'frontend',
            'main.svelte',
          );
        }
      }
      importPaths.push(`import ${plugin.component} from '${pathToPlugin}';`);
    }
    // Plugin elements
    {
      pluginElements.push(`
        {
          originalName: '${plugin.originalName}',
          component: ${plugin.component},
          displayName: '${plugin.displayName}',
          path: '${plugin.path}',
          icon: '${plugin.icon}',
        }
      `);
    }
    // Router elements
    {
      routerElements.push(`{
        path: '/dashboard/plugins/${plugin.path}',
        component: ${plugin.component},
        props: ${plugin.props ? JSON.stringify(plugin.props) : 'undefined'}
      }`);
    }
  }
  const outputMain =
    mainFile.substring(0, startPluginsIndex) +
    `${startPluginsFlag}\n` +
    importPaths.join('\n') +
    `\nconst plugins = [${pluginElements.join('\n')}];\n` +
    `${endPluginsFlag}` +
    mainFile.substring(endPluginsIndex, startRouterPluginsIndex) +
    `${startRouterPluginsFlag}\n` +
    routerElements.join(',') +
    `,\n${endRouterPluginsFlag}\n` +
    mainFile.substring(endRouterPluginsIndex);
  await util.promisify(fs.writeFile)(mainFilePath, outputMain);
}
