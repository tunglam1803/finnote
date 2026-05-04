import pg from 'pg';

const connectionString = 'postgresql://postgres.dzjsdjrnlggktdqzgkyu:Tl@0963815420@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

const client = new pg.Client({
  connectionString,
});

async function initDb() {
  try {
    await client.connect();
    console.log('Connected to Supabase DB');
    
    await client.query(`
      create table if not exists public.group_expenses (
        id uuid not null default gen_random_uuid (),
        created_at timestamp with time zone not null default now(),
        payer_name text not null,
        amount numeric not null,
        note text
      );
    `);
    console.log('Created group_expenses table.');

    await client.query(`
      alter table public.group_expenses disable row level security;
    `);
    console.log('Disabled RLS for easy access.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

initDb();
