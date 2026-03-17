/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2022, 2023
 *
 * The source code for this program is not published or otherwise divested
 * of its trade secrets, irrespective of what has been deposited with the
 * U.S. Copyright Office.
 */

const { merge } = require("webpack-merge");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');
const { orderHubWebpackDevServerConfig, mergeRootConfigTranslations } = require('@buc/cli');

const OUTPUT_DIRECTORY = path.resolve(__dirname, '../../dist/call-center-return');
const ASSETS_OUTPUT_DIRECTORY = path.resolve(OUTPUT_DIRECTORY, 'assets');

module.exports = (webpackConfigEnv, argv) => {
  const orderHubDevServerConfig = orderHubWebpackDevServerConfig(webpackConfigEnv, path.resolve(__dirname, '../../app-config.json'))
  return merge(orderHubDevServerConfig, {
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
      path: OUTPUT_DIRECTORY
    },
    // modify the webpack config however you'd like to by adding to this object
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
        {
          from: 'src/assets',
          to: ASSETS_OUTPUT_DIRECTORY
        },
        // BEGIN: hoist common assets like nls bundles to the root config
        {
          from: '**/*',
          to: ASSETS_OUTPUT_DIRECTORY,
          context: path.resolve(__dirname, '../return-shared/assets')
        },
        {
          from: '**/*.json',
          to: ASSETS_OUTPUT_DIRECTORY,
          context: path.resolve(__dirname, '../../node_modules/@buc/svc-angular/assets')
        },
        {
          from: '**/*.json',
          to: ASSETS_OUTPUT_DIRECTORY,
          context: path.resolve(__dirname, '../../node_modules/@buc/common-components/assets')
        }
        // END: hoisting common assets.
        ]
      }),
      ...mergeRootConfigTranslations([
        '../return-shared/assets',
        '../../node_modules/@buc/svc-angular/assets',
        '../../node_modules/@buc/common-components/assets'
      ], '../../dist/call-center-return/assets')
    ]
  });

};
