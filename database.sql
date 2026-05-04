-- Chạy đoạn SQL này trong SQL Editor của Supabase để tạo bảng
create table public.transactions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  amount numeric not null,
  description text not null,
  type text not null check (type in ('income', 'expense')),
  constraint transactions_pkey primary key (id)
);

-- Tắt RLS (Row Level Security) để demo đơn giản (Ai có URL và Key cũng đọc/ghi được)
-- Trong ứng dụng thực tế, bạn nên bật RLS và cấu hình User Authentication
alter table public.transactions disable row level security;
