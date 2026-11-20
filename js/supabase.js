// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://ocxwlrjrifpoahlkythn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeHdscmpyaWZwb2FobGt5dGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMDk5MDYsImV4cCI6MjExMDU4NTkwNn0.mbVpjWhiX2DzE2121P5nJiM_26bdAruoh8XBFTDZGR0';

export const supabase = createClient(supabaseUrl, supabaseKey);
