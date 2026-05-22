import PropTypes from 'prop-types'
import { countryFlagUrl } from '../utils/countries'

function CountryFlag({ code, label, size = 20 }) {
  const flagUrl = countryFlagUrl(code)

  if (!flagUrl) {
    return null
  }

  return (
    <img
      src={flagUrl}
      alt={`Bandera de ${label}`}
      loading="lazy"
      width={size}
      height={Math.round(size * 0.75)}
      style={{
        width: `${size}px`,
        height: `${Math.round(size * 0.75)}px`,
        objectFit: 'cover',
        borderRadius: '4px',
        boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.35)',
        flexShrink: 0,
      }}
    />
  )
}

CountryFlag.propTypes = {
  code: PropTypes.string,
  label: PropTypes.string,
  size: PropTypes.number,
}

export default CountryFlag
