import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vkskauzkxdsucmepnkgw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc2thdXpreGRzdWNtZXBua2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzYyNzYsImV4cCI6MjA4OTE1MjI3Nn0.0bOZj8uXgiTl7gBFsqu_J_0rZjkjO6fJCcrb3qdDTwE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'javi.deberaga@gmail.com',
    password: 'javi321'
  })
  console.log('Login Javi:', error ? error.message : 'Success')
}
testLogin()
