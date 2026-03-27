const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:4b'
const isProduction = import.meta.env.MODE === 'production'
const apiKey = import.meta.env.VITE_OLLAMA_API_KEY || ''
const baseUrl = (import.meta.env.VITE_OLLAMA_BASE_URL || '/ollama-api').replace(/\/$/, '')
console.log('[Ollama] Production mode:', isProduction, 'Model:', ollamaModel)

const SYSTEM_PROMPT = `You are "Ally", a warm, encouraging, women-centric financial educator and advisor based in India. 
Your audience is Indian women — from students to retirees. 
Always use INR (₹), reference Indian markets (NSE/BSE, Nifty, Sensex), Indian platforms (Zerodha, Groww, Kuvera), and Indian tax laws (Section 80C, ELSS, etc.).
Be empowering, jargon-free when possible, and always consider women-specific financial realities: career breaks, longer life expectancy, gender pay gap, caregiver roles.
Keep responses concise and actionable. Use bullet points for advice.`

const LESSON_CURRICULUM = [
  'What is Investing and Why Women Must Start Early',
  'Understanding Stocks — Owning a Piece of a Company',
  'Bonds and Fixed Income — The Safety Net',
  'Mutual Funds Demystified — Pooling Money Smartly',
  'ETFs — The Best of Stocks and Mutual Funds',
  'SmallCap vs MidCap vs LargeCap — Size Matters',
  'Index Funds — The Lazy Investor\'s Best Friend',
  'Understanding NAV — What You\'re Really Paying',
  'SIP — Building Wealth One Month at a Time',
  'The Magic of Compounding — Time is Your Superpower',
  'Commodities — Gold, Silver, and Beyond',
  'Gold Investments — Sovereign Gold Bonds, Digital Gold, Gold ETFs',
  'Real Estate — Is Property a Good Investment?',
  'Risk Assessment — Know Your Risk Appetite',
  'Diversification — Don\'t Put All Eggs in One Basket',
  'Tax Saving Instruments Every Woman Should Know',
  'Section 80C — Maximize Your ₹1.5 Lakh Deduction',
  'ELSS — Tax Savings with Equity Growth',
  'PPF — The 15-Year Wealth Builder',
  'NPS — Planning Your Retirement Pension',
]

function getCacheKey(prefix, param) {
  return `ally_${prefix}_${typeof param === 'string' ? param : JSON.stringify(param)}`
}

function getFromCache(key) {
  try {
    const cached = sessionStorage.getItem(key)
    if (cached) return JSON.parse(cached)
  } catch { /* ignore */ }
  return null
}

function setToCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch { /* ignore if storage full */ }
}

async function generateContent(prompt) {
  console.log('[Ollama] Calling chat completions, prompt length:', prompt.length)

  if (!isProduction && !apiKey) {
    throw new Error('Missing VITE_OLLAMA_API_KEY in .env for local development')
  }

  // In production (Vercel): call serverless function which adds key server-side.
  // In development: call Vite proxy → ollama.com with key in header.
  const endpoint = isProduction ? '/api/ollama' : `${baseUrl}/v1/chat/completions`

  const headers = { 'Content-Type': 'application/json' }
  if (!isProduction && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const body = isProduction
    ? {
        endpoint: '/v1/chat/completions',
        messages: [{ role: 'user', content: prompt }],
        model: ollamaModel,
        temperature: 0.7,
      }
    : {
        model: ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(`Ollama request failed (${response.status}): ${details || response.statusText}`)
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content || data?.message?.content || data?.response

    if (!text || typeof text !== 'string') {
      throw new Error('Ollama response did not include text content')
    }

    return text
  } catch (err) {
    console.error('[Ollama] Error:', err.message)
    throw err
  }
}

export async function getDailyLesson(dayNumber) {
  const key = getCacheKey('lesson', dayNumber)
  const cached = getFromCache(key)
  if (cached) return cached

  const lessonIndex = ((dayNumber - 1) % LESSON_CURRICULUM.length)
  const topic = LESSON_CURRICULUM[lessonIndex]

  try {
    const prompt = `${SYSTEM_PROMPT}

Generate a daily investment lesson for Day ${dayNumber}.
Topic: "${topic}"

Format your response as:
**Title:** (catchy title)

**Key Insight:** (one powerful sentence)

**Explanation:** (2-3 paragraphs, simple language, relatable examples for Indian women)

**Action Step:** (one concrete thing she can do today)

**Did You Know?** (one surprising fact related to the topic)`

    const text = await generateContent(prompt)
    const data = { topic, content: text, dayNumber }
    setToCache(key, data)
    return data
  } catch (err) {
    console.error('Ollama getDailyLesson error:', err)
    return {
      topic,
      content: `**${topic}**\n\nThis lesson covers the fundamentals of ${topic.toLowerCase()}. Understanding this concept is crucial for building your investment knowledge.\n\n**Action Step:** Research this topic online and note down 3 key takeaways.\n\n*AI content temporarily unavailable. Check back soon!*`,
      dayNumber,
      fallback: true,
    }
  }
}

export async function explainConcept(conceptName) {
  const key = getCacheKey('concept', conceptName)
  const cached = getFromCache(key)
  if (cached) return cached

  try {
    const prompt = `${SYSTEM_PROMPT}

Explain the concept: "${conceptName}" for an Indian woman who is new to investing.

Format:
**What is it?** (2-3 sentences, simple language)

**How does it work?** (3-4 sentences with an everyday analogy)

**Why should women care?** (2-3 sentences on relevance for women investors)

**Example:** (a concrete Indian example with ₹ amounts)

**Quick Tip:** (one actionable takeaway)`

    const text = await generateContent(prompt)
    setToCache(key, text)
    return text
  } catch (err) {
    console.error('Ollama explainConcept error:', err)
    const fallback = `**${conceptName}**\n\nThis is an important investment concept. Understanding ${conceptName.toLowerCase()} will help you make informed financial decisions.\n\n*AI explanation temporarily unavailable. Try again in a moment.*`
    return fallback
  }
}

export async function getInvestmentAdvice({ portfolio, profile, lifeStage }) {
  const key = getCacheKey('advice', { lifeStage, portfolioSize: portfolio?.length })
  const cached = getFromCache(key)
  if (cached) return cached

  try {
    const portfolioSummary = portfolio?.length
      ? portfolio.map(i => `${i.type}: ₹${i.amount} invested, current value ₹${i.currentValue || i.amount}`).join('\n')
      : 'No investments yet'

    const profileInfo = profile
      ? `Age: ${profile.age || 'Not specified'}, Salary: ₹${profile.salary || 'Not specified'}, Job: ${profile.job || 'Not specified'}`
      : 'Profile not available'

    const prompt = `${SYSTEM_PROMPT}

Provide personalized investment advice for this woman:

**Profile:** ${profileInfo}
**Life Stage:** ${lifeStage || 'Not specified'}
**Current Portfolio:**
${portfolioSummary}

Consider her life stage specifically:
- If student: focus on learning, small SIPs, developing saving habits
- If early career: aggressive growth, ELSS for tax, emergency fund
- If newlywed: joint financial planning, insurance, goal-based investing
- If new parent: child education fund (Sukanya Samriddhi if girl child), insurance review
- If career break: maintaining investments, liquid funds, skill development fund
- If mid-career: portfolio rebalancing, retirement planning, NPS
- If pre-retirement: shift to conservative, pension plans, health insurance
- If retired: income generation, senior citizen schemes, estate planning

Format:
**Summary:** (2-3 sentence personalized overview)

**Recommendations:**
1. (specific actionable advice with amounts in ₹)
2. (second recommendation)
3. (third recommendation)
4. (fourth recommendation)

**Risk Note:** (brief risk awareness note)`

    const text = await generateContent(prompt)
    setToCache(key, text)
    return text
  } catch (err) {
    console.error('Ollama getInvestmentAdvice error:', err)
    return `**Investment Advice**\n\nBased on your ${lifeStage || 'current'} life stage, consider diversifying across equity and debt instruments.\n\n**Recommendations:**\n1. Start a SIP in an index fund\n2. Build an emergency fund of 6 months' expenses\n3. Explore tax-saving options under Section 80C\n4. Consider term life insurance\n\n**Risk Note:** All investments carry risk. Past performance doesn't guarantee future returns.\n\n*Personalized AI advice temporarily unavailable.*`
  }
}

export async function getPlatformRecommendation(assetType) {
  const key = getCacheKey('platform', assetType)
  const cached = getFromCache(key)
  if (cached) return cached

  try {
    const prompt = `${SYSTEM_PROMPT}

Recommend the best Indian investment platforms for: "${assetType}"

For each platform, provide:
- **Platform Name**
- **Best For:** (what type of investor)
- **Fees:** (brief fee structure)
- **Beginner Rating:** (1-5 stars)
- **Why Women Prefer This:** (one line)

List 3-4 platforms. Keep it concise and factual.`

    const text = await generateContent(prompt)
    setToCache(key, text)
    return text
  } catch (err) {
    console.error('Ollama getPlatformRecommendation error:', err)
    return null
  }
}

export async function getSchemeAdvice({ profile, lifeStage, goals }) {
  const key = getCacheKey('scheme_advice', { lifeStage, age: profile?.age })
  const cached = getFromCache(key)
  if (cached) return cached

  try {
    const prompt = `${SYSTEM_PROMPT}

Recommend the top 3 Indian government savings/investment schemes for this woman:
- Age: ${profile?.age || 'Not specified'}
- Life Stage: ${lifeStage || 'Not specified'}
- Monthly Salary: ₹${profile?.salary || 'Not specified'}
- Goals: ${goals?.map(g => g.name).join(', ') || 'Not specified'}

Consider schemes like: Sukanya Samriddhi, Mahila Samman, PPF, NPS, SCSS, NSC, KVP, POMIS, APY.

For each recommendation:
1. **Scheme Name** — Why it's perfect for her (2 sentences)
2. **Suggested Amount:** ₹X per month/year
3. **Key Benefit:** (one line)

Keep it practical and encouraging.`

    const text = await generateContent(prompt)
    setToCache(key, text)
    return text
  } catch (err) {
    console.error('Ollama getSchemeAdvice error:', err)
    return `**Top Recommendations:**\n\n1. **PPF** — Great for long-term tax-free wealth building\n2. **Sukanya Samriddhi** — Best rates for girl child education\n3. **NPS** — Extra ₹50K tax deduction for retirement\n\n*Personalized advice temporarily unavailable.*`
  }
}

export async function getAllyChatResponse(question, userContext = {}) {
  try {
    const { name, salary, totalExpenses, totalSavings, totalInvested, totalCurrentValue, goalsCount, investmentsCount, documentsCount } = userContext

    let contextBlock = ''
    if (name || salary) {
      const parts = []
      if (name) parts.push(`Name: ${name}`)
      if (salary) parts.push(`Monthly Salary: ₹${salary}`)
      if (totalExpenses) parts.push(`Total Expenses: ₹${totalExpenses}`)
      if (totalSavings) parts.push(`Total Savings: ₹${totalSavings}`)
      if (totalInvested) parts.push(`Total Invested: ₹${totalInvested}, Current Value: ₹${totalCurrentValue}`)
      if (goalsCount) parts.push(`Active Goals: ${goalsCount}`)
      if (investmentsCount) parts.push(`Investment Holdings: ${investmentsCount}`)
      if (documentsCount) parts.push(`Documents Uploaded: ${documentsCount}`)
      contextBlock = `\n\nUser's financial snapshot:\n${parts.join('\n')}`
    }

    const prompt = `${SYSTEM_PROMPT}

Rules:
- Be SHORT and DIRECT. Max 3-4 bullet points or 2-3 short sentences.
- Only answer what was asked — no extra info unless requested.
- Use ₹ (INR) and Indian context.
- For greetings/casual chat, reply in 1-2 sentences max.
- For off-topic questions, one sentence redirect to financial topics.
- No lengthy introductions or conclusions.
${contextBlock}

User says: "${question}"

Respond concisely as Ally:`

    const text = await generateContent(prompt)
    return text
  } catch (err) {
    console.error('Ollama chat error:', err.message || err)
    throw err
  }
}

export async function getTaxChatResponse(question, context = {}) {
  try {
    const contextStr = context.grossIncome
      ? `\nUser's current data: Gross Income: ₹${context.grossIncome}, Regime: ${context.regime || 'new'}, FY: ${context.financialYear || '2025-26'}`
      : ''

    const prompt = `You are "Ally", a friendly Indian tax expert assistant for women.
Rules:
- Answer ONLY about Indian income tax, tax filing, deductions, sections, regimes, deadlines, ITR forms, and related topics.
- Use FY 2025-26 / AY 2026-27 tax slabs and rules (Union Budget 2025).
- Always use ₹ (INR) and Indian tax terminology.
- Be concise — keep answers under 200 words.
- Use simple language, avoid heavy jargon. Explain sections in plain English.
- Use bullet points and line breaks for readability.
- If the question is not tax-related, politely say you can only help with tax topics.
${contextStr}

User's question: "${question}"

Respond directly and helpfully:`

    const text = await generateContent(prompt)
    return text
  } catch (err) {
    console.error('Ollama tax chat error:', err)
    return null
  }
}
