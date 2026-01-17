/**
 * Tests for StepsEditor component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StepsEditor } from '../StepsEditor';
import type { RecipeStep } from '@/lib/recipe-types';

const createMockSteps = (): RecipeStep[] => [
  { number: 1, instruction: 'Preheat oven to 350°F' },
  { number: 2, instruction: 'Mix dry ingredients' },
  { number: 3, instruction: 'Add wet ingredients and stir' },
];

describe('StepsEditor', () => {
  describe('rendering', () => {
    it('renders all steps with step numbers', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders step instructions in textareas', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} />);

      expect(screen.getByDisplayValue('Preheat oven to 350°F')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mix dry ingredients')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Add wet ingredients and stir')).toBeInTheDocument();
    });

    it('renders add step button', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} />);
      expect(screen.getByText('+ Add step')).toBeInTheDocument();
    });

    it('renders move up and move down buttons for each step', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} />);

      const moveUpButtons = screen.getAllByTitle('Move up');
      const moveDownButtons = screen.getAllByTitle('Move down');

      expect(moveUpButtons).toHaveLength(3);
      expect(moveDownButtons).toHaveLength(3);
    });
  });

  describe('adding steps', () => {
    it('adds new step with auto-incremented number', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      await user.click(screen.getByText('+ Add step'));

      expect(onChange).toHaveBeenCalledWith([
        ...createMockSteps(),
        { number: 4, instruction: '' },
      ]);
    });

    it('adds first step with number 1 when no steps exist', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={[]} onChange={onChange} />);

      await user.click(screen.getByText('+ Add step'));

      expect(onChange).toHaveBeenCalledWith([{ number: 1, instruction: '' }]);
    });
  });

  describe('removing steps', () => {
    it('removes step and renumbers remaining steps', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      const removeButtons = screen.getAllByTitle('Remove step');
      await user.click(removeButtons[1]); // Remove step 2

      expect(onChange).toHaveBeenCalledWith([
        { number: 1, instruction: 'Preheat oven to 350°F' },
        { number: 2, instruction: 'Add wet ingredients and stir' }, // Was step 3, now step 2
      ]);
    });

    it('hides remove button when only one step exists', () => {
      render(
        <StepsEditor
          steps={[{ number: 1, instruction: 'Only step' }]}
          onChange={() => {}}
        />
      );

      expect(screen.queryByTitle('Remove step')).not.toBeInTheDocument();
    });
  });

  describe('updating step instruction', () => {
    it('updates instruction on textarea change', () => {
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      const textarea = screen.getByDisplayValue('Mix dry ingredients');
      fireEvent.change(textarea, { target: { value: 'Combine all dry ingredients' } });

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[1].instruction).toBe('Combine all dry ingredients');
    });
  });

  describe('moving steps', () => {
    it('moves step up', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      const moveUpButtons = screen.getAllByTitle('Move up');
      await user.click(moveUpButtons[1]); // Move step 2 up

      expect(onChange).toHaveBeenCalledWith([
        { number: 1, instruction: 'Mix dry ingredients' }, // Was step 2
        { number: 2, instruction: 'Preheat oven to 350°F' }, // Was step 1
        { number: 3, instruction: 'Add wet ingredients and stir' },
      ]);
    });

    it('moves step down', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      const moveDownButtons = screen.getAllByTitle('Move down');
      await user.click(moveDownButtons[1]); // Move step 2 down

      expect(onChange).toHaveBeenCalledWith([
        { number: 1, instruction: 'Preheat oven to 350°F' },
        { number: 2, instruction: 'Add wet ingredients and stir' }, // Was step 3
        { number: 3, instruction: 'Mix dry ingredients' }, // Was step 2
      ]);
    });

    it('disables move up button for first step', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} />);

      const moveUpButtons = screen.getAllByTitle('Move up');
      expect(moveUpButtons[0]).toBeDisabled();
    });

    it('disables move down button for last step', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} />);

      const moveDownButtons = screen.getAllByTitle('Move down');
      expect(moveDownButtons[2]).toBeDisabled();
    });

    it('does not call onChange when moving first step up', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      const moveUpButtons = screen.getAllByTitle('Move up');
      await user.click(moveUpButtons[0]); // Try to move first step up (disabled)

      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when moving last step down', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<StepsEditor steps={createMockSteps()} onChange={onChange} />);

      const moveDownButtons = screen.getAllByTitle('Move down');
      await user.click(moveDownButtons[2]); // Try to move last step down (disabled)

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('disables all textareas when disabled prop is true', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} disabled />);

      const textareas = screen.getAllByRole('textbox');
      textareas.forEach((textarea) => {
        expect(textarea).toBeDisabled();
      });
    });

    it('disables all buttons when disabled', () => {
      render(<StepsEditor steps={createMockSteps()} onChange={() => {}} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
