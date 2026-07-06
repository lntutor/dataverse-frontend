import { dirname, join } from 'path'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('storybook-addon-mock-date')
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {}
  },
  docs: {},
  staticDirs: ['../public'],
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    // Storybook already copies staticDirs into storybook-static after the
    // build; leaving vite's own publicDir copy on makes every public/ file
    // land twice, and node 22.x's fs.cp on the CI runners intermittently
    // fails the second pass with EEXIST on the keycloakify resource tree.
    publicDir: false
  }),
  typescript: {
    reactDocgen: false
  }
}
export default config

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')))
}
