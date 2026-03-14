import { useState, useEffect, useRef } from 'react'
import { ArrowUp, Trash2, Key, Sparkles, Loader2 } from 'lucide-react'
import { getConversations, addMessage, clearConversations, getAllHistory } from '../lib/api'
import { getStoredAPIKey, setStoredAPIKey, summarizeData, sendChatMessage } from '../lib/ai'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [apiKey, setApiKey] = useState(getStoredAPIKey())
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [workoutSummary, setWorkoutSummary] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversation history + workout data
  useEffect(() => {
    async function init() {
      try {
        const history = await getAllHistory()
        setWorkoutSummary(summarizeData(history))
      } catch (err) {
        console.warn('Could not load workout history:', err)
      }
      try {
        const convos = await getConversations()
        setMessages(convos)
      } catch (err) {
        // ai_conversations table may not exist yet — that's OK
        console.warn('Could not load conversations (table may not exist yet):', err)
      }
      setLoading(false)
    }
    init()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    if (!apiKey) {
      setShowKeyInput(true)
      return
    }

    setInput('')
    setSending(true)

    // Optimistically add user message
    const tempUserMsg = { id: Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      // Save user message to DB (may fail if table doesn't exist — chat still works)
      try {
        const savedUser = await addMessage('user', text)
        setMessages((prev) => prev.map((m) => (m.id === tempUserMsg.id ? savedUser : m)))
      } catch {
        // Table may not exist yet — keep the temp message, chat still works
      }

      // Only inject workout context if this is the first message or every 20 messages
      const shouldInjectContext = messages.filter((m) => m.role === 'user').length % 20 === 0
      const contextToSend = shouldInjectContext ? workoutSummary : null

      // Get AI response
      const dbMessages = [...messages.filter((m) => m.role !== 'system'), { role: 'user', content: text }]
      // Only send last 40 messages to avoid token limits
      const recentMessages = dbMessages.slice(-40)
      const aiResponse = await sendChatMessage(apiKey, text, recentMessages.slice(0, -1), contextToSend)

      // Save assistant message to DB
      let assistantMsg = { id: Date.now() + 2, role: 'assistant', content: aiResponse, created_at: new Date().toISOString() }
      try {
        assistantMsg = await addMessage('assistant', aiResponse)
      } catch {
        // Table may not exist yet — use local message
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error('Chat error:', err)
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `**Error:** ${err.message}\n\n${err.message.includes('401') ? 'Your API key may be invalid. Tap the key icon to update it.' : 'Please try again.'}`,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear all conversation history? This cannot be undone.')) return
    try {
      await clearConversations()
      setMessages([])
    } catch (err) {
      alert('Error clearing: ' + err.message)
    }
  }

  const handleSaveKey = () => {
    if (keyDraft.trim()) {
      setStoredAPIKey(keyDraft.trim())
      setApiKey(keyDraft.trim())
    }
    setShowKeyInput(false)
    setKeyDraft('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-400" />
          <h1 className="text-lg font-bold">AI Coach</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowKeyInput(true); setKeyDraft(apiKey) }}
            className="p-2 text-[#a0a0a0] hover:text-white transition-colors"
            title="API Key"
          >
            <Key size={16} />
          </button>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 text-[#a0a0a0] hover:text-red-400 transition-colors"
              title="Clear History"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyInput && (
        <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#2a2a2a] shrink-0">
          <p className="text-xs text-[#a0a0a0] mb-2">Enter your Anthropic API key to chat with AI Coach. Your key is stored locally and never sent to our servers.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSaveKey}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowKeyInput(false)}
              className="px-3 py-2 text-[#a0a0a0] hover:text-white text-sm transition-colors"
            >
              &#10005;
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="text-center py-16">
            <Sparkles size={40} className="mx-auto mb-4 text-indigo-400/30" />
            <p className="text-[#a0a0a0] text-sm mb-1">Ask your AI Coach anything</p>
            <p className="text-[#555] text-xs">Training advice, form tips, programming suggestions...</p>
            <div className="mt-6 space-y-2">
              {[
                'How is my training volume trending?',
                'What exercises should I prioritize?',
                'Am I training enough for my goals?',
                'Suggest a deload week plan',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="block w-full text-left text-sm text-indigo-400 bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-2.5 hover:bg-indigo-500/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {sending && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-4 py-3 border border-[#2a2a2a]">
              <Loader2 size={16} className="animate-spin text-indigo-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-24 pt-2 border-t border-[#2a2a2a] shrink-0 bg-[#0a0a0a]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={apiKey ? 'Ask your AI Coach...' : 'Set API key first (tap key icon)'}
            disabled={!apiKey}
            rows={1}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-indigo-500 disabled:opacity-50 max-h-32"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              e.target.style.height = '44px'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !apiKey}
            className="p-3 bg-indigo-600 text-white rounded-xl disabled:bg-[#222] disabled:text-[#555] hover:bg-indigo-500 transition-colors shrink-0"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-indigo-600 rounded-2xl rounded-br-sm px-4 py-2.5">
          <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="max-w-[85%] bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-4 py-3 border border-[#2a2a2a]">
        <div className="text-sm text-white prose-invert">
          <FormattedText text={message.content} />
        </div>
      </div>
    </div>
  )
}

/**
 * Simple markdown-ish renderer for bold, bullets, and paragraphs.
 */
function FormattedText({ text }) {
  const paragraphs = text.split('\n\n')

  return (
    <div className="space-y-2">
      {paragraphs.map((p, i) => {
        const lines = p.split('\n')
        return (
          <div key={i}>
            {lines.map((line, j) => {
              // Bold
              const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

              // Bullet
              if (line.match(/^[-*]\s/)) {
                return (
                  <div key={j} className="flex gap-2 ml-1">
                    <span className="text-indigo-400 shrink-0">&#8226;</span>
                    <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-*]\s/, '') }} />
                  </div>
                )
              }

              // Numbered list
              if (line.match(/^\d+\.\s/)) {
                const num = line.match(/^(\d+)\./)[1]
                return (
                  <div key={j} className="flex gap-2 ml-1">
                    <span className="text-indigo-400 shrink-0 text-xs mt-0.5">{num}.</span>
                    <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s/, '') }} />
                  </div>
                )
              }

              return line ? (
                <p key={j} dangerouslySetInnerHTML={{ __html: formatted }} />
              ) : null
            })}
          </div>
        )
      })}
    </div>
  )
}
