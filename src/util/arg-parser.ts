import * as arg from 'arg';
import { Options } from '../interfaces/options';

export class ArgParser {
  public static parse(rawArgs: string[]): Options {
    const args = arg(
      {
        '--dev': Boolean,
        '--ui': Boolean,
        '--backend': Boolean,
        '--plugin': Boolean,
      },
      {
        argv: rawArgs.slice(2),
      },
    );
    const options: Options = {
      dev: args['--dev'] || false,
      ui: args['--ui'] || false,
      backend: args['--backend'] || false,
      plugin: args['--plugin'] || false,
    };
    return options;
  }
}
