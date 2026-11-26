# KRYORA Admin Access Bootstrap

The `/admin` route is protected by a server-validated Supabase session and a row in `public.kryora_admin_users`. Do not add admin access through editable profile metadata or browser-only checks.

## Grant the first administrator

1. Create a normal KRYORA account and complete email verification.
2. Open the KRYORA Supabase project SQL Editor.
3. Replace the placeholder email below with the exact email used for that KRYORA account and run:

```sql
insert into public.kryora_admin_users (user_id, role)
select id, 'super_admin'
from auth.users
where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
on conflict (user_id) do update set role = 'super_admin';
```

4. The query should insert or update exactly one row. If it inserts zero rows, verify the email and confirm the account exists in Authentication → Users.
5. Sign out of KRYORA, sign back in, then visit `/admin`.

## Security notes

- Admin membership is stored in a dedicated table with Row Level Security.
- The authorization check runs in a Next.js Server Component using Supabase's cookie-backed server client.
- The service-role/secret key is not required by the browser dashboard and must never be placed in a `NEXT_PUBLIC_` variable.
- Admin reads of member profile, watchlist, and viewing-history tables are restricted by RLS to verified admin membership.
- API credentials remain in Vercel Environment Variables; the dashboard never displays or stores provider secrets.
- The current dashboard persists platform setting values and logs changes. Public-app enforcement of maintenance/registration switches and full catalogue CRUD are follow-up work.
