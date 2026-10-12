# Kamaru Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL in `migrations/001_initial.sql` (and later migrations) in the SQL editor.
3. Create Storage buckets `brand-assets` (public) and `payment-proofs` (private) if the migration insert fails.
4. Copy project URL and anon key into `.env`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_SITE_URL=https://your-production-domain.com
```

`VITE_SITE_URL` is the public storefront origin used in signup and password-reset email links. Leave it empty in local dev to use `http://localhost:43917` (or whatever port you use).

5. **Authentication → URL configuration**

   - **Site URL:** your live origin, e.g. `https://kamaru.com.ph` (must match production; wrong values send users to localhost).
   - **Redirect URLs** (add every origin you use):
     - `{VITE_SITE_URL}/auth/confirm`
     - `{VITE_SITE_URL}/reset-password`
     - For local testing: `http://localhost:43917/auth/confirm` and `http://localhost:43917/reset-password`

6. **Authentication → SMTP** (custom sender — not configurable from app code)

   - Enable custom SMTP. [Resend](https://resend.com) works well: verify your sending domain, then use host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key.
   - **Sender name / email:** e.g. `Kamaru Philippines <hello@your-domain.com>`.

7. **Authentication → Email templates**

   Paste HTML from this repo (subjects are suggestions only):

   | Template        | Subject                         | Body file                              |
   |-----------------|---------------------------------|----------------------------------------|
   | Confirm signup  | Confirm your Kamaru account     | `email-templates/confirm-signup.html`  |
   | Reset password  | Reset your Kamaru password      | `email-templates/reset-password.html`  |

   Keep the `{{ .ConfirmationURL }}` link placeholders exactly as Supabase expects.

8. Seed catalog rows from the current CMS export or run the app locally with JSON until migration scripts are added.
9. Promote staff users by setting `profiles.role` to `admin`, `content`, or `orders`.

**Server-only** (never expose in the browser): `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API Keys → `service_role`.

Without Supabase env vars, the app uses the local CMS JSON API and `cms/data/commerce.json` for accounts and bulk orders.
