import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vgwzrewpzakqypldqyxf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3pyZXdwemFrcXlwbGRxeXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDk4MjUsImV4cCI6MjA4NDQyNTgyNX0.xh_7MCcgiOzd9W8dLNCohSuG_nF_WIcRKOU6Ys9DcoQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
