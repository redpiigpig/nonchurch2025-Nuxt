// src/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pottupypvdzamztdhsah.supabase.co";
const supabaseKey = "sb_publishable_xkuG-NZp4z-2OXPgkEJgHQ_9JaTGpCl";

export const supabase = createClient(supabaseUrl, supabaseKey);
