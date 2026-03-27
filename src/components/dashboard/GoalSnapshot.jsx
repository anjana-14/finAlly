import { Target } from 'lucide-react'
import { useUserData } from '../../contexts/UserDataContext'

function formatCurrency(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function GoalSnapshot() {
  const { goals } = useUserData()

  const sortedGoals = goals.sort((a, b) => {
    const aAchieved = a.current >= a.target
    const bAchieved = b.current >= b.target
    // Incomplete goals come first, achieved goals go to bottom
    if (aAchieved !== bAchieved) {
      return aAchieved ? 1 : -1
    }
    return 0
  })

  const topGoals = sortedGoals.slice(0, 3)

  const colors = [
    { bar: 'from-lavender-400 to-lavender-500', bg: 'bg-lavender-50' },
    { bar: 'from-blush-400 to-blush-500', bg: 'bg-blush-50' },
    { bar: 'from-mint-400 to-mint-500', bg: 'bg-mint-50' },
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <Target className="w-4 h-4 text-lavender-400" />
        Top Goals
      </h3>
      {topGoals.length === 0 ? (
        <div className="card p-4">
          <p className="text-sm text-gray-400 text-center">No goals yet. Add one from the Goals page!</p>
        </div>
      ) : (
        topGoals.map((goal, i) => {
          const progress = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0
          const isAchieved = goal.current >= goal.target
          const c = colors[i % colors.length]
          return (
            <div key={goal.id} className="card p-4" style={{ borderColor: isAchieved ? '#22c55e' : 'var(--card-border)' }}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl ${isAchieved ? 'bg-green-100' : c.bg} flex items-center justify-center text-lg`}>
                  {isAchieved ? '✓' : '🎯'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{goal.title}</p>
                    {isAchieved && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap">
                        ✓ Achieved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
                    {formatCurrency(goal.current || 0)} of {formatCurrency(goal.target)}
                  </p>
                  <div className="mt-2 w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700`}
                      style={{ 
                        width: `${progress}%`,
                        background: isAchieved
                          ? 'linear-gradient(to right, #22c55e, #16a34a)'
                          : `linear-gradient(to right, var(--${['lavender', 'blush', 'mint'][i % 3]}-400), var(--${['lavender', 'blush', 'mint'][i % 3]}-500))`
                      }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: isAchieved ? '#22c55e' : 'var(--lavender-500)' }}>
                    {isAchieved ? '🎉 Goal Achieved!' : `${progress}% complete`}
                  </p>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
