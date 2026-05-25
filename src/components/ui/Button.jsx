function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  compact = false,
  icon = null,
  children,
  ...props
}) {
  const classes = joinClasses(
    'btn',
    variant ? `btn--${variant}` : '',
    size ? `btn--${size}` : '',
    compact ? 'btn--compact' : '',
    className
  )

  return (
    <button type="button" className={classes} {...props}>
      {icon ? <span className="btn__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}

export default Button
