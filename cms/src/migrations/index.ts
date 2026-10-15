import * as migration_20261003_155252_initial from './20261003_155252_initial';
import * as migration_20261005_115503_site_name_default from './20261005_115503_site_name_default';
import * as migration_20261010_120000_users_roles from './20261010_120000_users_roles';
import * as migration_20261011_092820_payload_3_90_schema from './20261011_092820_payload_3_90_schema';
import * as migration_20261011_110259_drop_unused_media_size_columns from './20261011_110259_drop_unused_media_size_columns';
import * as migration_20261015_215000 from './20261015_215000';

export const migrations = [
  {
    up: migration_20261003_155252_initial.up,
    down: migration_20261003_155252_initial.down,
    name: '20261003_155252_initial',
  },
  {
    up: migration_20261005_115503_site_name_default.up,
    down: migration_20261005_115503_site_name_default.down,
    name: '20261005_115503_site_name_default',
  },
  {
    up: migration_20261010_120000_users_roles.up,
    down: migration_20261010_120000_users_roles.down,
    name: '20261010_120000_users_roles',
  },
  {
    up: migration_20261011_092820_payload_3_90_schema.up,
    down: migration_20261011_092820_payload_3_90_schema.down,
    name: '20261011_092820_payload_3_90_schema',
  },
  {
    up: migration_20261011_110259_drop_unused_media_size_columns.up,
    down: migration_20261011_110259_drop_unused_media_size_columns.down,
    name: '20261011_110259_drop_unused_media_size_columns',
  },
  {
    up: migration_20261015_215000.up,
    down: migration_20261015_215000.down,
    name: '20261015_215000'
  },
];
