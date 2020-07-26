#!/usr/bin/env node

require = require('esm')(module /*, options */);
require('../cli.ts').cli(process.argv);
