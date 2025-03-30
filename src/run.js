#!/usr/bin/env node

// Load module aliases before loading the actual app
require('./register');

// Now load the actual application
require('../dist/src/index.js'); 