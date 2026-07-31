import { Eye } from 'lucide-react'

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-90"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        }}
      />
      <div className="relative">
        <Eye size={size * 0.55} className="text-white" strokeWidth={2.5} />
      </div>
    </div>
  )
}
