// Data provider switch. Today: the local public-safe snapshot.
// After Supabase cutover: re-export from "./supabase" instead — pages don't change.
export * from "./types";
export * from "./local";
