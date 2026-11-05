-- Add Collin as a third Forge member
alter table public.forge_members drop constraint forge_members_person_check;
alter table public.forge_members add constraint forge_members_person_check check (person = any (array['Josh','Jake','Collin','Claude','Tester']));

create or replace function public.forge_goals() returns table(person text, goal numeric)
language sql stable security definer set search_path to 'public' as $function$
  select m.person, coalesce((m.settings->>'hours_goal')::numeric, 5) from forge_members m
  where m.person in ('Josh','Jake','Collin') and forge_person() is not null
$function$;

create or replace function public.forge_members_joined_push() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  if old.user_id is null and new.user_id is not null and new.person in ('Josh','Jake','Collin') then
    perform public.forge_push_event('joined', jsonb_build_object('by', new.person));
  end if;
  return new;
end $function$;

-- Invite: Collin can create his account with this email
insert into public.forge_members (person, email) values ('Collin', lower('Collinberrett1@gmail.com'));
