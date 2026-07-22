-- Reproducible schema for the thesis flipbook reader.
alter table public.pong_writings
  add column if not exists pdf_r2_key text,
  add column if not exists pages_r2_key text,
  add column if not exists outline jsonb not null default '[]'::jsonb,
  add column if not exists total_pages integer;

comment on column public.pong_writings.pdf_r2_key is 'Private R2 object key for the original thesis PDF';
comment on column public.pong_writings.pages_r2_key is 'Private R2 object key for gzipped OCR page JSONL';
comment on column public.pong_writings.outline is 'Structured thesis outline [{level,text,page}]';
comment on column public.pong_writings.total_pages is 'Total number of OCR pages';
