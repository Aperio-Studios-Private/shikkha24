import * as migration_20261003_155252_initial from './20261003_155252_initial';
import * as migration_20261005_115503_site_name_default from './20261005_115503_site_name_default';

export const migrations = [
  {
    up: migration_20261003_155252_initial.up,
    down: migration_20261003_155252_initial.down,
    name: '20261003_155252_initial',
  },
  {
    up: migration_20261005_115503_site_name_default.up,
    down: migration_20261005_115503_site_name_default.down,
    name: '20261005_115503_site_name_default'
  },
];
