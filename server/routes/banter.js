const express = require('express')
const router = express.Router()

// Simple fetch-based OpenAI call (no extra package needed)
async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 40
    })
  })

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim()
}

router.post('/banter', async (req, res) => {
  try {
    const { event, tone = 'funny', language = 'he', streakCount = 0 } = req.body

    const prompt = `
You write short, friendly game banter for a submarine battle game.
Return EXACTLY one line, max 12 words.
No profanity, no sexual content, no hate.
Language: ${language}.
Tone: ${tone}.
Event: ${event}.
Streak: ${streakCount}.
`

    const line = await callOpenAI(prompt) || '🔥'
    res.json({ line })
  } catch (e) {
    console.error('Banter error:', e)
    res.status(500).json({ line: 'אופס… הצוללת איבדה קליטה 😅' })
  }
})

module.exports = router
