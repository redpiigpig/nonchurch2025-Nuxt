-- Keep selected editorial articles out of every anonymous Supabase query.
-- Existing authenticated/editor and service-role access remains unchanged.

drop policy if exists "editor_only_articles_require_auth" on public.articles;

create policy "editor_only_articles_require_auth"
on public.articles
as restrictive
for select
to public
using (
  id <> '9-15我的循道宗史'
  or current_user in ('authenticated', 'service_role')
  or (select auth.role()) in ('authenticated', 'service_role')
);
