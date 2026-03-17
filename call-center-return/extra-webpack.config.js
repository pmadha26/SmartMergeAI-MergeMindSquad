const singleSpaAngularWebpack = require('single-spa-angular/lib/webpack').default;
const SystemJSPublicPathWebpackPlugin = require('systemjs-webpack-interop/SystemJSPublicPathWebpackPlugin');
const { mergeRouteAppTranslations } = require('@buc/cli');

module.exports = (config, options, targetOptions) => {
  const singleSpaWebpackConfig = singleSpaAngularWebpack(config, options);

  const mergeTranslationsPlugin = mergeRouteAppTranslations({...options, targetOptions}, 'assets', __dirname);
  if (mergeTranslationsPlugin) {
    singleSpaWebpackConfig.plugins.push(mergeTranslationsPlugin);
  }

  singleSpaWebpackConfig.externals.push(
    // '@angular/common',
    // '@angular/core',
    // '@angular/platform-browser',
    // '@angular/router',
    'ngx-cookie',
    'moment',
    'rxjs',
    'rxjs/operators',
    'single-spa',
    'tslib'
  );

  // Feel free to modify this webpack config however you'd like to
  return singleSpaWebpackConfig;
};
