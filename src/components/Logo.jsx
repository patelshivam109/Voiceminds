// src/components/Logo.jsx
import logo from '../assets/logo.png'

export default function Logo({ size = 32 }) {
  return (
    <div className="flex items-center gap-2">
      <img 
        src={logo} 
        width={size} 
        height={size} 
        alt="VoiceMind" 
        className="rounded-xl" 
      />
      <span className="font-semibold tracking-tight hidden sm:inline">VoiceMind</span>
    </div>
  )
}