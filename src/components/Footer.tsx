export function Footer(): JSX.Element {
  return (
    <footer className="mt-20 py-12 border-t border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <img 
              src="/crypto-calendar.png" 
              alt="TGE Calendar" 
              className="w-6 h-6 rounded-md"
            />
            <span className="font-semibold text-gray-700">
              TGE Calendar
            </span>
          </div>

          {/* Simple footer like Uniswap */}
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-500">
              © 2025 Built for the crypto community
            </span>
            <a 
              href="https://x.com/Tarn__K" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
