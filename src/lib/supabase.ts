import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings.');
}

const createMissingConfigProxy = (path: string): any => {
  // We use a function as the target so that the proxy is itself callable.
  const target = (...args: any[]) => {
    // If it's a common event listener call (like onAuthStateChange), we might want to return 
    // a dummy unsubscribe function instead of throwing to prevent component crashes
    if (path.includes('onAuthStateChange') || path.includes('onSnapshot') || path.includes('subscribe')) {
      console.warn(`Supabase call to ${path} ignored - Client not configured.`);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    throw new Error(
      `Supabase client is not initialized because VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ` +
      `Please provide these credentials in the Settings menu (Secrets/Environment Variables tab). ` +
      (path ? `Failed while trying to call: supabase.${path}()` : 'Failed while trying to use supabase client.')
    );
  };

  return new Proxy(target, {
    get: (t, prop) => {
      // Handle special React/Vite/JS properties to avoid infinite recursion or errors in dev tools
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON' || prop === 'constructor') {
        return (t as any)[prop];
      }
      
      const currentPath = path ? `${path}.${String(prop)}` : String(prop);
      return createMissingConfigProxy(currentPath);
    },
    apply: (t, thisArg, args) => {
      // This is triggered when the proxy is called as a function (e.g., supabase.from('table'))
      return t();
    }
  });
};

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMissingConfigProxy('');
