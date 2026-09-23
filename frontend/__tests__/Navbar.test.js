import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';

const mockPush = jest.fn();

jest.mock('next/link', () => {
  return function Link({ href, children, ...props }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/',
    push: mockPush,
  }),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockPush.mockReset();
    window.localStorage.clear();
  });

  it('renders fixed header and guest actions by default', () => {
    render(<Navbar />);

    const header = screen.getByRole('banner');

    expect(header).toHaveClass('fixed');
    expect(screen.getByRole('link', { name: /nanny/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });

  it('renders account actions for signed-in users', () => {
    window.localStorage.setItem('nanny_user', JSON.stringify({ role: 'owner' }));

    render(<Navbar />);

    expect(screen.getByRole('link', { name: /my account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});
