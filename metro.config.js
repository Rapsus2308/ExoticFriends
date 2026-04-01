const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const appRoot = path.resolve(__dirname, "client/app");
process.env.EXPO_ROUTER_APP_ROOT = appRoot;

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, "client")];

module.exports = config;
