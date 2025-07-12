import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { BrowserService } from './BrowserService'
import { DemoAction, WebsiteTrainingData } from '../../types'
import fs from 'fs'
import path from 'path'

interface AIResponse {
  id: string
  explanation: string
  actions: DemoAction[]
}

export class AIOrchestrator {
  private openai: OpenAI
  private isInitialized = false
  private trainingDataCache: Map<string, WebsiteTrainingData> = new Map()

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async initialize() {
    if (this.isInitialized) return
    console.log('🤖 Initializing AI Orchestrator...')
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    
    this.isInitialized = true
    console.log('✅ AI Orchestrator initialized')
  }

  private findHeuristicMatch(command: string, candidates: any[]): { selector: string; index: number } | null {
    const lowerCmd = command.toLowerCase();
    const match = candidates.find((c, idx) => {
      return (
        (c.text && c.text.toLowerCase().includes(lowerCmd)) ||
        (c.ariaLabel && c.ariaLabel.toLowerCase().includes(lowerCmd)) ||
        (c.title && c.title.toLowerCase().includes(lowerCmd)) ||
        (c.dataTestid && c.dataTestid.toLowerCase().includes(lowerCmd)) ||
        (c.parentText && c.parentText.toLowerCase().includes(lowerCmd))
      );
    });
    if (match) {
      let selector = '';
      if (match.dataTestid) selector = `[data-testid='${match.dataTestid}']`;
      else if (match.ariaLabel) selector = `[aria-label='${match.ariaLabel}']`;
      else if (match.title) selector = `${match.tag}[title='${match.title}']`;
      else if (match.text) selector = `${match.tag}:has-text(\"${match.text}\")`;
      else selector = `${match.tag}:nth-child(${match.index + 1})`;
      console.log('✅ Heuristic match found:', match);
      console.log('👉 Selector chosen by heuristic:', selector);
      return { selector, index: match.index };
    }
    return null;
  }

  private async selectElementByPrompt(
    command: string,
    candidates: any[],
    openai: OpenAI
  ): Promise<{ selector: string; index: number } | null> {
    // Try heuristic match first
    const heuristic = this.findHeuristicMatch(command, candidates);
    if (heuristic) return heuristic;
    const candidatesShort = candidates.slice(0, 30)
    // Debug: log candidates
    console.log('🔎 Candidate elements (first 3):', JSON.stringify(candidatesShort.slice(0, 3), null, 2))
    console.log('🔎 Total candidates:', candidates.length)
    const llmPrompt = `
User command: "${command}"
Here are the candidate elements (with semantic info):
${JSON.stringify(candidatesShort, null, 2)}
Choose the element (by index) that best matches the user's intent. Prefer elements whose text, aria-label, title, placeholder, alt, data-testid, or parentText closely match the intent. Respond with the index and a short explanation.`
    // Log the LLM prompt for debugging
    console.log('📝 [Prompt Input] Element selection LLM prompt:', llmPrompt.slice(0, 2000));
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: llmPrompt }],
      temperature: 0.1,
      max_tokens: 100
    })
    const content = response.choices[0].message.content
    // Debug: log LLM output
    console.log('📝 [Prompt Output] Element selection LLM output:', content)
    if (!content) return null;
    const matches = Array.from(content.matchAll(/(\d+)/g)).map(m => parseInt(m[1], 10)).filter(idx => !isNaN(idx))
    for (const idx of matches) {
      if (idx >= 0 && idx < candidatesShort.length) {
        const chosen = candidatesShort[idx]
        let selector = ''
        if (chosen.dataTestid) selector = `[data-testid='${chosen.dataTestid}']`
        else if (chosen.ariaLabel) selector = `[aria-label='${chosen.ariaLabel}']`
        else if (chosen.attributes && chosen.attributes['placeholder']) selector = `${chosen.tag}[placeholder='${chosen.attributes['placeholder']}']`
        else if (chosen.title) selector = `${chosen.tag}[title='${chosen.title}']`
        else if (chosen.attributes && chosen.attributes['alt']) selector = `${chosen.tag}[alt='${chosen.attributes['alt']}']`
        else if (chosen.text) selector = `${chosen.tag}:has-text(\"${chosen.text}\")`
        else selector = `${chosen.tag}:nth-child(${idx + 1})`
        console.log(`👉 Selector chosen by LLM (index ${idx}):`, selector)
        return { selector, index: idx }
      }
    }
    return null
  }

  async processCommand(
    command: string, 
    sessionId: string, 
    browserService: BrowserService
  ): Promise<AIResponse> {
    try {
      await this.initialize()
      console.log(`🧠 Processing command: "${command}" for session ${sessionId}`)
      const pageAnalysis = await browserService.analyzePage(sessionId)
      // Log the user command and page analysis for traceability
      console.log('📝 [Prompt Input] User command:', command)
      console.log('📝 [Prompt Input] Page analysis:', JSON.stringify(pageAnalysis, null, 2))
      const actionPlan = await this.generateActionPlan(
        command, 
        pageAnalysis
      )
      // Log the action plan output
      console.log('📝 [Prompt Output] Action plan:', JSON.stringify(actionPlan, null, 2))
      // Enrich actions with actual element text/label from candidate list
      const candidates = await browserService.getCandidateElements(sessionId);
      for (const action of actionPlan.actions) {
        if (action.selector) {
          // Try to find the best match by selector
          let match = candidates.find(c => (c as any).selector === action.selector);
          // If not found, try by text match as fallback
          if (!match && (action.text ?? '').length > 0) {
            match = candidates.find(c => c.text && c.text.toLowerCase() === (action.text ?? '').toLowerCase());
          }
          // If not found, try by contains text
          if (!match && (action.text ?? '').length > 0) {
            match = candidates.find(c => c.text && c.text.toLowerCase().includes((action.text ?? '').toLowerCase()));
          }
          // If not found, try by robust text selector
          if (!match && action.selector && action.selector.includes(':has-text')) {
            const textMatch = action.selector.match(/:has-text\(\\?"(.+?)\\?"\)/);
            if (textMatch && textMatch[1]) {
              match = candidates.find(c => c.text && c.text.includes(textMatch[1]));
            }
          }
          if (match) {
            action.text = match.text;
            (action as any).ariaLabel = match.ariaLabel;
            (action as any).title = match.title;
            (action as any).dataTestid = match.dataTestid;
            (action as any).elementType = (match as any).type ?? undefined;
            (action as any).visible = match.visible;
            (action as any).clickable = (match as any).clickable ?? undefined;
            (action as any).role = (match as any).role ?? undefined;
            action.selector = getRobustSelector(match);
            // Log the enriched action and matched element
            console.log('📝 [Action Enriched] Action:', action);
            console.log('📝 [Action Enriched] Matched element:', match);
          } else {
            console.log('⚠️ [Action Enriched] No candidate match found for selector:', action.selector);
          }
        }
      }
      const executedActions: DemoAction[] = []
      for (const action of actionPlan.actions) {
        try {
          let actionToRun = { ...action }
          if ((action.type === 'click' || action.type === 'type') && !action.selector) {
            const candidates = await browserService.getCandidateElements(sessionId)
            console.log('🧩 Running element selection for action:', action)
            // Log all candidate texts for debugging
            console.log('🔍 All candidate texts:', candidates.map(c => c.text))
            const chosen = await this.selectElementByPrompt(command, candidates, this.openai)
            if (chosen && chosen.selector) {
              actionToRun.selector = chosen.selector
              try {
                console.log('🖱️ Trying selector:', chosen.selector)
                const executedAction = await browserService.executeAction(sessionId, actionToRun)
                executedActions.push(executedAction)
                continue
              } catch (err) {
                console.warn('⚠️ First selector failed, trying fallback if available.', err)
                const fallbackIndices = Array.from([...(chosen.index !== undefined ? [chosen.index] : []), ...Array.from(Array(30).keys()).filter(i => i !== chosen.index)])
                for (const idx of fallbackIndices) {
                  if (idx === chosen.index) continue
                  const fallback = candidates[idx]
                  if (!fallback) continue
                  let fallbackSelector = ''
                  if (fallback.dataTestid) fallbackSelector = `[data-testid='${fallback.dataTestid}']`
                  else if (fallback.ariaLabel) fallbackSelector = `[aria-label='${fallback.ariaLabel}']`
                  else if (fallback.attributes && fallback.attributes['placeholder']) fallbackSelector = `${fallback.tag}[placeholder='${fallback.attributes['placeholder']}']`
                  else if (fallback.title) fallbackSelector = `${fallback.tag}[title='${fallback.title}']`
                  else if (fallback.attributes && fallback.attributes['alt']) fallbackSelector = `${fallback.tag}[alt='${fallback.attributes['alt']}']`
                  else if (fallback.text) fallbackSelector = `${fallback.tag}:has-text(\"${fallback.text}\")`
                  else fallbackSelector = `${fallback.tag}:nth-child(${idx + 1})`
                  actionToRun.selector = fallbackSelector
                  try {
                    console.log('🖱️ Trying fallback selector:', fallbackSelector)
                    const executedAction = await browserService.executeAction(sessionId, actionToRun)
                    executedActions.push(executedAction)
                    break
                  } catch (err2) {
                    console.warn('⚠️ Fallback selector also failed:', fallbackSelector, err2)
                    continue
                  }
                }
                continue
              }
            } else {
              console.error('❌ No suitable element found for action', action)
              throw new Error('No suitable element found for action')
            }
          }
          const executedAction = await browserService.executeAction(sessionId, actionToRun)
          executedActions.push(executedAction)
        } catch (error) {
          console.error(`Failed to execute action ${action.type}:`, error)
          executedActions.push({
            ...action,
            success: false,
            timestamp: new Date()
          })
        }
      }
      const explanation = await this.generateExplanation(
        command, 
        executedActions, 
        pageAnalysis
      )
      // Log the explanation output
      console.log('📝 [Prompt Output] Explanation:', explanation)
      return {
        id: uuidv4(),
        explanation,
        actions: executedActions
      }
    } catch (error) {
      console.error('Error processing command:', error)
      throw new Error(`Failed to process command: ${error}`)
    }
  }

  private async generateActionPlan(
    command: string, 
    pageAnalysis: any
  ): Promise<{ actions: DemoAction[] }> {
    
    const prompt = `
You are an AI assistant that helps navigate websites. Given a user command and page analysis, generate a list of specific actions to execute.

User Command: "${command}"

Current Page Analysis:
- Domain: ${pageAnalysis.domain}
- Title: ${pageAnalysis.title}
- Category: ${pageAnalysis.category}
- Available Elements: ${JSON.stringify(pageAnalysis.actionableElements.slice(0, 10))}
- Key Features: ${pageAnalysis.keyFeatures.join(', ')}

Instructions:
1. Break down the user command into specific, actionable steps
2. Map each step to available page elements
3. Return a JSON array of actions with this structure:
   {
     "actions": [
       {
         "id": "unique-id",
         "type": "click|type|navigate|scroll|hover|wait",
         "selector": "css-selector-or-null",
         "text": "text-to-type-or-null",
         "url": "url-to-navigate-or-null",
         "coordinates": {"x": 0, "y": 0} or null,
         "description": "human-readable description of what this action does",
         "success": false,
         "timestamp": "will-be-set-by-system"
       }
     ]
   }

4. Be specific with selectors - use the exact selectors from the page analysis
5. If you can't find a specific element, use smart fallback strategies
6. Keep actions simple and atomic
7. Add wait actions between complex interactions

Return only the JSON, no additional text.
`

    // Log the prompt input
    console.log('📝 [Prompt Input] Action plan LLM prompt:', prompt.slice(0, 2000))
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert web automation assistant. Return only valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })

      const content = response.choices[0].message.content
      // Log the prompt output
      console.log('📝 [Prompt Output] Action plan LLM output:', content)
      if (!content) {
        throw new Error('No response from AI')
      }

      const parsed = JSON.parse(content)
      
      // Add IDs and timestamps to actions
      const actions: DemoAction[] = parsed.actions.map((action: any) => ({
        ...action,
        id: uuidv4(),
        timestamp: new Date(),
        success: false
      }))

      return { actions }
      
    } catch (error) {
      console.error('Error generating action plan:', error)
      
      // Fallback: create a simple action based on command
      const fallbackAction: DemoAction = {
        id: uuidv4(),
        type: 'wait',
        description: `Attempted to process: ${command}`,
        success: false,
        timestamp: new Date()
      }
      
      return { actions: [fallbackAction] }
    }
  }

  private async generateExplanation(
    command: string, 
    actions: DemoAction[], 
    pageAnalysis: any
  ): Promise<string> {
    
    const prompt = `
You are an AI demo agent giving a live product demonstration. 

User asked: "${command}"

Actions performed:
${actions.map(action => `- ${action.description} (${action.success ? 'SUCCESS' : 'FAILED'})`).join('\n')}

Current page: ${pageAnalysis.title} (${pageAnalysis.domain})

Generate a natural, conversational response that:
1. Explains what you just did in response to their command
2. Describes what they can see on the screen now
3. Suggests what they might want to do next
4. Sounds like a friendly sales person giving a demo

Keep it concise (2-3 sentences max) and engaging. Use "I" statements like "I clicked on..." or "I navigated to..."

If any actions failed, acknowledge it briefly and suggest alternatives.
`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly AI demo agent. Speak naturally and conversationally.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })

      const content = response.choices[0].message.content
      return content || `I processed your request to "${command}". Let me know what else you'd like to see!`
      
    } catch (error) {
      console.error('Error generating explanation:', error)
      return `I tried to ${command.toLowerCase()}. Let me know if you'd like to try something else!`
    }
  }

  private async loadTrainingData(domain: string): Promise<WebsiteTrainingData | null> {
    try {
      // Check cache first
      if (this.trainingDataCache.has(domain)) {
        return this.trainingDataCache.get(domain)!
      }
      
      // Try to load from file
      const trainingDataPath = path.join(process.cwd(), 'training-data', `${domain}.json`)
      
      if (fs.existsSync(trainingDataPath)) {
        const data = fs.readFileSync(trainingDataPath, 'utf-8')
        const trainingData: WebsiteTrainingData = JSON.parse(data)
        
        // Cache the data
        this.trainingDataCache.set(domain, trainingData)
        
        console.log(`📚 Loaded training data for ${domain}`)
        return trainingData
      }
      
      console.log(`📚 No training data found for ${domain}`)
      return null
      
    } catch (error) {
      console.error('Error loading training data:', error)
      return null
    }
  }

  async generateSmartSelector(
    sessionId: string, 
    description: string, 
    browserService: BrowserService
  ): Promise<string | null> {
    try {
      const pageAnalysis = await browserService.analyzePage(sessionId)
      
      const prompt = `
Given this page analysis and user description, find the best CSS selector:

User wants to interact with: "${description}"

Available elements:
${JSON.stringify(pageAnalysis.actionableElements.slice(0, 15), null, 2)}

Return only the CSS selector string that best matches the user's description.
If no good match is found, return null.
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at CSS selectors. Return only the selector string or null.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })

      const content = response.choices[0].message.content?.trim()
      return content === 'null' ? null : content || null
      
    } catch (error) {
      console.error('Error generating smart selector:', error)
      return null
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && !!process.env.OPENAI_API_KEY
  }
} 

// Helper function to prefer robust selectors
function getRobustSelector(candidate: any): string {
  if (candidate.dataTestid) return `[data-testid='${candidate.dataTestid}']`;
  if (candidate.ariaLabel) return `[aria-label='${candidate.ariaLabel}']`;
  if (candidate.title) return `${candidate.tag}[title='${candidate.title}']`;
  if (candidate.text) return `${candidate.tag}:has-text(\"${candidate.text}\")`;
  return (candidate as any).selector ?? '';
} 