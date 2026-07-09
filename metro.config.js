const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @microsoft/signalr: prefer CJS entry for Metro resolver stability
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@microsoft/signalr') {
    return {
      filePath: require.resolve('@microsoft/signalr/dist/cjs/index.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
