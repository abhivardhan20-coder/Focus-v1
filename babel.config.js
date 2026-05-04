module.exports = function (api) {
  api.cache(true);
  return {
    presets: [[require.resolve("babel-preset-expo"), { unstable_transformImportMeta: true }]],
  };
};
