# TGE Calendar 🗓️

A modern, responsive React web application for tracking **Token Generation Events (TGEs)** in real-time. Built for crypto enthusiasts, traders, and developers who need to stay ahead of the latest token launches and blockchain events.

![TGE Calendar Preview](https://via.placeholder.com/800x400/1a1a2e/00d4ff?text=TGE+Calendar+Preview)

## 🌟 Key Features

### 📅 Interactive Calendar
- **Full-screen calendar view** with month, week, day, and year perspectives
- **Real-time event visualization** with color-coded event markers
- **Responsive design** optimized for desktop and mobile devices
- **Smooth animations** powered by Framer Motion

### 🔍 Advanced Filtering & Search
- **Real-time search** across event names, tokens, and blockchains
- **Date range filtering** with intuitive calendar picker
- **Category and credibility filters** (verified, unverified, rumor)
- **Live filter badges** showing active criteria

### 📊 Data Insights
- **Live statistics dashboard** showing event counts and trends
- **Top blockchain analysis** by event volume
- **Weekly event forecasting** and predictions
- **Market correlation indicators**

### 🔗 Polymarket Integration
- **Automatic prediction market linking** for major TGE events
- **Direct access to prediction markets** via integrated buttons
- **Market sentiment indicators** where available

### 💾 Smart Caching
- **Local storage persistence** for offline viewing
- **API rate limit handling** with intelligent retry logic
- **Background polling** every 5 minutes for fresh data
- **Error recovery** with cached data fallback

## 🚀 Technology Stack

### Frontend Framework
- **React 19** with TypeScript for type safety
- **Vite** for lightning-fast development and building
- **React Router** for client-side routing

### UI & Styling
- **Shadcn UI** components with Radix UI primitives
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Lucide React** for consistent iconography

### State Management & Data
- **TanStack Query (React Query)** for server state management
- **Axios** for robust API communication
- **Zod** for runtime type validation
- **date-fns** for date manipulation

### Development & Quality
- **ESLint** with TypeScript support for code quality
- **Vitest** for fast unit testing
- **Testing Library** for component testing
- **Playwright** for E2E testing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm 8+** or **yarn 1.22+**
- **Git** for version control

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tarnn/tge-calendar.git
   cd tge-calendar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

   Add your API credentials to `.env.local`:
   ```env
   VITE_COINMARKETCAL_API_KEY=your_api_key_here
   VITE_COINMARKETCAL_API_BASE_URL=https://developers.coinmarketcal.com
   ```

   > **Note**: Get your CoinMarketCal API key from [their developer portal](https://coinmarketcal.com/en/apikey).

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:5173` to see the application.

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn UI components
│   ├── layout/          # Layout components (header, shell, etc.)
│   └── providers/       # React context providers
├── features/            # Feature-based modules
│   └── calendar/        # Main calendar feature
│       ├── api/         # API integration layer
│       ├── components/  # Feature-specific components
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # Utility functions
│       ├── types/       # TypeScript type definitions
│       └── tests/       # Feature-specific tests
├── config/              # Application configuration
├── hooks/               # Shared custom hooks
└── lib/                 # Shared utilities
```

## 🔌 API Integration

### CoinMarketCal API
- **Endpoint**: `https://developers.coinmarketcal.com/v1/events`
- **Authentication**: API key via header
- **Rate Limits**: Handled with automatic retries and caching
- **Data**: Real-time TGE events with metadata

### Polymarket API
- **Endpoint**: `https://api.polymarket.com/markets`
- **Integration**: Client-side filtering by event keywords
- **Fallback**: Graceful degradation when markets unavailable

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (when implemented)
npm run test:e2e
```

## 📱 Responsive Design

The application is fully responsive and optimized for:

- **Desktop** (1024px+): Full feature set with sidebar
- **Tablet** (768px - 1023px): Condensed layout with collapsible navigation
- **Mobile** (320px - 767px): Touch-optimized interface with bottom navigation

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Add environment variables** in Vercel dashboard:
   - `VITE_COINMARKETCAL_API_KEY`
   - `VITE_COINMARKETCAL_API_BASE_URL`
3. **Deploy automatically** on every push to main

### Manual Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run test suite
npm run type-check   # Run TypeScript type checking
```

### Code Quality

- **ESLint** for JavaScript/TypeScript linting
- **TypeScript** for static type checking
- **Prettier** for code formatting (via ESLint)
- **Husky** for pre-commit hooks (planned)

### Performance Optimizations

- **Vite** for fast HMR and optimized builds
- **Tree shaking** for minimal bundle sizes
- **Code splitting** with lazy loading
- **Image optimization** with modern formats
- **Caching strategies** for API responses

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `npm test`
5. **Submit a pull request** with a clear description

### Code Standards

- **TypeScript** for all new code
- **ESLint** rules must pass
- **Tests** required for new features
- **Semantic commit messages** preferred

## 📊 Performance Metrics

**Current benchmarks** (as per PRD requirements):

- **Load time**: <2 seconds initial load
- **API response**: <500ms for cached requests
- **Bundle size**: <200KB gzipped
- **Lighthouse score**: >90 on all metrics

## 🔒 Security

- **API keys** stored securely in environment variables
- **CORS** properly configured for production
- **Input validation** with Zod schemas
- **Rate limiting** handled gracefully
- **No sensitive data** in client-side storage

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Basic calendar implementation
- ✅ CoinMarketCal API integration
- ✅ Responsive design
- ✅ Search and filtering

### Phase 2 (Next)
- 🔄 Advanced analytics dashboard
- 🔄 Push notifications for new events
- 🔄 Event export functionality (iCal/CSV)
- 🔄 User preferences and customization

### Phase 3 (Future)
- 🔄 Multi-calendar support
- 🔄 Social features and sharing
- 🔄 Advanced prediction market analytics
- 🔄 Mobile app companion

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CoinMarketCal** for providing comprehensive crypto event data
- **Polymarket** for prediction market integration
- **Shadcn** for beautiful, accessible UI components
- **Vercel** for seamless deployment platform

## 📞 Support

For support, email hello@tge-calendar.com or join our [Discord community](https://discord.gg/tge-calendar).

---

**Built with ❤️ for the crypto community**
