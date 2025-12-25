# Database Trigger Setup for User Profiles

## Problem
Row Level Security (RLS) policies prevent the application from creating user profiles in the `users` table, causing errors during onboarding.

## Solution
A database trigger automatically creates user profiles when users sign up in Supabase Auth, bypassing RLS restrictions.

## Setup Instructions

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Trigger SQL**
   - Open the file `database/create_user_profile_trigger.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** to execute

3. **Sync Existing Users (Optional)**
   - If you have existing users in `auth.users` without profiles in `users` table:
   - Run this in SQL Editor:
   ```sql
   SELECT public.sync_existing_users();
   ```

## How It Works

- When a new user signs up in `auth.users`, the trigger automatically creates a corresponding profile in the `users` table
- The trigger uses `SECURITY DEFINER` to bypass RLS policies
- If a profile already exists, it does nothing (no error)

## Verification

After setting up the trigger:
1. Sign up a new user
2. Check the `users` table in Supabase - the profile should be created automatically
3. Try onboarding - it should work without RLS errors

## Troubleshooting

If the trigger doesn't work:
1. Check that the trigger was created: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Check function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
3. Verify RLS policies allow the trigger function to insert: The function uses `SECURITY DEFINER` so it should work

