import { Options, defineConfig } from 'tsup';

const env = process.env.NODE_ENV;

const defaultOpts: Options = {
  sourcemap: true,
  clean: env === 'prod',
  dts: false,
  format: ['cjs'],
  minify: env === 'prod',
  skipNodeModulesBundle: env !== 'prod',
  entryPoints: ['src/main.ts'],
  target: 'es2020',
  outDir: 'bundle'
};

export default defineConfig((options) => {
  return {
    ...defaultOpts,
    ...options
  };
});
