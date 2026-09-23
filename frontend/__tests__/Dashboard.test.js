import { fireEvent, render, screen } from '@testing-library/react';
import Dashboard from '../pages/dashboard';
import { api as mockApi } from '../lib/api';

const mockReplace = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    asPath: '/dashboard',
  }),
}));

jest.mock('../components/DashboardLayout', () => {
  return function DashboardLayout({ children, title }) {
    return (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    );
  };
});

jest.mock('../lib/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
  },
  currentUser: jest.fn(() => ({ id: 1 })),
}));

describe('Dashboard profile photo upload', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockApi.get.mockReset();
    mockApi.put.mockReset();

    mockApi.get.mockImplementation((path) => {
      if (path === '/api/auth/me') {
        return Promise.resolve({
          id: 1,
          full_name: 'Anara Armankyzy',
          phone: '+7 777 029 6982',
          address: 'Almaty',
          email: 'anara@example.com',
          role: 'owner',
          avatar_url: '',
        });
      }

      if (path === '/api/pets') return Promise.resolve([]);
      if (path === '/api/bookings/mine') return Promise.resolve({ asOwner: [], asSitter: [] });

      return Promise.resolve([]);
    });
  });

  it('shows an image file picker for choosing an avatar from device storage', async () => {
    render(<Dashboard />);

    await screen.findByText('Anara Armankyzy');

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const fileInput = document.querySelector('input[type="file"]');

    expect(screen.getByText(/choose profile photo from media library/i)).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });
});
