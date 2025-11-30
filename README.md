# IDHChristmas — Temporary Christmas webpage (with optional shared messages)

This is a small static webpage you can host (GitHub Pages, Netlify, Vercel, or any static host). It lets visitors post short messages and display animated images.

Two modes:
- Local only (default): messages and images are stored in each visitor's browser (localStorage).
- Shared (optional): configure a Supabase project and the page will read/write messages to a shared table so all visitors see the same messages.

Files:
- index.html
- styles.css
- script.js
- config.example.js (copy to config.js and add your Supabase settings to enable shared mode)

Local preview:
1. Place the files into a folder.
2. Open `index.html` in your browser, or start a local static server:
   - Python 3: `python -m http.server 8000`
   - Node (serve): `npx serve .`
   Then open http://localhost:8000

Enable shared backend (Supabase) — quick steps:
1. Create a free Supabase account: https://supabase.com
2. Create a new project.
3. In the SQL editor, run the following to create a messages table:

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  text text not null,
  ts bigint,
  created_at timestamptz default now()
);
```

4. Optional: If you want simple public reads and inserts with the anon key (NOT recommended for sensitive sites), you can leave Row Level Security (RLS) off. For a safer setup with RLS, add a policy that allows inserts/reads for anon users — example policies are shown below.
5. Go to Settings → API and copy the Project URL (e.g. https://your-project.supabase.co) and the anon public key.
6. Copy `config.example.js` to `config.js` in the repository root and paste your URL and anonKey.
7. Deploy the site (GitHub Pages, Netlify, Vcel) or open locally. The site will read and write messages to your Supabase table.

Row Level Security (RLS) example (recommended, adapt for your needs):
- Enable RLS on the messages table.
- Allow inserts by anyone (this is basic — tighten as needed):
```sql
create policy "public insert" on messages
  for insert using (true);
```
- Allow selects by anyone:
```sql
create policy "public select" on messages
  for select using (true);
```
For more robust control, require a JWT claim or other conditions; Supabase docs cover RLS in depth.

Notes:
- The client uses the Supabase REST endpoint. Configure Row Level Security (RLS) or policies if you want stricter control. By default, the anon key is public-facing.
- If you want me to prepare a serverless proxy endpoint to hide the anon key or to restrict writes, tell me which provider you prefer (Vercel or Netlify) and I’ll prepare the code.