/**
 * Tests for BottomNav component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BottomNav } from '../BottomNav';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      home: 'Home',
      recipes: 'Recipes',
      settings: 'Settings',
    };
    return translations[key] || key;
  },
}));

import { usePathname } from 'next/navigation';

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders on home page (/)', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Recipes')).toBeInTheDocument();
    });

    it('renders on recipes list page (/recipes)', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes');
      render(<BottomNav />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Recipes')).toBeInTheDocument();
    });

    it('does not render on recipe detail pages', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes/test-recipe');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.queryByText('Recipes')).not.toBeInTheDocument();
    });

    it('does not render on workout pages', () => {
      vi.mocked(usePathname).mockReturnValue('/workouts/monday');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('does not render on login page', () => {
      vi.mocked(usePathname).mockReturnValue('/login');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('does not render on register page', () => {
      vi.mocked(usePathname).mockReturnValue('/register');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('does not render on onboarding page', () => {
      vi.mocked(usePathname).mockReturnValue('/onboarding');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('does not render on recipe new page', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes/new');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('does not render on recipe edit page', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes/test-recipe/edit');
      render(<BottomNav />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('highlights Home tab when on home page', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveClass('text-emerald-400');
    });

    it('does not highlight Recipes tab when on home page', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const recipesLink = screen.getByRole('link', { name: /recipes/i });
      expect(recipesLink).toHaveClass('text-slate-400');
    });

    it('highlights Recipes tab when on recipes page', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes');
      render(<BottomNav />);

      const recipesLink = screen.getByRole('link', { name: /recipes/i });
      expect(recipesLink).toHaveClass('text-emerald-400');
    });

    it('does not highlight Home tab when on recipes page', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes');
      render(<BottomNav />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveClass('text-slate-400');
    });
  });

  describe('navigation', () => {
    it('Home link points to /', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('Recipes link points to /recipes', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const recipesLink = screen.getByRole('link', { name: /recipes/i });
      expect(recipesLink).toHaveAttribute('href', '/recipes');
    });

    it('Settings link points to /settings', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('settings tab', () => {
    it('renders Settings tab on home page', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders Settings tab on recipes page', () => {
      vi.mocked(usePathname).mockReturnValue('/recipes');
      render(<BottomNav />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders Settings tab on settings page', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');
      render(<BottomNav />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('highlights Settings tab when on settings page', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');
      render(<BottomNav />);

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toHaveClass('text-emerald-400');
    });

    it('does not highlight Settings tab when on home page', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toHaveClass('text-slate-400');
    });
  });

  describe('structure', () => {
    it('renders as a nav element', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('is fixed at the bottom', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('fixed', 'bottom-0');
    });
  });
});
