import * as migration_20260927_123104_initial_blog from './20260927_123104_initial_blog';
import * as migration_20260927_131835_add_profile_avatar from './20260927_131835_add_profile_avatar';
import * as migration_20260927_132459_add_comment_replies from './20260927_132459_add_comment_replies';
import * as migration_20260927_145628_add_markdown_body from './20260927_145628_add_markdown_body';
import * as migration_20260927_154817_list_settings from './20260927_154817_list_settings';
import * as migration_20260927_161519_rename_design_to_thought from './20260927_161519_rename_design_to_thought';

export const migrations = [
  {
    up: migration_20260927_123104_initial_blog.up,
    down: migration_20260927_123104_initial_blog.down,
    name: '20260927_123104_initial_blog',
  },
  {
    up: migration_20260927_131835_add_profile_avatar.up,
    down: migration_20260927_131835_add_profile_avatar.down,
    name: '20260927_131835_add_profile_avatar',
  },
  {
    up: migration_20260927_132459_add_comment_replies.up,
    down: migration_20260927_132459_add_comment_replies.down,
    name: '20260927_132459_add_comment_replies',
  },
  {
    up: migration_20260927_145628_add_markdown_body.up,
    down: migration_20260927_145628_add_markdown_body.down,
    name: '20260927_145628_add_markdown_body',
  },
  {
    up: migration_20260927_154817_list_settings.up,
    down: migration_20260927_154817_list_settings.down,
    name: '20260927_154817_list_settings',
  },
  {
    up: migration_20260927_161519_rename_design_to_thought.up,
    down: migration_20260927_161519_rename_design_to_thought.down,
    name: '20260927_161519_rename_design_to_thought'
  },
];
