export type LivingExpenseSource = 'card' | 'bank'

export type LivingExpenseTransaction = {
  id: string
  date: string
  source: LivingExpenseSource
  description: string
  amount: number
  category: string
  memo: string
}
