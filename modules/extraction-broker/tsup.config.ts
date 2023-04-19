import { Options, defineConfig } from 'tsup';

const env = process.env.NODE_ENV;

const isProd = env === 'prod';

const defaultOpts: Options = {
  sourcemap: !isProd,
  clean: true,
  dts: false,
  format: ['cjs'],
  minify: isProd,
  skipNodeModulesBundle: true,
  treeshake: false,
  entryPoints: ['src/main.ts'],
  target: 'esnext',
  outDir: 'dist'
};

export default defineConfig((options) => {
  return {
    ...defaultOpts,
    ...options
  };
});
