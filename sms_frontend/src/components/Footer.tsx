import brandLogo from '@/assets/brand/rynatyschool-logo.png'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#070b12]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        <p className="text-[11px] text-slate-500">
          &copy; {year}{' '}
          <span className="font-semibold text-slate-400">RynatySpace Technologies Ltd.</span>
          {' '}All rights reserved.
        </p>

        <img
          src={brandLogo}
          alt="RynatySchool SmartCampus"
          className="h-9 w-auto opacity-90 transition-opacity duration-300 hover:opacity-100 sm:h-11"
          style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }}
        />
      </div>
    </footer>
  )
}
