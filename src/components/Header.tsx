export function Header(): JSX.Element {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo - white text on gradient background */}
          <div className="flex items-center space-x-3">
            <img 
              src="/crypto-calendar.png" 
              alt="TGE Calendar" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-xl font-bold text-white">
              TGE Calendar
            </span>
          </div>

          {/* Simple nav - white text */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-white/80 hover:text-white font-medium transition-colors">
              Calendar
            </a>
            <a href="#" className="text-white/80 hover:text-white font-medium transition-colors">
              Analytics
            </a>
          </nav>

          {/* X Profile - white */}
          <a 
            href="https://x.com/Tarn__K" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}