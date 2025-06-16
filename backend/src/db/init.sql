-- Drop existing tables if they exist
drop table if exists matches cascade;
drop table if exists match_stats cascade;
drop table if exists live_updates cascade;
drop table if exists scraped_data cascade;

-- Drop existing functions if they exist
drop function if exists refresh_matches() cascade;

-- Create matches table
create table matches (
  id uuid default uuid_generate_v4() primary key,
  competition text not null,
  home_team text not null,
  away_team text not null,
  date text not null,
  home_score text,
  away_score text,
  venue text,
  referee text,
  time text,
  broadcasting text,
  scraped_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  is_fixture boolean not null default false,
  is_live boolean not null default false
);

-- Create indexes for better query performance
create index matches_is_fixture_idx on matches(is_fixture);
create index matches_is_live_idx on matches(is_live);
create index matches_date_idx on matches(date);
create index matches_competition_idx on matches(competition);

-- Create refresh_matches function
create or replace function refresh_matches()
returns void
language plpgsql
security definer
as $$
begin
  -- Add your match refresh logic here
  -- This could be a webhook or scheduled function
  -- For now, it's a placeholder
  raise notice 'refresh_matches function called';
end;
$$;

-- Add RLS (Row Level Security) policies
alter table matches enable row level security;

-- Create policy to allow anonymous read access
create policy "Allow anonymous read access"
  on matches for select
  to anon
  using (true);

-- Create policy to allow authenticated users to insert/update
create policy "Allow authenticated users to insert/update"
  on matches for all
  to authenticated
  using (true)
  with check (true); 