import { Options, defineConfig } from 'tsup';

const env = process.env.NODE_ENV;

const defaultOpts: Options = {
  sourcemap: true,
  clean: env === 'prod',
  dts: true,
  format: ['cjs'],
  minify: env === 'prod',
  skipNodeModulesBundle: true,
  entryPoints: ['src/main.ts'],
  target: 'es2020',
  outDir: 'dist',
  outExtension({}) {
    return {
      js: `.bundle.js`,
    }
  },
};

export default defineConfig((options) => {
  return {
    ...defaultOpts,
    ...options
  };
});
