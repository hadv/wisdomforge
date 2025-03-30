const moduleAlias = require('module-alias');
const path = require('path');

// Set up module aliases for the compiled dist structure
moduleAlias.addAliases({
  '@': path.join(__dirname, 'src'),
  '@core': path.join(__dirname, 'src/core'),
  '@utils': path.join(__dirname, 'src/utils'),
  '@configs': path.join(__dirname, 'src/configs'),
  '@types': path.join(__dirname, 'src/types')
});

// Export the module alias
module.exports = moduleAlias; 