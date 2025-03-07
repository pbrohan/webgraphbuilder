import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import build_vars from './buildConfig.js';
import sass from 'rollup-plugin-sass';

export default {
  input: 'src/index.js', // Entry point of your application
  output: {
    file: 'output/bundle.js', // Output bundle
    format: 'es', // Self-executing function, suitable for browsers
    sourcemap: true,
  },
  plugins: [
    resolve(), // Resolves node_modules imports
    commonjs(), // Converts CommonJS modules to ES6
    terser(), // Minifies the output
    nodePolyfills(),
    replace({
      preventAssignment: true,
      '__urlPrefix__' : `${build_vars.urlprefix}`
    }),
    sass({
      output: 'src/stylesheets/main.css',
      options: {
        data: `$base-url : "${build_vars.urlprefix}";`
      },
    })
  ],
};