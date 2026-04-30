import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
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
    countryCode: '',
    birthDate: '',
  })
  const [countryInput, setCountryInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const birthDateInputRef = useRef(null)
  const countryEntries = useMemo(() => getCountryEntries(locale), [locale])

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
    setForm((prev) => ({
      ...prev,
      countryCode: resolvedCode,
    }))

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleCountryBlur = () => {
    if (!form.countryCode) {
      return
    }

    const localizedName = countryNameFromCode(form.countryCode, locale, countryInput)
    if (localizedName) {
      setCountryInput(localizedName)
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
    <MotionPage className="dashboard-page" delay={0.06}>
      <Sidebar />
      <Navbar
        title={t('profile.title')}
        profileActionLabel={t('profile.viewTitle')}
        profileActionTo="/profile"
      />

      <section className="profile-edit-card">
        <div className="profile-edit-header">
          <h2>{t('profile.infoTitle')}</h2>
          <p>{t('profile.infoDescription')}</p>
        </div>

        {loading ? (
          <p className="profile-edit-loading">{t('common.loadingProfile')}</p>
        ) : (
          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-username">{t('profile.username')}</label>
            <input
              id="profile-username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              disabled={saving}
              required
            />

            <label htmlFor="profile-nombre">{t('profile.name')}</label>
            <input
              id="profile-nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
              required
            />

            <label htmlFor="profile-email">{t('profile.email')}</label>
            <input
              id="profile-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              disabled={saving}
              required
            />

            <label htmlFor="profile-password">{t('profile.password')}</label>
            <input
              id="profile-password"
              type="password"
              value="********"
              disabled
            />

            <label>{t('profile.photo')}</label>
            <div className="profile-icon-list" role="listbox" aria-label={t('profile.presetIcons')}>
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`profile-icon-chip ${form.avatar === icon ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, avatar: icon }))}
                  disabled={saving}
                  aria-selected={form.avatar === icon}
                >
                  {icon}
                </button>
              ))}
            </div>

            <label htmlFor="profile-country">{t('profile.country')}</label>
            <input
              id="profile-country"
              type="text"
              value={countryInput}
              onChange={handleCountryChange}
              onBlur={handleCountryBlur}
              disabled={saving}
              list="profile-country-options"
              autoComplete="country-name"
            />
            <datalist id="profile-country-options">
              {countryEntries.map((country) => (
                <option key={country.code} value={country.name} />
              ))}
            </datalist>

            <label htmlFor="profile-birthdate">{t('profile.birthDate')}</label>
            <div className="profile-date-row">
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
                📅
              </button>
            </div>

            {errorMessage ? <p className="profile-edit-message error">{errorMessage}</p> : null}
            {successMessage ? <p className="profile-edit-message success">{successMessage}</p> : null}

            <div className="profile-edit-actions">
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={() => navigate('/profile')}
                disabled={saving}
              >
                {t('common.back')}
              </button>
              <button type="submit" className="profile-save-btn" disabled={saving}>
                {saving ? t('common.saving') : t('profile.save')}
              </button>
            </div>
          </form>
        )}
      </section>
    </MotionPage>
  )
}

export default ProfileEditPage
