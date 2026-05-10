import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { useLanguage } from '../context/useLanguage'
import './ActivityLineChart.css'

function ActivityLineChart({ data = [] }) {
  const { language } = useLanguage()

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    const maxXP = Math.max(...data.map(d => d.xp), 1)
    const padding = 50 
    const width = 1000 - (padding * 2)

    return data.map((d, index) => {
      const x = padding + (index / (data.length - 1)) * width
      return {
        x,
        y: 100 - (d.xp / maxXP) * 100,
        xp: d.xp,
        label: new Date(d.dia).toLocaleDateString(language === 'en' ? 'en-US' : 'es-CO', { weekday: 'short' }),
        rawDate: d.dia,
        percentX: (x / 1000) * 100
      }
    })
  }, [data, language])

  const createSmoothPath = (points) => {
    if (points.length < 2) return ''
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const cp1x = p0.x + (p1.x - p0.x) / 2
      const cp2x = p0.x + (p1.x - p0.x) / 2
      path += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return path
  }

  const pathD = useMemo(() => createSmoothPath(chartData), [chartData])
  const areaD = useMemo(() => {
    if (chartData.length < 2) return ''
    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    return `${pathD} L ${last.x} 130 L ${first.x} 130 Z`
  }, [pathD, chartData])

  if (chartData.length < 2) return null

  return (
    <div className="activity-line-chart">
      <div className="chart-svg-container">
        <svg viewBox="0 0 1000 130" preserveAspectRatio="none" className="chart-svg">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cq-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--cq-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <path d={areaD} fill="url(#chartGradient)" className="chart-area" />
          <path d={pathD} fill="none" stroke="var(--cq-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
          
          {chartData.map((point, i) => (
            <circle 
              key={i} 
              cx={point.x} 
              cy={point.y} 
              r="4.5" 
              fill="var(--cq-bg-soft)" 
              stroke="var(--cq-primary)" 
              strokeWidth="2.5"
              className="chart-point"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      
      <div className="chart-labels-absolute">
        {chartData.map((point, i) => (
          <div 
            key={i} 
            className="chart-label-col" 
            style={{ 
              position: 'absolute', 
              left: `${point.percentX}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <span className="chart-label-text">{point.label}</span>
            <span className="chart-label-xp">{point.xp}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

ActivityLineChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    dia: PropTypes.string.isRequired,
    xp: PropTypes.number.isRequired
  }))
}

export default ActivityLineChart
