import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoAtOutline,
  IoArrowBack,
  IoCheckmarkCircle,
  IoCalendarOutline,
  IoChevronDown,
  IoGlobeOutline,
  IoImageOutline,
  IoMailOutline,
  IoPersonOutline,
  IoSparklesOutline,
} from 'react-icons/io5'
import MotionPage from '../components/MotionPage'
import SidebarLayout from '../components/SidebarLayout'
import Button from '../components/ui/Button'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { apiFetch } from '../services/api'
import { countryNameFromCode, getCountryEntries, resolveCountryCode } from '../utils/countries'
import { notifyError, notifySuccess } from '../utils/notify'

const PRESET_ICONS = ['🙂', '😎', '🤖', '🚀', '💻', '🎯']

function fallbackUsername(email) {
  const value = String(email || '')
  const at = value.indexOf('@')
  if (at > 0) {
    return value.slice(0, at)
  }

  return value || ''
}

function normalizeBirthDate(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ProfileEditPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const { t, language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const [form, setForm] = useState({
    username: '',
    nombre: '',
    email: '',
    avatar: PRESET_ICONS[0],
    bio: '',
    countryCode: '',
    birthDate: '',
  })
  const [countryInput, setCountryInput] = useState('')
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const birthDateInputRef = useRef(null)
  const avatarOptionsRef = useRef(null)
  const countryBlurTimeoutRef = useRef(null)
  const countryEntries = getCountryEntries(locale)
  const normalizedCountrySearch = countryInput.trim().toLocaleLowerCase(locale)
  const filteredCountryEntries = countryEntries.filter(({ name }) => {
    if (!normalizedCountrySearch) {
      return true
    }

    return name.toLocaleLowerCase(locale).includes(normalizedCountrySearch)
  })

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await apiFetch('/api/users/profile')
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || t('profile.loadError'))
      }

      const user = data.user || {}
      const countryCode = resolveCountryCode(user.countryCode, locale)
      const countryDisplay = countryNameFromCode(countryCode, locale, '')

      setForm({
        username: String(user.username || fallbackUsername(user.email)),
        nombre: user.nombre || '',
        email: user.email || '',
        avatar: String(user.avatar || PRESET_ICONS[0]),
        bio: user.bio || '',
        countryCode,
        birthDate: normalizeBirthDate(user.birthDate),
      })
      setCountryInput(countryDisplay)
    } catch (error) {
      const message = error.message || t('profile.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [locale, t])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (!form.countryCode) {
      return
    }

    const localizedName = countryNameFromCode(form.countryCode, locale, countryInput)
    if (localizedName && localizedName !== countryInput) {
      setCountryInput(localizedName)
    }
  }, [countryInput, form.countryCode, locale])

  useEffect(() => () => {
    if (countryBlurTimeoutRef.current) {
      clearTimeout(countryBlurTimeoutRef.current)
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleCountryChange = (event) => {
    const typedValue = event.target.value
    const resolvedCode = resolveCountryCode(typedValue, locale)

    setCountryInput(typedValue)
    setIsCountryMenuOpen(true)
    setForm((prev) => ({
      ...prev,
      countryCode: resolvedCode,
    }))

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleCountryBlur = () => {
    countryBlurTimeoutRef.current = setTimeout(() => {
      setIsCountryMenuOpen(false)

      if (!form.countryCode) {
        return
      }

      const localizedName = countryNameFromCode(form.countryCode, locale, countryInput)
      if (localizedName) {
        setCountryInput(localizedName)
      }
    }, 140)
  }

  const handleCountryFocus = () => {
    if (countryBlurTimeoutRef.current) {
      clearTimeout(countryBlurTimeoutRef.current)
    }

    setIsCountryMenuOpen(true)
  }

  const selectCountry = (entry) => {
    if (countryBlurTimeoutRef.current) {
      clearTimeout(countryBlurTimeoutRef.current)
    }

    setCountryInput(entry.name)
    setForm((prev) => ({
      ...prev,
      countryCode: entry.code,
    }))
    setIsCountryMenuOpen(false)

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleBirthDateChange = (event) => {
    const normalizedValue = normalizeBirthDate(event.target.value)
    setForm((prev) => ({
      ...prev,
      birthDate: normalizedValue,
    }))

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const openBirthDatePicker = () => {
    const input = birthDateInputRef.current
    if (!input) {
      return
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }

    input.focus()
    input.click()
  }

  const focusAvatarOptions = () => {
    avatarOptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) {
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          username: form.username,
          avatar: form.avatar,
          bio: form.bio,
          countryCode: form.countryCode,
          birthDate: form.birthDate,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || t('profile.updateError'))
      }

      updateUser(data.user)
      setForm({
        username: String(data.user?.username || form.username),
        nombre: data.user?.nombre || '',
        email: data.user?.email || '',
        avatar: String(data.user?.avatar || form.avatar || PRESET_ICONS[0]),
        bio: data.user?.bio || form.bio || '',
        countryCode: resolveCountryCode(data.user?.countryCode || form.countryCode, locale),
        birthDate: normalizeBirthDate(data.user?.birthDate || form.birthDate),
      })
      setCountryInput(
        countryNameFromCode(data.user?.countryCode || form.countryCode, locale, countryInput)
      )
      const message = data.message || t('profile.updateSuccess')
      setSuccessMessage(message)
      notifySuccess(message)
    } catch (error) {
      const message = error.message || t('profile.updateError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
        <section className="profile-edit-card profile-edit-card--premium">
          <div className="profile-edit-hero">
            <div className="profile-edit-header">
              <button
                type="button"
                className="profile-edit-header__back"
                onClick={() => navigate('/profile')}
                aria-label={t('profile.back')}
                title={t('profile.back')}
              >
                <IoArrowBack />
              </button>
              <h2>{t('profile.infoTitle')}</h2>
            </div>
          </div>

          {loading ? (
            <p className="profile-edit-loading">{t('common.loadingProfile')}</p>
          ) : (
            <form className="profile-edit-layout" onSubmit={handleSubmit}>
              <aside className="profile-edit-sidebar">
                <div className="profile-edit-avatar-card">
                  <div className="profile-edit-avatar-stage" aria-label={t('profile.photo')}>
                    <span>{form.avatar || PRESET_ICONS[0]}</span>
                  </div>
                </div>

                <Button
                  variant="blue"
                  className="profile-edit-sidebar__action"
                  icon={<IoImageOutline />}
                  onClick={focusAvatarOptions}
                  disabled={saving}
                >
                  {t('profile.changePhoto')}
                </Button>

                <div
                  className="profile-edit-avatar-picker"
                  role="listbox"
                  aria-label={t('profile.presetIcons')}
                  ref={avatarOptionsRef}
                >
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`profile-icon-chip profile-icon-chip--large ${form.avatar === icon ? 'active' : ''}`}
                      onClick={() => setForm((prev) => ({ ...prev, avatar: icon }))}
                      disabled={saving}
                      aria-selected={form.avatar === icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="profile-edit-main">
                <section className="profile-edit-section">
                  <div className="profile-edit-section__header">
                    <h3>{t('profile.personalInfoTitle')}</h3>
                  </div>

                  <div className="profile-edit-grid">
                    <label className="profile-field" htmlFor="profile-nombre">
                      <span className="profile-field__label">{t('profile.name')}</span>
                      <span className="profile-field__control">
                        <span className="profile-field__icon"><IoPersonOutline /></span>
                        <input
                          id="profile-nombre"
                          name="nombre"
                          type="text"
                          value={form.nombre}
                          onChange={handleChange}
                          disabled={saving}
                          required
                        />
                      </span>
                    </label>

                    <label className="profile-field" htmlFor="profile-username">
                      <span className="profile-field__label">{t('profile.username')}</span>
                      <span className="profile-field__control">
                        <span className="profile-field__icon"><IoAtOutline /></span>
                        <input
                          id="profile-username"
                          name="username"
                          type="text"
                          value={form.username}
                          onChange={handleChange}
                          disabled={saving}
                          required
                        />
                      </span>
                    </label>

                    <label className="profile-field profile-field--full" htmlFor="profile-email">
                      <span className="profile-field__label">{t('profile.email')}</span>
                      <span className="profile-field__control">
                        <span className="profile-field__icon"><IoMailOutline /></span>
                        <input
                          id="profile-email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          disabled={saving}
                          required
                        />
                      </span>
                    </label>

                    <label className="profile-field" htmlFor="profile-country">
                      <span className="profile-field__label">{t('profile.country')}</span>
                      <span className="profile-field__control profile-field__control--select">
                        <span className="profile-field__icon"><IoGlobeOutline /></span>
                        <input
                          id="profile-country"
                          type="text"
                          value={countryInput}
                          onChange={handleCountryChange}
                          onFocus={handleCountryFocus}
                          onBlur={handleCountryBlur}
                          disabled={saving}
                          placeholder={t('profile.countryPlaceholder')}
                          autoComplete="country-name"
                        />
                        <span className="profile-field__chevron" aria-hidden="true">
                          <IoChevronDown />
                        </span>
                      </span>
                      {isCountryMenuOpen ? (
                        <div className="profile-country-menu" role="listbox" aria-label={t('profile.country')}>
                          {filteredCountryEntries.length ? (
                            filteredCountryEntries.slice(0, 8).map((entry) => (
                              <button
                                key={entry.code}
                                type="button"
                                className={`profile-country-option ${form.countryCode === entry.code ? 'active' : ''}`}
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                  selectCountry(entry)
                                }}
                              >
                                <span>{entry.name}</span>
                                {form.countryCode === entry.code ? <IoCheckmarkCircle /> : null}
                              </button>
                            ))
                          ) : (
                            <div className="profile-country-option profile-country-option--empty">
                              {t('profile.countryEmpty')}
                            </div>
                          )}
                        </div>
                      ) : null}
                      <span className="profile-field__hint">{t('profile.countryHint')}</span>
                    </label>

                    <label className="profile-field profile-field--date" htmlFor="profile-birthdate">
                      <span className="profile-field__label">{t('profile.birthDate')}</span>
                      <span className="profile-field__control profile-field__control--date profile-field__control--date-only">
                        <input
                          id="profile-birthdate"
                          name="birthDate"
                          type="date"
                          ref={birthDateInputRef}
                          value={form.birthDate}
                          onChange={handleBirthDateChange}
                          disabled={saving}
                          max={new Date().toISOString().slice(0, 10)}
                        />
                        <button
                          type="button"
                          className="profile-date-picker-btn"
                          onClick={openBirthDatePicker}
                          disabled={saving}
                          aria-label={t('profile.openCalendar')}
                          title={t('profile.openCalendar')}
                        >
                          <IoCalendarOutline />
                        </button>
                      </span>
                    </label>

                    <label className="profile-field profile-field--full" htmlFor="profile-bio">
                      <span className="profile-field__label">{t('profile.bio')}</span>
                      <span className="profile-field__control profile-field__control--textarea">
                        <span className="profile-field__icon"><IoSparklesOutline /></span>
                        <textarea
                          id="profile-bio"
                          name="bio"
                          value={form.bio}
                          onChange={handleChange}
                          disabled={saving}
                          rows={4}
                          maxLength={280}
                          placeholder={t('profile.bioPlaceholder')}
                        />
                      </span>
                    </label>
                  </div>
                </section>

                <section className="profile-edit-section">
                  <div className="profile-edit-section__header">
                    <h3>{t('profile.accessTitle')}</h3>
                    <p>{t('profile.accessDescription')}</p>
                  </div>

                  <div className="profile-edit-access-card">
                    <div className="profile-edit-access-copy">
                      <span className="profile-field__label">{t('profile.password')}</span>
                      <strong>{t('profile.passwordCardTitle')}</strong>
                      <p>{t('profile.passwordCardDescription')}</p>
                    </div>
                    <Button
                      variant="blue"
                      onClick={() => navigate('/forgot-password')}
                    >
                      {t('profile.passwordCardAction')}
                    </Button>
                  </div>
                </section>

                {errorMessage ? <p className="profile-edit-message error">{errorMessage}</p> : null}
                {successMessage ? <p className="profile-edit-message success">{successMessage}</p> : null}

                <div className="profile-edit-actions profile-edit-actions--premium">
                  <Button
                    variant="slate"
                    onClick={() => navigate('/profile')}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? t('common.saving') : t('profile.save')}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default ProfileEditPage
