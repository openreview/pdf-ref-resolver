import { Options, defineConfig } from 'tsup';

const env = process.env.NODE_ENV;

const defaultOpts: Options = {
  sourcemap: true,
  clean: env === 'prod',
  dts: false,
  format: ['cjs', 'esm'],
  minify: env === 'prod',
  skipNodeModulesBundle: false,
  treeshake: false,
  noExternal: [/./],
  entryPoints: ['src/main.ts'],
  target: 'esnext',
  outDir: 'bundle'
};

export default defineConfig((options) => {
  return {
    ...defaultOpts,
    ...options
  };
});
