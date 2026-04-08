import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useTerminalData } from '../../context/TerminalDataContext'
import { getAdvisorResponse } from '../engine/businessAdvisor'
import { createBeliefState } from '../engine/informationGain'
import { callOpenAI, buildDataContext, checkAPIHealth } from '../engine/openaiClient'
import { buildChartsFromInstructions } from '../engine/chartBuilder'

const TacticalContext = createContext(null)

export function TacticalProvider({ children }) {
  const { stats, rawBusinesses, marketAnalytics } = useTerminalData()
  const [messages, setMessages] = useState([])
  const [pinnedCharts, setPinnedCharts] = useState([])
  const [experiments, setExperiments] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [beliefState, setBeliefState] = useState(() => createBeliefState())
  const [delta, setDelta] = useState(0.3)
  const [aiMode, setAiMode] = useState('auto') // 'auto' | 'llm' | 'local'
  const [apiStatus, setApiStatus] = useState({ available: false, model: null, checked: false })

  // Check if OpenAI server is available on mount
  useEffect(() => {
    checkAPIHealth().then(status => setApiStatus({ ...status, checked: true }))
  }, [])

  // Send a message through the hybrid advisor engine
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isProcessing) return

    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setIsProcessing(true)

    // 1. Always run local engine first (instant structured cards + charts)
    const localResponse = getAdvisorResponse(text, { stats, rawBusinesses, conversationHistory: messages, beliefState, delta, marketAnalytics })

    if (localResponse.beliefUpdate) {
      setBeliefState(localResponse.beliefUpdate)
    }

    // 2. Determine if we should call OpenAI
    const useLLM = aiMode === 'llm' || (aiMode === 'auto' && apiStatus.available)

    let llmText = null
    if (useLLM) {
      const dataContext = buildDataContext(stats, localResponse.entities, rawBusinesses, marketAnalytics)
      // Build conversation history for the LLM (last 10 messages to keep tokens low)
      const historyForLLM = [...messages.slice(-10), userMsg]
      const result = await callOpenAI(historyForLLM, dataContext)
      if (result.text) {
        llmText = result.text
      }
      // If OpenAI returned chart instructions, build real charts from local data
      if (result.chartInstructions?.length > 0) {
        const aiCharts = buildChartsFromInstructions(result.chartInstructions, rawBusinesses)
        if (aiCharts.length > 0) {
          localResponse.chartSpec = [...(localResponse.chartSpec || []), ...aiCharts]
        }
      }
      // If LLM fails silently, local cards still show
    }

    const advisorMsg = {
      id: Date.now() + 1,
      role: 'advisor',
      text: llmText || '',
      response: localResponse,
      timestamp: localResponse.timestamp,
    }

    // Auto-store experiments
    if (localResponse.intent === 'experiment') {
      const expSection = localResponse.sections.find(s => s.type === 'experiment')
      if (expSection) {
        setExperiments(prev => [...prev, { id: Date.now(), ...expSection, timestamp: localResponse.timestamp }])
      }
    }

    setMessages(prev => [...prev, advisorMsg])
    setIsProcessing(false)
  }, [stats, rawBusinesses, messages, isProcessing, beliefState, delta, aiMode, apiStatus])

  // Pin a chart from a response to the dynamic graph area
  const pinChart = useCallback((chartSpec) => {
    setPinnedCharts(prev => [...prev, { ...chartSpec, id: Date.now(), pinned: true }])
  }, [])

  const unpinChart = useCallback((chartId) => {
    setPinnedCharts(prev => prev.filter(c => c.id !== chartId))
  }, [])

  // Clear conversation
  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  const clearExperiments = useCallback(() => {
    setExperiments([])
  }, [])

  return (
    <TacticalContext.Provider value={{
      messages, sendMessage, clearChat, isProcessing,
      pinnedCharts, pinChart, unpinChart,
      experiments, clearExperiments,
      beliefState, delta, setDelta,
      aiMode, setAiMode, apiStatus,
    }}>
      {children}
    </TacticalContext.Provider>
  )
}

export function useTactical() {
  const ctx = useContext(TacticalContext)
  if (!ctx) throw new Error('useTactical must be used within TacticalProvider')
  return ctx
}
