#!/usr/bin/env node

import { cli } from '../cli';
cli(process.argv).catch((error) => {
  // tslint:disable-next-line: no-console
  console.error(error);
  process.exit(1);
});
// require = require('esm')(module /*, options */);
// require('../cli.ts').cli(process.argv);
