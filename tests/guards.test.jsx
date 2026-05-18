import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PrivateRoute from '../src/components/PrivateRoute'
import PublicRoute from '../src/components/PublicRoute'

vi.mock('../src/context/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../src/context/useLanguage', () => ({
  useLanguage: vi.fn(() => ({ t: (key) => key })),
}))

const { useAuth } = await import('../src/context/useAuth')

const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>

describe('PrivateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when loading', () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: true })
    render(<PrivateRoute><div>Protected</div></PrivateRoute>, { wrapper })

    expect(screen.getByText('route.loading')).toBeInTheDocument()
  })

  it('does not render children when not authenticated', () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false })
    render(<PrivateRoute><div>Protected</div></PrivateRoute>, { wrapper })

    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'user' }, isAuthenticated: true, loading: false })
    render(<PrivateRoute><div>Protected Content</div></PrivateRoute>, { wrapper })

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})

describe('PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when loading', () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: true })
    render(<PublicRoute><div>Public</div></PublicRoute>, { wrapper })

    expect(screen.getByText('route.loading')).toBeInTheDocument()
  })

  it('does not render children when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'user' }, isAuthenticated: true, loading: false })
    render(<PublicRoute><div>Login Form</div></PublicRoute>, { wrapper })

    expect(screen.queryByText('Login Form')).not.toBeInTheDocument()
  })

  it('renders children when not authenticated', () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false })
    render(<PublicRoute><div>Login Form</div></PublicRoute>, { wrapper })

    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })
})
