import { useLanguage } from '../context/useLanguage'

function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="language-switcher" role="group" aria-label={t('language.selector')}>
      <button
        type="button"
        className={`language-switcher__btn ${language === 'es' ? 'language-switcher__btn--active' : ''}`}
        onClick={() => setLanguage('es')}
      >
        ES
      </button>
      <button
        type="button"
        className={`language-switcher__btn ${language === 'en' ? 'language-switcher__btn--active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}

export default LanguageSwitcher
