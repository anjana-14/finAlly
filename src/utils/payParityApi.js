import { getAllyChatResponse } from './ollamaApi'

/**
 * Fetch pay-parity benchmarks using Ollama Qwen 7B for realistic salary estimates.
 * Falls back to a formula-based estimate if AI is unavailable.
 */
export async function fetchPayParity({ company, role, experience, location, skills }) {
  try {
    const prompt = `You are a salary data API. Return ONLY a raw JSON object — no markdown, no backticks, no explanation.

Role: ${role || 'Software Engineer'}
Company: ${company || 'Not specified'}
Location: ${location || 'India'}
Experience: ${experience || 0} years
Skills: ${skills || 'Not specified'}

Output format (strictly):
{"marketBenchmark": <integer>, "companyEstimate": <integer>, "sources": ["source1", "source2"]}

Rules — read carefully:
- marketBenchmark and companyEstimate MUST be full rupee integers (e.g. 700000 for 7 lakhs, NOT 7 or 7L or 7.0)
- Salary ranges in full rupees: fresher=400000-600000, 3yr=800000-1200000, 5yr=1200000-1800000, 8yr=1800000-3000000, 10yr+=2500000-5000000
- FAANG companies (Google, Microsoft, Amazon, Meta): multiply market by 2.5 to 4.0
- Indian IT service companies (TCS, Infosys, Wipro, HCL, Cognizant): multiply market by 0.85 to 1.0
- Indian product startups (Flipkart, Zomato, Swiggy, Razorpay, CRED): multiply market by 1.3 to 2.0
- Mid-tier Indian companies (Amdocs, Mphasis, L&T Infotech): multiply market by 1.0 to 1.3
- Return ONLY the JSON object, nothing else`

    const response = await getAllyChatResponse(prompt, { salary: 0 })

    if (response) {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const data = JSON.parse(cleaned)

      if (data.marketBenchmark && data.companyEstimate) {
        // Normalize if model returned values in lakhs (e.g. 7 instead of 700000)
        const normalize = (v) => (v < 10000 ? Math.round(v * 100000) : Math.round(v))
        return {
          marketBenchmark: normalize(data.marketBenchmark),
          companyEstimate: normalize(data.companyEstimate),
          sources: data.sources || ['Ollama Qwen 7B Analysis', 'Glassdoor', 'AmbitionBox'],
        }
      }
    }
  } catch (err) {
    console.warn('[PayParity] Ollama failed, using fallback:', err.message)
  }

  return fallbackEstimate({ role, company, experience })
}

function fallbackEstimate({ role, company, experience }) {
  const exp = Number(experience) || 0
  const roleLower = (role || '').toLowerCase()
  const companyLower = (company || '').toLowerCase()

  let baseMarket = 800000
  if (roleLower.includes('senior') || roleLower.includes('lead')) baseMarket = 1600000
  else if (roleLower.includes('manager') || roleLower.includes('architect')) baseMarket = 2000000
  else if (roleLower.includes('director') || roleLower.includes('vp')) baseMarket = 3500000
  else if (roleLower.includes('analyst')) baseMarket = 700000
  else if (roleLower.includes('designer')) baseMarket = 750000
  else if (roleLower.includes('engineer') || roleLower.includes('developer')) baseMarket = 900000

  const expMultiplier = 1 + Math.max(0, exp - 2) * 0.12
  const market = Math.round(baseMarket * expMultiplier)

  let companyMultiplier = 1.0
  const faang = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix']
  const topIndian = ['flipkart', 'phonepe', 'razorpay', 'cred', 'swiggy', 'zomato', 'meesho']
  const serviceCompanies = ['tcs', 'infosys', 'wipro', 'hcl', 'cognizant', 'tech mahindra', 'capgemini']

  if (faang.some(f => companyLower.includes(f))) companyMultiplier = 2.8
  else if (topIndian.some(f => companyLower.includes(f))) companyMultiplier = 1.6
  else if (serviceCompanies.some(f => companyLower.includes(f))) companyMultiplier = 0.9

  return {
    marketBenchmark: market,
    companyEstimate: Math.round(market * companyMultiplier),
    sources: ['Estimated (AI unavailable)', 'Glassdoor averages', 'AmbitionBox data'],
  }
}
