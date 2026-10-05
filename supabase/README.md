# Kamaru Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL in `migrations/001_initial.sql` in the SQL editor.
3. Create Storage buckets `brand-assets` (public) and `payment-proofs` (private) if the migration insert fails.
4. Copy project URL and anon key into `.env`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

5. Seed catalog rows from the current CMS export or run the app locally with JSON until migration scripts are added.
6. Promote staff users by setting `profiles.role` to `admin`, `content`, or `orders`.

Without Supabase env vars, the app uses the local CMS JSON API and `cms/data/commerce.json` for accounts and bulk orders.
