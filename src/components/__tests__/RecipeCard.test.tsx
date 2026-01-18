import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { RecipeSummary } from "@/lib/recipe-types";
import { RecipeCard } from "../RecipeCard";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} data-testid="recipe-image" />
  ),
}));

const mockRecipe: RecipeSummary = {
  slug: "test-recipe",
  title: "Test Recipe",
  description: "A delicious test recipe for unit testing",
  tags: ["healthy", "quick", "vegetarian"],
  servings: 4,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  primaryImage: {
    url: "https://example.com/image.jpg",
    caption: "Test recipe image",
  },
  nutrition: {
    calories: 500,
    protein: 25,
    carbohydrates: 60,
    fat: 15,
  },
};

describe("RecipeCard", () => {
  it("renders recipe title", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText("Test Recipe")).toBeInTheDocument();
  });

  it("renders recipe description", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(
      screen.getByText("A delicious test recipe for unit testing")
    ).toBeInTheDocument();
  });

  it("renders recipe tags (limited to 3)", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    // "healthy" is custom tag, displayed as-is
    expect(screen.getByText("healthy")).toBeInTheDocument();
    // "quick" and "vegetarian" are predefined tags, displayed with German labels
    expect(screen.getByText("Schnell")).toBeInTheDocument();
    expect(screen.getByText("Vegetarisch")).toBeInTheDocument();
  });

  it("renders +N more indicator when more than 3 tags", () => {
    const recipeWithManyTags = {
      ...mockRecipe,
      tags: ["healthy", "quick", "vegetarian", "dinner", "lunch"],
    };
    render(<RecipeCard recipe={recipeWithManyTags} />);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("renders prep and cook time", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText("🕐 15m prep • 30m cook")).toBeInTheDocument();
  });

  it("renders only prep time when cook time is missing", () => {
    const recipeWithOnlyPrep = {
      ...mockRecipe,
      cookTimeMinutes: undefined,
    };
    render(<RecipeCard recipe={recipeWithOnlyPrep} />);
    expect(screen.getByText("🕐 15m prep")).toBeInTheDocument();
  });

  it("renders only cook time when prep time is missing", () => {
    const recipeWithOnlyCook = {
      ...mockRecipe,
      prepTimeMinutes: undefined,
    };
    render(<RecipeCard recipe={recipeWithOnlyCook} />);
    expect(screen.getByText("🕐 30m cook")).toBeInTheDocument();
  });

  it("renders servings with correct pluralization", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText("👥 4 servings")).toBeInTheDocument();
  });

  it("renders singular serving when servings is 1", () => {
    const singleServing = { ...mockRecipe, servings: 1 };
    render(<RecipeCard recipe={singleServing} />);
    expect(screen.getByText("👥 1 serving")).toBeInTheDocument();
  });

  it("renders image when primaryImage is provided", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    const image = screen.getByTestId("recipe-image");
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(image).toHaveAttribute("alt", "Test recipe image");
  });

  it("renders placeholder emoji when no image", () => {
    const recipeWithoutImage = {
      ...mockRecipe,
      primaryImage: undefined,
    };
    render(<RecipeCard recipe={recipeWithoutImage} />);
    expect(screen.getByText("🍳")).toBeInTheDocument();
  });

  it("renders link with correct default href", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/recipes/test-recipe");
  });

  it("renders link with custom href when provided", () => {
    render(<RecipeCard recipe={mockRecipe} href="/custom/path" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/custom/path");
  });

  it("has correct aria-label for accessibility", () => {
    render(<RecipeCard recipe={mockRecipe} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-label", "View recipe: Test Recipe");
  });

  it("renders without description when not provided", () => {
    const recipeWithoutDescription = {
      ...mockRecipe,
      description: "",
    };
    render(<RecipeCard recipe={recipeWithoutDescription} />);
    expect(screen.getByText("Test Recipe")).toBeInTheDocument();
    // Description paragraph should not be rendered
    expect(
      screen.queryByText("A delicious test recipe for unit testing")
    ).not.toBeInTheDocument();
  });

  it("renders without tags section when no tags", () => {
    const recipeWithoutTags = {
      ...mockRecipe,
      tags: [],
    };
    render(<RecipeCard recipe={recipeWithoutTags} />);
    expect(screen.queryByText("healthy")).not.toBeInTheDocument();
  });
});
