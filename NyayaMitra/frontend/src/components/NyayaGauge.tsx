// NyayaGauge — SVG arc gauge (Government light theme)
interface NyayaGaugeProps { score: number; size?: number; label?: string; sublabel?: string; color?: string }

export default function NyayaGauge({ score, size = 180, label, sublabel, color }: NyayaGaugeProps) {
  const radius = (size - 20) / 2
  const circumference = Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (color) return color
    if (score >= 75) return '#2E7D32'
    if (score >= 50) return '#FF9933'
    if (score >= 25) return '#fb923c'
    return '#D32F2F'
  }

  const scoreColor = getColor()
  const cx = size / 2, cy = size / 2
  const startX = cx - radius, startY = cy, endX = cx + radius, endY = cy

  return (
    <div id="nyaya-gauge" className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        <path d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`} fill="none" stroke="#E0E0E0" strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`} fill="none" stroke={scoreColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="gauge-arc" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={scoreColor} fontSize="38" fontWeight="900" fontFamily="Poppins, Inter, sans-serif">{score}</text>
        {label && <text x={cx} y={cy + 22} textAnchor="middle" fill="#6B7280" fontSize="14" fontWeight="500" fontFamily="Inter, sans-serif">{label}</text>}
        {sublabel && <text x={cx} y={cy + 38} textAnchor="middle" fill="#9CA3AF" fontSize="12" fontFamily="Inter, sans-serif">{sublabel}</text>}
      </svg>
    </div>
  )
}
