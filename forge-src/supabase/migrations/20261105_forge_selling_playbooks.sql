-- Selling framework: split Digital into download / community / course (digital stays = software/app)
-- and give each idea a launch playbook checklist ({step_id: true})
alter table public.forge_ideas drop constraint if exists forge_ideas_kind_check;
alter table public.forge_ideas add constraint forge_ideas_kind_check
  check (kind = any (array['unsure','download','community','course','digital','physical','service']));
alter table public.forge_ideas add column if not exists playbook jsonb not null default '{}'::jsonb;
