import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/table.ts',
    'src/sheet.ts',
    'src/calendar.ts',
    'src/ui.ts',
    'src/core.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // keep every @softium/* package external so consumers dedupe them with any
  // direct installs, and so this stays a thin re-export layer
  external: [
    'react',
    'react-dom',
    'lucide-react',
    '@softium/table-core',
    '@softium/table-react',
    '@softium/sheet',
    '@softium/calendar',
    '@softium/ui',
  ],
});
