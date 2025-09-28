export function Hero(): JSX.Element {
  return (
    <div className="text-center space-y-6">
      {/* Badge like donate.gg */}
      <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200">
        <span className="text-sm font-medium text-pink-700">
          ✨ Live Token Generation Events
        </span>
      </div>

      {/* Large heading like Uniswap */}
      <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
        Track TGEs{" "}
        <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          anytime,
        </span>
        <br />
        <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          anywhere.
        </span>
      </h1>
      
      <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Stay ahead of the market with real-time token generation events across all major blockchains.
      </p>
    </div>
  )
}