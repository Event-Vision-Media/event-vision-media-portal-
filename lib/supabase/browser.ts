import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-Client (Anon-Key) für direkte Uploads zu Supabase Storage über
 * signierte URLs (siehe app/actions/audio-guestbook.ts). Der Anon-Key allein
 * gewährt keinen Zugriff auf die privaten Audiogästebuch-Buckets - das
 * passiert ausschließlich über die serverseitig ausgestellten Tokens.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
