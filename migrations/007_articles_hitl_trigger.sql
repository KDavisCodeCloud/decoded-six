-- Migration 007: HITL notification trigger
-- Fires n8n webhook when a new pending_review article is inserted.
-- Uses pg_net (built into Supabase) — no UI webhook config needed.

create or replace function public.notify_hitl_on_article_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_review' then
    perform net.http_post(
      url     := 'PASTE_N8N_WEBHOOK_URL_HERE',
      body    := json_build_object(
        'type',   'INSERT',
        'table',  'articles',
        'record', row_to_json(new)
      )::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists articles_hitl_notify on public.articles;

create trigger articles_hitl_notify
  after insert on public.articles
  for each row
  execute function public.notify_hitl_on_article_insert();
