#!/usr/bin/env node

import { cli } from '../cli';
cli(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});
