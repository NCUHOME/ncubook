create extension if not exists vector;

create table if not exists information_cards (
  slug text primary key,
  title text not null,
  category text not null,
  tags text[] not null default '{}',
  audience text,
  conclusion text not null,
  steps text[] not null default '{}',
  notes text[] not null default '{}',
  source_type text,
  source_url text,
  updated_at_label text,
  trust_status text not null default '待核实',
  review_status text not null default 'draft',
  risk_level text not null default 'low',
  related_cards text[] not null default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists information_cards_review_status_idx on information_cards (review_status);
create index if not exists information_cards_tags_idx on information_cards using gin (tags);
create index if not exists information_cards_embedding_idx on information_cards using ivfflat (embedding vector_cosine_ops);

create table if not exists student_feedback (
  id uuid primary key default gen_random_uuid(),
  page_path text,
  card_slug text,
  question text,
  comment text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  result_count integer not null default 0,
  answer_state text,
  created_at timestamptz not null default now()
);
