-- Critical RLS hardening for NonChurch projects
-- Safe to run multiple times (idempotent via policy existence checks).
-- Apply in Supabase SQL Editor for EACH affected project.

begin;

-- 1) Enable RLS on all known tables that may be exposed via anon key.
do $$
declare
  tbl text;
  tables_to_lock text[] := array[
    'articles',
    'issues',
    'authors',
    'article_seo_translations',
    'media_assets',
    'submissions',
    'donations',
    'subscribers',
    'print_subscribers'
  ];
begin
  foreach tbl in array tables_to_lock loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format('alter table public.%I enable row level security', tbl);
    end if;
  end loop;
end $$;

-- 2) Remove obviously unsafe "allow all" anon policies if they exist.
do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and roles @> array['anon']::name[]
      and (
        coalesce(qual, '') = '' or qual ilike '%true%'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
end $$;

-- 3) Public read policies (anon) for published content only.
do $$
begin
  if to_regclass('public.articles') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'articles'
        and policyname = 'anon_read_published_articles'
    ) then
      create policy anon_read_published_articles
      on public.articles
      for select
      to anon
      using (is_published = true);
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.issues') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'issues'
        and policyname = 'anon_read_published_issues'
    ) then
      create policy anon_read_published_issues
      on public.issues
      for select
      to anon
      using (is_published = true);
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.authors') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'authors'
        and policyname = 'anon_read_published_authors'
    ) then
      create policy anon_read_published_authors
      on public.authors
      for select
      to anon
      using (is_published = true);
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.media_assets') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'media_assets'
        and policyname = 'anon_read_media_of_published_content'
    ) then
      create policy anon_read_media_of_published_content
      on public.media_assets
      for select
      to anon
      using (
        exists (
          select 1
          from public.articles a
          where a.id = media_assets.article_id
            and a.is_published = true
        )
        or exists (
          select 1
          from public.issues i
          where i.id = media_assets.issue_id
            and i.is_published = true
        )
      );
    end if;
  end if;
end $$;

-- 4) Authenticated editor access (keeps admin UI usable).
do $$
declare
  tbl text;
  editor_tables text[] := array[
    'articles',
    'issues',
    'authors',
    'article_seo_translations',
    'media_assets',
    'submissions',
    'donations',
    'subscribers',
    'print_subscribers'
  ];
begin
  foreach tbl in array editor_tables loop
    if to_regclass(format('public.%I', tbl)) is null then
      continue;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl
        and policyname = 'auth_select_' || tbl
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        'auth_select_' || tbl, tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl
        and policyname = 'auth_insert_' || tbl
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (true)',
        'auth_insert_' || tbl, tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl
        and policyname = 'auth_update_' || tbl
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using (true) with check (true)',
        'auth_update_' || tbl, tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl
        and policyname = 'auth_delete_' || tbl
    ) then
      execute format(
        'create policy %I on public.%I for delete to authenticated using (true)',
        'auth_delete_' || tbl, tbl
      );
    end if;
  end loop;
end $$;

-- 5) Verification query (run after execute).
-- select schemaname, tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;

commit;
