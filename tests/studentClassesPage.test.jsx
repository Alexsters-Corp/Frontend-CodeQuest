import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import StudentClassesPage from '../src/pages/StudentClassesPage'

vi.mock('../src/context/useLanguage', () => ({
  useLanguage: () => ({
    t: (key) => key,
  }),
}))

vi.mock('../src/components/MotionPage', () => ({
  default: ({ children }) => <div data-testid="motion-page">{children}</div>,
}))

vi.mock('../src/components/Navbar', () => ({
  default: ({ title }) => <div data-testid="navbar">{title}</div>,
}))

vi.mock('../src/components/SidebarLayout', () => ({
  default: ({ children }) => <div data-testid="sidebar-layout">{children}</div>,
}))

vi.mock('../src/components/StudentClassesGrid', () => ({
  default: ({ classes, loading, focusClassId }) => (
    <div data-testid="student-classes-grid">
      <p>{loading ? 'loading' : 'loaded'}</p>
      <p>focus:{focusClassId || 'none'}</p>
      {(classes || []).map((item) => (
        <p key={item.id}>{item.name}</p>
      ))}
    </div>
  ),
}))

const listStudentClasses = vi.fn()
const joinClassWithCode = vi.fn()

vi.mock('../src/services/learningApi', () => ({
  listStudentClasses: (...args) => listStudentClasses(...args),
  joinClassWithCode: (...args) => joinClassWithCode(...args),
}))

const notifyError = vi.fn()
const notifyInfo = vi.fn()
const notifySuccess = vi.fn()

vi.mock('../src/utils/notify', () => ({
  notifyError: (...args) => notifyError(...args),
  notifyInfo: (...args) => notifyInfo(...args),
  notifySuccess: (...args) => notifySuccess(...args),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/classes']}>
      <StudentClassesPage />
    </MemoryRouter>
  )
}

describe('StudentClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listStudentClasses.mockResolvedValue({ classes: [] })
    joinClassWithCode.mockResolvedValue({ classId: 0, className: '' })
  })

  it('loads and renders student classes on mount', async () => {
    listStudentClasses.mockResolvedValue({
      classes: [{ id: 1, name: 'Clase Backend' }],
    })

    renderPage()

    await waitFor(() => {
      expect(listStudentClasses).toHaveBeenCalled()
    })

    expect(await screen.findByText('Clase Backend')).toBeInTheDocument()
  })

  it('shows load error notification when classes request fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    listStudentClasses.mockRejectedValueOnce(new Error('fallo al cargar'))

    renderPage()

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('fallo al cargar')
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading student classes:', expect.any(Error))
    consoleErrorSpy.mockRestore()
  })

  it('joins a class and refreshes classes list', async () => {
    const user = userEvent.setup()

    listStudentClasses
      .mockResolvedValueOnce({ classes: [] })
      .mockResolvedValueOnce({ classes: [{ id: 7, name: 'Clase QA' }] })

    joinClassWithCode.mockResolvedValue({
      classId: 7,
      className: 'Clase QA',
    })

    renderPage()

    await waitFor(() => {
      expect(listStudentClasses).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'dashboard.joinClass' }))
    await user.type(screen.getByPlaceholderText('dashboard.joinClassPlaceholder'), 'qa-777')
    await user.click(screen.getByRole('button', { name: 'dashboard.joinAction' }))

    await waitFor(() => {
      expect(joinClassWithCode).toHaveBeenCalledWith('QA-777')
    })

    await waitFor(() => {
      expect(listStudentClasses.mock.calls.length).toBeGreaterThan(1)
    })

    expect(notifySuccess).toHaveBeenCalledWith('dashboard.joinSuccess')
    expect(screen.getByText('focus:7')).toBeInTheDocument()
  })

  it('keeps join action disabled when invite code is empty', async () => {
    const user = userEvent.setup()
    listStudentClasses.mockResolvedValue({ classes: [] })

    renderPage()

    await user.click(screen.getByRole('button', { name: 'dashboard.joinClass' }))
    const submitButton = screen.getByRole('button', { name: 'dashboard.joinAction' })

    expect(submitButton).toBeDisabled()
    expect(joinClassWithCode).not.toHaveBeenCalled()
    expect(notifyInfo).not.toHaveBeenCalled()
  })
})
