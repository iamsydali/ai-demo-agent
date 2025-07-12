import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { DemoAction, PageElement, SiteAnalysis } from '../../types'
import { v4 as uuidv4 } from 'uuid'

interface BrowserSession {
  sessionId: string
  browser: Browser
  page: Page
  context: BrowserContext
  website: string
  isActive: boolean
}

export class BrowserService {
  private sessions: Map<string, BrowserSession> = new Map()
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return
    console.log('🌐 Initializing Browser Service...')
    this.isInitialized = true
  }

  async startDemo(sessionId: string, website: string): Promise<void> {
    try {
      await this.initialize()
      
      console.log(`🚀 Starting demo for ${website} (session: ${sessionId})`)
      
      // Launch browser
      const browser = await chromium.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,720'
        ]
      })
      
      // Create context
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      
      // Create page
      const page = await context.newPage()
      
      // Navigate to website
      const url = website.startsWith('http') ? website : `https://${website}`
      await page.goto(url, { waitUntil: 'networkidle' })
      
      // Store session
      this.sessions.set(sessionId, {
        sessionId,
        browser,
        page,
        context,
        website,
        isActive: true
      })
      
      console.log(`✅ Demo started for ${website}`)
      
    } catch (error) {
      console.error('Error starting demo:', error)
      throw new Error(`Failed to start demo for ${website}: ${error}`)
    }
  }

  // --- Provide candidate elements for a session (no LLM call here) ---
  async getCandidateElements(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session || !session.isActive) {
      throw new Error(`Session ${sessionId} not found or inactive`)
    }
    const { page } = session
    // Extract all visible/interactable elements, with all attributes and outerHTML for debugging
    const candidates = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => {
          const htmlEl = el as HTMLElement;
          // Only visible and interactable
          return !!(htmlEl.offsetWidth || htmlEl.offsetHeight || htmlEl.getClientRects().length) &&
                 (el.hasAttribute('onclick') || el.hasAttribute('tabindex') || el.getAttribute('role') === 'button' || el.tagName === 'BUTTON' || el.tagName === 'A');
        })
        .map((el, idx) => {
          const htmlEl = el as HTMLElement;
          const parent = el.parentElement;
          const rect = htmlEl.getBoundingClientRect();
          const attrs: Record<string, string> = {};
          for (const attr of el.getAttributeNames()) {
            attrs[attr] = el.getAttribute(attr) || '';
          }
          return {
            index: idx,
            tag: el.tagName,
            text: htmlEl.innerText,
            ariaLabel: el.getAttribute('aria-label'),
            title: el.getAttribute('title'),
            dataTestid: el.getAttribute('data-testid'),
            enabled: !el.hasAttribute('disabled'),
            visible: !!(htmlEl.offsetWidth || htmlEl.offsetHeight || htmlEl.getClientRects().length),
            parentText: parent ? (parent as HTMLElement).innerText : undefined,
            className: htmlEl.className,
            id: htmlEl.id,
            boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            attributes: attrs,
            outerHTML: htmlEl.outerHTML.slice(0, 500) // for debugging, limit length
          };
        });
    });
    // Extra logging for debugging
    console.log(`🔍 Extracted ${candidates.length} candidate elements. Example:`, candidates[0]);
    return candidates;
  }

  // --- executeAction: Only acts on provided selector/coordinates ---
  async executeAction(sessionId: string, action: DemoAction): Promise<DemoAction> {
    const session = this.sessions.get(sessionId)
    if (!session || !session.isActive) {
      throw new Error(`Session ${sessionId} not found or inactive`)
    }

    const { page } = session
    const updatedAction = { ...action, timestamp: new Date() }

    try {
      switch (action.type) {
        case 'click':
          if (action.selector) {
            await page.click(action.selector, { timeout: 10000 })
          } else if (action.coordinates) {
            await page.mouse.click(action.coordinates.x, action.coordinates.y)
          } else {
            throw new Error('No selector or coordinates provided for click action')
          }
          break

        case 'type':
          if (action.selector && action.text) {
            await page.fill(action.selector, action.text)
          } else {
            throw new Error('No selector or text provided for type action')
          }
          break

        case 'navigate':
          if (action.url) {
            await page.goto(action.url, { waitUntil: 'networkidle' })
          }
          break

        case 'scroll':
          if (action.coordinates) {
            await page.evaluate(({ x, y }) => {
              window.scrollTo(x, y)
            }, action.coordinates)
          } else {
            await page.evaluate(() => {
              window.scrollBy(0, 500)
            })
          }
          break

        case 'hover':
          if (action.selector) {
            await page.hover(action.selector)
          }
          break

        case 'wait':
          await page.waitForTimeout(2000)
          break

        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      updatedAction.success = true
      console.log(`✅ Action executed: ${action.type}`)
      
    } catch (error) {
      updatedAction.success = false
      console.error(`❌ Action failed: ${action.type}`, error)
      throw error
    }

    return updatedAction
  }

  async analyzePage(sessionId: string): Promise<SiteAnalysis> {
    const session = this.sessions.get(sessionId)
    if (!session || !session.isActive) {
      throw new Error(`Session ${sessionId} not found or inactive`)
    }

    const { page } = session

    try {
      // Get page information
      const title = await page.title()
      const url = page.url()
      const domain = new URL(url).hostname

      // Get page elements
      const elements = await page.evaluate(() => {
        const elements: PageElement[] = []
        
        // Get all interactive elements
        const selectors = [
          'button',
          'a',
          'input',
          'select',
          'textarea',
          '[role="button"]',
          '[onclick]',
          '[href]'
        ]
        
        selectors.forEach(selector => {
          const els = document.querySelectorAll(selector)
          els.forEach((el, index) => {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
              elements.push({
                selector: `${selector}:nth-child(${index + 1})`,
                text: el.textContent?.trim().slice(0, 50) || '',
                type: el.tagName.toLowerCase(),
                visible: rect.top >= 0 && rect.left >= 0,
                clickable: true,
                ariaLabel: el.getAttribute('aria-label') || undefined,
                role: el.getAttribute('role') || undefined
              })
            }
          })
        })
        
        return elements.slice(0, 20) // Limit to 20 elements
      })

      // Categorize elements
      const mainElements = elements.filter(el => 
        el.type === 'button' || el.role === 'button' || el.type === 'a'
      )
      
      const navigationElements = elements.filter(el => 
        el.text.toLowerCase().includes('nav') || 
        el.text.toLowerCase().includes('menu') ||
        el.role === 'navigation'
      )
      
      const actionableElements = elements.filter(el => 
        el.clickable && el.visible
      )

      // Determine category
      let category = 'general'
      if (domain.includes('github')) category = 'development'
      else if (domain.includes('shopify')) category = 'ecommerce'
      else if (domain.includes('twitter') || domain.includes('x.com')) category = 'social'
      else if (domain.includes('linkedin')) category = 'professional'

      // Extract key features
      const keyFeatures = mainElements
        .map(el => el.text)
        .filter(text => text.length > 0)
        .slice(0, 5)

      return {
        domain,
        title,
        category,
        mainElements,
        navigationElements,
        actionableElements,
        keyFeatures
      }

    } catch (error) {
      console.error('Error analyzing page:', error)
      throw new Error(`Failed to analyze page: ${error}`)
    }
  }

  async findButton(sessionId: string, description: string): Promise<PageElement | null> {
    const session = this.sessions.get(sessionId)
    if (!session || !session.isActive) {
      throw new Error(`Session ${sessionId} not found or inactive`)
    }

    const { page } = session

    try {
      // Try different strategies to find the button
      const strategies = [
        // 1. Exact text match
        `button:has-text("${description}")`,
        `[role="button"]:has-text("${description}")`,
        
        // 2. Contains text
        `button:text-is("${description}")`,
        `[role="button"]:text-is("${description}")`,
        
        // 3. Aria label
        `button[aria-label*="${description}"]`,
        `[role="button"][aria-label*="${description}"]`,
        
        // 4. Partial text match
        `button:has-text("${description.split(' ')[0]}")`,
        
        // 5. Class name or ID
        `button[class*="${description.toLowerCase()}"]`,
        `[id*="${description.toLowerCase()}"]`
      ]

      for (const selector of strategies) {
        try {
          const element = await page.locator(selector).first()
          if (await element.isVisible()) {
            const text = await element.textContent()
            const ariaLabel = await element.getAttribute('aria-label')
            
            return {
              selector,
              text: text?.trim() || '',
              type: 'button',
              visible: true,
              clickable: true,
              ariaLabel: ariaLabel || undefined
            }
          }
        } catch (e) {
          // Continue to next strategy
        }
      }

      return null
    } catch (error) {
      console.error('Error finding button:', error)
      return null
    }
  }

  async endDemo(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`Session ${sessionId} not found`)
      return
    }

    try {
      console.log(`🛑 Ending demo for session ${sessionId}`)
      
      await session.context.close()
      await session.browser.close()
      
      session.isActive = false
      this.sessions.delete(sessionId)
      
      console.log(`✅ Demo ended for session ${sessionId}`)
      
    } catch (error) {
      console.error('Error ending demo:', error)
      throw new Error(`Failed to end demo: ${error}`)
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser sessions...')
    
    const sessionIds = Array.from(this.sessions.keys())
    for (const sessionId of sessionIds) {
      try {
        await this.endDemo(sessionId)
      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error)
      }
    }
    
    this.sessions.clear()
    console.log('✅ Browser cleanup complete')
  }

  isHealthy(): boolean {
    return this.isInitialized
  }

  getActiveSessionCount(): number {
    return Array.from(this.sessions.values()).filter(s => s.isActive).length
  }
} 