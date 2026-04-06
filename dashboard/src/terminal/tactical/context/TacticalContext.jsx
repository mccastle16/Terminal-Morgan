import { createContext, useContext, useState, useCallback } from 'react'
import { useTerminalData } from '../../context/TerminalDataContext'
import { getAdvisorResponse } from '../engine/businessAdvisor'

const TacticalContext = createContext(null)

export function TacticalProvider({ children }) {
  const { stats, rawBusinesses } = useTerminalData()
  const [messages, setMessages] = useState([])
  const [pinnedCharts, setPinnedCharts] = useState([])
  const [experiments, setExperiments] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Send a message through the advisor engine
  const sendMessage = useCallback((text) => {
    if (!text.trim() || isProcessing) return

    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setIsProcessing(true)

    // Small delay to show typing indicator
    setTimeout(() => {
      const response = getAdvisorResponse(text, { stats, rawBusinesses, conversationHistory: messages })

      const advisorMsg = {
        id: Date.now() + 1,
        role: 'advisor',
        text: '',
        response,
        timestamp: response.timestamp,
      }

      // Auto-store experiments
      if (response.intent === 'experiment') {
        const expSection = response.sections.find(s => s.type === 'experiment')
        if (expSection) {
          setExperiments(prev => [...prev, { id: Date.now(), ...expSection, timestamp: response.timestamp }])
        }
      }

      setMessages(prev => [...prev, advisorMsg])
      setIsProcessing(false)

      return response
    }, 300 + Math.random() * 400)
  }, [stats, rawBusinesses, messages, isProcessing])

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
