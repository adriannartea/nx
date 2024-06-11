import {
  formatFiles,
  getProjects,
  stripIndents,
  Tree,
  joinPathFragments,
  updateProjectConfiguration,
} from '@nx/devkit';
import { forEachExecutorOptions } from '@nx/devkit/src/generators/executor-options-utils';
import { WebpackExecutorOptions } from '../../executors/webpack/schema';
import { extractWebpackOptions } from './lib/extract-webpack-options';
import { normalizePathOptions } from './lib/normalize-path-options';
import { parse } from 'path';

interface Schema {
  project?: string;
  skipFormat?: boolean;
}

// Make text JSON compatible
const preprocessText = (text: string) => {
  return text
    .replace(/(\w+):/g, '"$1":') // Quote property names
    .replace(/'/g, '"') // Convert single quotes to double quotes
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/(\r\n|\n|\r|\t)/gm, ''); // Remove newlines and tabs
};

export async function convertConfigToWebpackPluginGenerator(
  tree: Tree,
  options: Schema
) {
  let migrated = 0;

  const projects = getProjects(tree);
  forEachExecutorOptions<WebpackExecutorOptions>(
    tree,
    '@nx/webpack:webpack',
    (currentTargetOptions, projectName, targetName, configurationName) => {
      if (options.project && projectName !== options.project) {
        return;
      }
      if (!configurationName) {
        const project = projects.get(projectName);
        const target = project.targets[targetName];
        const containsMfeExecutor = Object.keys(project.targets).some(
          (target) => {
            return [
              '@nx/react:module-federation-dev-server',
              '@nx/angular:module-federation-dev-server',
            ].includes(project.targets[target].executor);
          }
        );

        if (containsMfeExecutor) {
          throw new Error(
            `The project ${projectName} is using Module Federation. At the moment, we don't support migrating projects that use Module Federation.`
          );
        }

        const webpackConfigPath = currentTargetOptions?.webpackConfig || '';

        if (webpackConfigPath && tree.exists(webpackConfigPath)) {
          let { withNxConfig: webpackOptions, withReactConfig } =
            extractWebpackOptions(tree, webpackConfigPath);

          if (webpackOptions !== undefined) {
            // withNx was not found in the webpack.config.js file so we should skip this project
            let parsedOptions = {};
            if (webpackOptions) {
              parsedOptions = JSON.parse(
                preprocessText(webpackOptions.getText())
              );
              parsedOptions = normalizePathOptions(project.root, parsedOptions);
            }

            target.options.standardWebpackConfigFunction = true;

            updateProjectConfiguration(tree, projectName, project);

            const { dir, name, ext } = parse(webpackConfigPath);

            tree.rename(
              webpackConfigPath,
              `${joinPathFragments(dir, `${name}.old${ext}`)}`
            );

            tree.write(
              webpackConfigPath,
              stripIndents`
            const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
            const { NxReactWebpackPlugin } = require('@nx/react/webpack-plugin');
            const { nxUseLegacyPlugin } = require('@nx/webpack');
            
            // This file was migrated using @nx/webpack:convert-config-to-webpack-plugin from your './webpack.config.old.js'
            // Please check that the options here are correct as they were moved from the old webpack.config.js to this file.
            const options = ${
              webpackOptions ? JSON.stringify(parsedOptions, null, 2) : '{}'
            };

            module.exports = async () => ({
              plugins: [
                ${
                  webpackOptions
                    ? 'new NxAppWebpackPlugin(options)'
                    : 'new NxAppWebpackPlugin()'
                },
                ${
                  withReactConfig
                    ? `new NxReactWebpackPlugin(${withReactConfig.getText()})`
                    : `new NxReactWebpackPlugin({
                  // Uncomment this line if you don't want to use SVGR
                  // See: https://react-svgr.com/
                  // svgr: false
                  })`
                },
                await nxUseLegacyPlugin(require('./webpack.config.old'), options),
              ],
              });
          `
            );
            migrated++;
          }
        }
      }
    }
  );
  if (migrated === 0) {
    throw new Error('Could not find any projects to migrate.');
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default convertConfigToWebpackPluginGenerator;
