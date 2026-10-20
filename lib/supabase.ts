import { createClient } from "@supabase/supabase-js";
 
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 
/**
 * Modo local: sem login e sem banco, com os dados guardados só neste
 * navegador. Fica ativo quando as variáveis do Supabase não estão preenchidas
 * ou quando NEXT_PUBLIC_SKIP_LOGIN=true.
 */
export const localMode =
  !url || !key || process.env.NEXT_PUBLIC_SKIP_LOGIN === "true";
 
export const supabase = localMode ? null : createClient(url!, key!);
 