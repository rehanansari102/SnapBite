export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-orange-500 flex-col items-center justify-center p-12 overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-400 opacity-50 animate-blob animate-spin-slow" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] bg-orange-600 opacity-40 animate-blob delay-300" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-yellow-400 opacity-20 rounded-full animate-blob delay-500" />

        <div className="relative z-10 text-center text-white max-w-sm">
          {/* Floating emoji */}
          <div className="text-6xl mb-6 animate-float inline-block">🍔</div>

          <h1 className="text-4xl font-extrabold mb-4 leading-tight animate-slide-in-left delay-100">
            Great food,<br />delivered fast.
          </h1>
          <p className="text-orange-100 text-lg leading-relaxed animate-slide-in-left delay-200">
            Hundreds of restaurants, thousands of dishes — right at your fingertips.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              { icon: '⚡', text: 'Lightning-fast delivery', delay: 'delay-300' },
              { icon: '🍽️', text: 'Curated local restaurants', delay: 'delay-400' },
              { icon: '🔒', text: 'Safe & secure checkout', delay: 'delay-500' },
            ].map(({ icon, text, delay }) => (
              <div
                key={text}
                className={`flex items-center gap-3 text-left bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors duration-200 animate-slide-in-left ${delay}`}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-white font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 animate-fade-in">
            <span className="text-3xl animate-float inline-block">🍔</span>
            <span className="text-2xl font-extrabold text-orange-500">SnapBite</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
