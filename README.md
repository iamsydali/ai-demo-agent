# 🤖 AI Demo Agent

A voice-powered AI agent that conducts live product demonstrations autonomously. Just like a human sales representative, but available 24/7.

## ✨ Features

- **🎤 Voice-Controlled**: Real-time speech-to-text and text-to-speech
- **🌐 Universal**: Works with any website - no hardcoded logic
- **🧠 AI-Powered**: Uses GPT-4 for understanding and OpenAI Whisper for voice
- **📱 Real-time**: Live browser automation with Playwright
- **📊 Session Recording**: Full transcripts and action logs
- **🔄 Scalable**: Add new websites via JSON training data

## 🎯 Use Cases

- **Sales Teams**: 24/7 automated product demos
- **Founders**: Self-service demo experiences  
- **Support Teams**: Interactive product walkthroughs
- **Marketing**: Engaging prospect experiences

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER EXPERIENCE                          │
│  Control Panel (Next.js)    ←→    Demo Window (Playwright) │
│  • Voice commands            │    • Live website control   │
│  • Session tracking          │    • Real-time automation   │
│  • Recording & transcripts   │    • Dynamic navigation     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                         │
│  • Voice Service (OpenAI Whisper/TTS)                      │
│  • AI Orchestrator (GPT-4)                                 │
│  • Browser Service (Playwright)                            │
│  • Session Manager (File-based)                            │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   TRAINING DATA                             │
│  • Website-specific JSON files                             │
│  • No backend logic changes needed                         │
│  • Easy to add new websites                                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Chrome browser (for Playwright)

### Installation

1. **Clone and install dependencies**
```bash
git clone <your-repo>
npm install
```

2. **Install Playwright browsers**
```bash
npx playwright install chromium
```

3. **Set up environment variables**
```bash
# Create .env file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
echo "SERVER_URL=http://localhost:3001" >> .env
echo "FRONTEND_URL=http://localhost:3000" >> .env
```

4. **Start the development servers**
```bash
# Terminal 1: Start the backend
npm run dev:server

# Terminal 2: Start the frontend
npm run dev
```

5. **Open your browser**
```
http://localhost:3000
```

## 🎮 Usage

### Basic Demo Flow

1. **Select a website** (e.g., x.com, github.com)
2. **Click "Start Demo"** - AI opens controlled browser
3. **Give voice commands**:
   - "Show me how to create a post"
   - "Navigate to the settings page"
   - "Click the sign up button"
4. **Watch the magic** - AI explains and demonstrates live
5. **Download transcript** when done

### Example Voice Commands

```
🎤 "Show me the dashboard"
🎤 "How do I create a new post?"
🎤 "Click the settings button"
🎤 "What features are available here?"
🎤 "Navigate to the user profile"
🎤 "Scroll down to see more content"
```

## 🧠 How It Works

### 1. Voice Processing
- **Speech-to-Text**: Browser Web Speech API + OpenAI Whisper fallback
- **Text-to-Speech**: OpenAI TTS for natural AI responses
- **Real-time**: Commands processed instantly

### 2. AI Understanding
- **Command Analysis**: GPT-4 interprets user intent
- **Page Analysis**: Real-time DOM scanning
- **Action Planning**: AI generates step-by-step automation
- **Smart Fallbacks**: Multiple strategies to find elements

### 3. Browser Automation
- **Playwright Control**: Real browser window (not headless)
- **Cross-Platform**: Works on Windows, Mac, Linux
- **Element Finding**: Multiple selector strategies
- **Error Recovery**: Graceful handling of failures

### 4. Training Data
- **JSON-Based**: Website knowledge in simple files
- **No Code Changes**: Add websites without touching backend
- **Caching**: Smart loading and caching of training data

## 📁 Project Structure

```
ai-demo-agent/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main demo interface
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ControlPanel.tsx   # Demo controls
│   ├── VoiceInterface.tsx # Voice commands
│   ├── DemoStatus.tsx     # Session status
│   └── SessionRecorder.tsx # Recording tools
├── server/                # Backend services
│   ├── index.ts          # Main server
│   └── services/         # Core services
│       ├── AIOrchestrator.ts     # GPT-4 integration
│       ├── BrowserService.ts     # Playwright automation
│       ├── SessionManager.ts     # Session tracking
│       └── VoiceService.ts       # Audio processing
├── training-data/         # Website knowledge
│   ├── x.com.json        # Twitter/X training data
│   ├── github.com.json   # GitHub training data
│   └── ...               # Add more websites
├── types/                 # TypeScript definitions
│   ├── index.ts          # Core types
│   └── speech.d.ts       # Web Speech API types
└── lib/                   # Utilities
    └── socket.ts         # WebSocket client
```

## 🌐 Adding New Websites

To add support for a new website, simply create a training data file:

```json
// training-data/example.com.json
{
  "site": "example.com",
  "domain": "example.com", 
  "category": "productivity",
  "description": "Example productivity tool",
  "commonActions": {
    "create_task": {
      "selector": ".create-button",
      "description": "Create a new task",
      "steps": ["click create button", "fill form", "save"]
    }
  },
  "uiPatterns": {
    "main_navigation": "Top navigation bar",
    "content_area": "Main workspace"
  },
  "keyFeatures": [
    "Task management",
    "Project organization"
  ]
}
```

No code changes required! The AI will automatically use this data.

## 🔧 Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Browser Settings

The browser service launches with optimized settings:
- **Visible browser** (not headless) for live demos
- **1280x720 viewport** for consistent experience
- **Chrome user agent** for maximum compatibility

## 📊 Session Management

### Recording Features
- **Full transcripts** of voice conversations
- **Action logs** with success/failure tracking
- **Session exports** in JSON and text formats
- **Real-time statistics** and analytics

### File Structure
```
sessions/           # Session data
├── session-123.json
└── session-456.json

recordings/         # Audio files (optional)
├── session-123_user_timestamp.mp3
└── session-123_ai_timestamp.mp3
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy to Vercel, Netlify, etc.
```

### Backend (Railway/Render)
```bash
# Set environment variables
# Deploy server/ directory
npm run server
```

### Docker (Optional)
```dockerfile
# Dockerfile example
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000 3001
CMD ["npm", "start"]
```

## 🛠️ Development

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **AI**: OpenAI GPT-4, Whisper, TTS
- **Automation**: Playwright
- **Voice**: Web Speech API

### Scripts
```bash
npm run dev          # Start frontend
npm run dev:server   # Start backend with watch
npm run build        # Build for production
npm run lint         # Run ESLint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Adding Training Data
We welcome training data for new websites! Please follow the existing format in `training-data/` and test thoroughly.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4, Whisper, and TTS APIs
- **Playwright** for excellent browser automation
- **Next.js** for the amazing React framework
- **Vercel** for seamless deployment

## 🆘 Support

- 📚 **Documentation**: Check this README
- 🐛 **Issues**: Open GitHub issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: [your-email@example.com]

---

**Built with ❤️ for the future of automated demos** 