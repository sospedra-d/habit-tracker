import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vkskauzkxdsucmepnkgw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc2thdXpreGRzdWNtZXBua2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzYyNzYsImV4cCI6MjA4OTE1MjI3Nn0.0bOZj8uXgiTl7gBFsqu_J_0rZjkjO6fJCcrb3qdDTwE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearTable(tableName) {
  try {
    const { data: items, error: fetchError } = await supabase.from(tableName).select('id')
    if (fetchError) throw fetchError
    
    if (items && items.length > 0) {
      const ids = items.map(item => item.id)
      
      // Delete in batches of 100 to avoid URL length limits in the REST API
      for (let i = 0; i < ids.length; i += 100) {
        const batchIds = ids.slice(i, i + 100)
        const { error: deleteError } = await supabase.from(tableName).delete().in('id', batchIds)
        if (deleteError) throw deleteError
      }
      console.log(`✅ Cleared ${items.length} records from ${tableName}`)
    } else {
      console.log(`- Table ${tableName} is already empty`)
    }
  } catch (err) {
    console.error(`❌ Error clearing ${tableName}:`, err.message)
  }
}

async function clearDatabase() {
  console.log('🧹 Empezando limpieza de la base de datos...')
  
  // Clear dependent tables first
  await clearTable('habit_logs')
  await clearTable('pomodoro_logs')
  
  // Clear main tables
  await clearTable('todos')
  await clearTable('habits')
  
  console.log('✨ Base de datos completamente limpia y lista para usar.')
}

clearDatabase()
