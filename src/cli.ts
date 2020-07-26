import * as childProcess from 'child_process';
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
    // exec('npm run dev:backend', (type, chunk) => {
    //   process[type].write(chunk);
    // }).catch(error => {
    //   throw error;
    // });
    exec('npm run dev:ui', (type, chunk) => {
      process[type].write(chunk);
    }).catch(error => {
      throw error;
    });
  }
}
