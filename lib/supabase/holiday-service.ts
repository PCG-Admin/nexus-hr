import { createClient } from './client'

export type PublicHoliday = {
  id: string
  name: string
  date: string
  year: number
}

export async function getPublicHolidays(year: number): Promise<PublicHoliday[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_holidays')
    .select('*')
    .eq('year', year)
    .order('date', { ascending: true })

  if (error) return []

  return data.map(row => ({
    id: row.id,
    name: row.name,
    date: row.date,
    year: row.year,
  }))
}

// Returns a Set of date strings ('yyyy-MM-dd') for fast O(1) lookup during day counting
export async function getPublicHolidayDates(startYear: number, endYear: number): Promise<Set<string>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_holidays')
    .select('date')
    .gte('year', startYear)
    .lte('year', endYear)

  if (error || !data) return new Set()

  return new Set(data.map(row => row.date))
}

export async function addPublicHoliday(
  name: string,
  date: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const year = new Date(date).getFullYear()

  const { error } = await supabase
    .from('public_holidays')
    .insert({ name, date, year })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deletePublicHoliday(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('public_holidays')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Counts actual working days between two dates, excluding weekends and public holidays
export function countWorkingDays(start: Date, end: Date, holidayDates: Set<string>): number {
  let count = 0
  // Parse using local date parts to avoid UTC-offset shifting (e.g. UTC+2 moving Apr 27 → Apr 26)
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endNorm = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  while (current <= endNorm) {
    const day = current.getDay()
    // Use local date parts to avoid UTC offset shifting the date
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`

    if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) {
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}
