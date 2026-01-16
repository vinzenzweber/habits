/**
 * Tests for TagInput component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TagInput } from '../TagInput';

describe('TagInput', () => {
  describe('rendering', () => {
    it('renders existing tags', () => {
      render(<TagInput tags={['healthy', 'quick']} onChange={() => {}} />);
      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('quick')).toBeInTheDocument();
    });

    it('renders tag count correctly', () => {
      render(<TagInput tags={['healthy', 'quick']} onChange={() => {}} maxTags={10} />);
      expect(screen.getByText('2 of 10 tags')).toBeInTheDocument();
    });

    it('renders placeholder when no tags', () => {
      render(<TagInput tags={[]} onChange={() => {}} placeholder="Add a tag..." />);
      expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument();
    });

    it('renders input when can add more tags', () => {
      render(<TagInput tags={['one']} onChange={() => {}} maxTags={5} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('hides input when max tags reached', () => {
      render(<TagInput tags={['a', 'b', 'c']} onChange={() => {}} maxTags={3} />);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('adding tags', () => {
    it('adds tag on Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={[]} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'newtag{Enter}');

      expect(onChange).toHaveBeenCalledWith(['newtag']);
    });

    it('converts tags to lowercase', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={[]} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'NewTag{Enter}');

      expect(onChange).toHaveBeenCalledWith(['newtag']);
    });

    it('trims whitespace from tags', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={[]} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '  spaced  {Enter}');

      expect(onChange).toHaveBeenCalledWith(['spaced']);
    });

    it('prevents adding duplicate tags', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={['existing']} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'existing{Enter}');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('prevents adding tags when maxTags reached', () => {
      render(<TagInput tags={['a', 'b', 'c']} onChange={() => {}} maxTags={3} />);

      // Input should not be visible when max reached
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('does not add empty tags', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={[]} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '   {Enter}');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('removing tags', () => {
    it('removes tag on X button click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={['healthy', 'quick']} onChange={onChange} />);

      const removeButtons = screen.getAllByRole('button');
      await user.click(removeButtons[0]); // Remove first tag

      expect(onChange).toHaveBeenCalledWith(['quick']);
    });

    it('removes last tag on Backspace when input is empty', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={['healthy', 'quick']} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(onChange).toHaveBeenCalledWith(['healthy']);
    });

    it('does not remove tag on Backspace when input has content', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TagInput tags={['healthy']} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'abc');
      await user.keyboard('{Backspace}');

      // Should only modify input text, not remove tag
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('suggestions', () => {
    it('shows suggestions on input focus', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={[]}
          onChange={() => {}}
          suggestions={['breakfast', 'lunch', 'dinner']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.getByText('breakfast')).toBeInTheDocument();
      expect(screen.getByText('lunch')).toBeInTheDocument();
      expect(screen.getByText('dinner')).toBeInTheDocument();
    });

    it('filters suggestions based on input', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={[]}
          onChange={() => {}}
          suggestions={['breakfast', 'lunch', 'dinner']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'br');

      expect(screen.getByText('breakfast')).toBeInTheDocument();
      expect(screen.queryByText('lunch')).not.toBeInTheDocument();
      expect(screen.queryByText('dinner')).not.toBeInTheDocument();
    });

    it('excludes already-added tags from suggestions', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={['breakfast']}
          onChange={() => {}}
          suggestions={['breakfast', 'lunch']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.queryByRole('button', { name: 'breakfast' })).not.toBeInTheDocument();
      expect(screen.getByText('lunch')).toBeInTheDocument();
    });

    it('adds suggestion on click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <TagInput
          tags={[]}
          onChange={onChange}
          suggestions={['breakfast', 'lunch']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      // Click on the suggestion button
      const suggestionButtons = screen.getAllByRole('button');
      const breakfastButton = suggestionButtons.find(btn => btn.textContent === 'breakfast');
      await user.click(breakfastButton!);

      expect(onChange).toHaveBeenCalledWith(['breakfast']);
    });
  });

  describe('keyboard navigation', () => {
    it('closes suggestions on Escape', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={[]}
          onChange={() => {}}
          suggestions={['breakfast', 'lunch']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(screen.getByText('breakfast')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      // Suggestions should be hidden
      expect(screen.queryByText('breakfast')).not.toBeInTheDocument();
    });

    it('navigates suggestions with ArrowDown', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={[]}
          onChange={() => {}}
          suggestions={['breakfast', 'lunch']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      // First suggestion should be highlighted (has different styling)
      const suggestionButtons = screen.getAllByRole('button');
      expect(suggestionButtons[0]).toHaveClass('bg-slate-700');
    });

    it('navigates suggestions with ArrowUp', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={[]}
          onChange={() => {}}
          suggestions={['breakfast', 'lunch']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

      // First suggestion should be highlighted after going down twice and up once
      const suggestionButtons = screen.getAllByRole('button');
      expect(suggestionButtons[0]).toHaveClass('bg-slate-700');
    });

    it('selects highlighted suggestion on Enter', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <TagInput
          tags={[]}
          onChange={onChange}
          suggestions={['breakfast', 'lunch']}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{Enter}');

      expect(onChange).toHaveBeenCalledWith(['breakfast']);
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<TagInput tags={['test']} onChange={() => {}} disabled={true} />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('hides remove buttons when disabled', () => {
      render(<TagInput tags={['test']} onChange={() => {}} disabled={true} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('does not show suggestions when disabled', async () => {
      const user = userEvent.setup();
      render(
        <TagInput
          tags={[]}
          onChange={() => {}}
          suggestions={['breakfast']}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.queryByText('breakfast')).not.toBeInTheDocument();
    });
  });
});
