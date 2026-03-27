import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { getInvestmentAdvice, getAllyChatResponse } from '../../utils/ollamaApi'
import { useUserData } from '../../contexts/UserDataContext'

export default function AiAdvisor({ lifeStage }) {
  const { investments, profile, goals } = useUserData()
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUps, setFollowUps] = useState([])
  const intervalRef = useRef(null)

  function animateText(fullText) {
    setIsTyping(true)
    setDisplayedText('')
    let idx = 0
    intervalRef.current = setInterval(() => {
      idx += 3
      if (idx >= fullText.length) {
        setDisplayedText(fullText)
        setIsTyping(false)
        clearInterval(intervalRef.current)
      } else {
        setDisplayedText(fullText.substring(0, idx))
      }
    }, 10)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  async function handleGetAdvice() {
    setLoading(true)
    setAdvice(null)
    setDisplayedText('')
    setFollowUps([])
    setFollowUpQuestion('')
    try {
      const result = await getInvestmentAdvice({
        portfolio: investments,
        profile,
        lifeStage,
      })
      setAdvice(result)
      animateText(result)
    } catch (err) {
      console.error('AI Advisor error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAskFollowUp() {
    const question = followUpQuestion.trim()
    if (!question || !advice || followUpLoading) return

    setFollowUpLoading(true)
    setFollowUpQuestion('')

    try {
      const prompt = `You previously gave this investment advice:\n\n${advice}\n\nNow answer this follow-up question from the same user: "${question}"\n\nRules:\n- Stay consistent with the earlier advice\n- Keep it short and practical\n- Use INR (₹) amounts where relevant`

      const response = await getAllyChatResponse(prompt, {
        name: profile?.name,
        salary: profile?.salary,
        totalExpenses: 0,
        totalSavings: 0,
        totalInvested: investments?.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
        totalCurrentValue: investments?.reduce((sum, i) => sum + (Number(i.currentValue || i.amount) || 0), 0),
        goalsCount: goals?.length,
        investmentsCount: investments?.length,
        documentsCount: 0,
      })

      setFollowUps((prev) => [
        ...prev,
        {
          question,
          answer: response || 'I could not fetch a follow-up response right now. Please try again.',
        },
      ])
    } catch (err) {
      console.error('AI Advisor follow-up error:', err)
      setFollowUps((prev) => [
        ...prev,
        {
          question,
          answer: 'There was an issue answering your follow-up. Please try again.',
        },
      ])
    } finally {
      setFollowUpLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-lavender-400 to-blush-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">AI Investment Advisor</h3>
            <p className="text-[11px] text-gray-400">Personalized advice powered by Ollama</p>
          </div>
        </div>
        {advice && (
          <button
            onClick={handleGetAdvice}
            className="p-2 rounded-xl hover:bg-lavender-50 dark:hover:bg-lavender-900/30 text-gray-400 hover:text-lavender-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {!advice && !loading && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Get personalized investment advice based on your portfolio, profile, and life stage.
            {lifeStage && (
              <span className="block mt-1 text-lavender-500 font-semibold">
                Life stage: {lifeStage.replace('-', ' ')}
              </span>
            )}
          </p>
          <button
            onClick={handleGetAdvice}
            className="btn-primary text-sm flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            Get Personalized Advice
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-lavender-500 animate-spin mb-3" />
          <p className="text-sm text-gray-400">Analyzing your portfolio...</p>
        </div>
      )}

      {advice && !loading && (
        <div className="bg-gradient-to-br from-lavender-50/50 to-mint-50/50 dark:from-lavender-900/20 dark:to-mint-900/10 rounded-2xl p-5">
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {displayedText}
            {isTyping && <span className="inline-block w-1.5 h-4 bg-lavender-500 animate-pulse ml-0.5" />}
          </div>

          {!isTyping && (
            <div className="mt-4 border-t border-lavender-200/60 dark:border-lavender-700/40 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ask a follow-up question</p>

              {followUps.map((item, idx) => (
                <div key={`${item.question}-${idx}`} className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">You:</span> {item.question}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line bg-white/70 dark:bg-gray-800/40 rounded-xl p-3 border border-lavender-100 dark:border-gray-700">
                    {item.answer}
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAskFollowUp()
                    }
                  }}
                  placeholder="Ask a follow-up about this advice..."
                  className="flex-1 px-3 py-2 rounded-xl border border-lavender-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lavender-200"
                />
                <button
                  type="button"
                  onClick={handleAskFollowUp}
                  disabled={followUpLoading || !followUpQuestion.trim()}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-lavender-500 text-white hover:bg-lavender-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {followUpLoading ? 'Asking...' : 'Ask'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
