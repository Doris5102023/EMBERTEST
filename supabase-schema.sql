-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  participant_id uuid not null,
  question_id text not null check (question_id ~ '^q[0-9]+$'),
  selected_slot_1 text not null check (selected_slot_1 ~ '^s[1-7]$'),
  selected_slot_2 text not null check (selected_slot_2 ~ '^s[1-7]$'),
  shown_order jsonb not null,
  elapsed_seconds integer not null check (elapsed_seconds >= 0 and elapsed_seconds <= 86400),
  client_saved_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  constraint different_slots check (selected_slot_1 <> selected_slot_2),
  constraint one_vote_per_question_per_user unique (user_id, question_id)
);

alter table public.votes enable row level security;
revoke all on table public.votes from anon;
grant insert on table public.votes to authenticated;

-- Anonymous Supabase sessions use the authenticated role.
create policy "voters submit only under their own identity"
on public.votes for insert to authenticated
with check (auth.uid() = user_id);

-- No SELECT/UPDATE/DELETE policy: public clients cannot view or alter votes.
