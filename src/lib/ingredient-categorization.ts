/**
 * Ingredient categorization utilities
 * Provides keyword-based categorization for grocery items
 */

import { GroceryCategory, GROCERY_CATEGORIES } from "./grocery-types";

// ============================================
// Keyword-Based Categorization
// ============================================

/**
 * Keywords for each grocery category
 * Used for fast, local categorization without API calls
 */
const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  produce: [
    // Fruits
    "apple",
    "apples",
    "banana",
    "bananas",
    "orange",
    "oranges",
    "lemon",
    "lemons",
    "lime",
    "limes",
    "grape",
    "grapes",
    "strawberry",
    "strawberries",
    "blueberry",
    "blueberries",
    "raspberry",
    "raspberries",
    "blackberry",
    "blackberries",
    "mango",
    "mangoes",
    "pineapple",
    "peach",
    "peaches",
    "pear",
    "pears",
    "plum",
    "plums",
    "cherry",
    "cherries",
    "watermelon",
    "melon",
    "cantaloupe",
    "kiwi",
    "pomegranate",
    "avocado",
    "avocados",
    "coconut",
    "fig",
    "figs",
    "date",
    "dates",
    // Vegetables
    "tomato",
    "tomatoes",
    "potato",
    "potatoes",
    "onion",
    "onions",
    "garlic",
    "carrot",
    "carrots",
    "celery",
    "broccoli",
    "cauliflower",
    "spinach",
    "kale",
    "lettuce",
    "cabbage",
    "cucumber",
    "cucumbers",
    "zucchini",
    "squash",
    "pumpkin",
    "eggplant",
    "pepper",
    "peppers",
    "bell pepper",
    "jalapeño",
    "chili",
    "mushroom",
    "mushrooms",
    "corn",
    "peas",
    "green beans",
    "asparagus",
    "artichoke",
    "beet",
    "beets",
    "radish",
    "radishes",
    "turnip",
    "parsnip",
    "sweet potato",
    "yam",
    "leek",
    "leeks",
    "scallion",
    "scallions",
    "shallot",
    "shallots",
    "ginger",
    "arugula",
    "chard",
    "bok choy",
    // Fresh herbs
    "basil",
    "parsley",
    "cilantro",
    "mint",
    "dill",
    "thyme",
    "rosemary",
    "oregano",
    "sage",
    "chives",
  ],

  dairy: [
    "milk",
    "whole milk",
    "skim milk",
    "almond milk",
    "oat milk",
    "soy milk",
    "cream",
    "heavy cream",
    "whipping cream",
    "half and half",
    "butter",
    "margarine",
    "cheese",
    "cheddar",
    "mozzarella",
    "parmesan",
    "feta",
    "gouda",
    "brie",
    "swiss",
    "provolone",
    "ricotta",
    "cottage cheese",
    "cream cheese",
    "goat cheese",
    "blue cheese",
    "yogurt",
    "greek yogurt",
    "sour cream",
    "crème fraîche",
    "egg",
    "eggs",
    "egg white",
    "egg yolk",
    "quark",
    "buttermilk",
    "kefir",
    "ghee",
  ],

  meat: [
    // Poultry
    "chicken",
    "chicken breast",
    "chicken thigh",
    "chicken wing",
    "turkey",
    "duck",
    "goose",
    // Beef
    "beef",
    "steak",
    "ground beef",
    "sirloin",
    "ribeye",
    "filet",
    "brisket",
    "roast",
    // Pork
    "pork",
    "bacon",
    "ham",
    "sausage",
    "prosciutto",
    "pancetta",
    "chorizo",
    "pork chop",
    "pork loin",
    "pork belly",
    // Other meats
    "lamb",
    "veal",
    "venison",
    "bison",
    "rabbit",
    // Fish & Seafood
    "fish",
    "salmon",
    "tuna",
    "cod",
    "tilapia",
    "halibut",
    "trout",
    "bass",
    "mackerel",
    "sardine",
    "sardines",
    "anchovy",
    "anchovies",
    "shrimp",
    "prawns",
    "crab",
    "lobster",
    "scallop",
    "scallops",
    "mussel",
    "mussels",
    "clam",
    "clams",
    "oyster",
    "oysters",
    "squid",
    "calamari",
    "octopus",
  ],

  bakery: [
    "bread",
    "loaf",
    "baguette",
    "roll",
    "rolls",
    "bun",
    "buns",
    "croissant",
    "croissants",
    "bagel",
    "bagels",
    "muffin",
    "muffins",
    "scone",
    "scones",
    "danish",
    "pastry",
    "pastries",
    "cake",
    "cupcake",
    "pie",
    "tart",
    "donut",
    "doughnut",
    "cookie",
    "cookies",
    "cracker",
    "crackers",
    "tortilla",
    "tortillas",
    "pita",
    "naan",
    "focaccia",
    "ciabatta",
    "sourdough",
    "brioche",
    "pretzel",
    "pretzels",
    "cornbread",
    "flatbread",
    "wrap",
    "wraps",
  ],

  pantry: [
    // Grains & Pasta
    "rice",
    "pasta",
    "spaghetti",
    "penne",
    "macaroni",
    "linguine",
    "fettuccine",
    "noodle",
    "noodles",
    "couscous",
    "quinoa",
    "bulgur",
    "barley",
    "oats",
    "oatmeal",
    "cereal",
    "granola",
    "flour",
    "cornmeal",
    "polenta",
    // Legumes
    "bean",
    "beans",
    "black beans",
    "kidney beans",
    "pinto beans",
    "chickpea",
    "chickpeas",
    "lentil",
    "lentils",
    // Oils & Vinegars
    "oil",
    "olive oil",
    "vegetable oil",
    "coconut oil",
    "sesame oil",
    "vinegar",
    "balsamic",
    "wine vinegar",
    "apple cider vinegar",
    // Sauces & Condiments
    "soy sauce",
    "fish sauce",
    "worcestershire",
    "hot sauce",
    "ketchup",
    "mustard",
    "mayonnaise",
    "mayo",
    "sriracha",
    "bbq sauce",
    "teriyaki",
    "salsa",
    "pesto",
    "marinara",
    "tomato sauce",
    "tomato paste",
    // Spices
    "salt",
    "pepper",
    "paprika",
    "cumin",
    "coriander",
    "turmeric",
    "cinnamon",
    "nutmeg",
    "cloves",
    "cardamom",
    "curry",
    "cayenne",
    "chili powder",
    "garlic powder",
    "onion powder",
    "dried oregano",
    "dried basil",
    "bay leaf",
    "bay leaves",
    // Baking
    "sugar",
    "brown sugar",
    "powdered sugar",
    "honey",
    "maple syrup",
    "molasses",
    "baking soda",
    "baking powder",
    "yeast",
    "vanilla",
    "vanilla extract",
    "cocoa",
    "chocolate chips",
    // Nuts & Seeds
    "almond",
    "almonds",
    "walnut",
    "walnuts",
    "pecan",
    "pecans",
    "cashew",
    "cashews",
    "peanut",
    "peanuts",
    "pistachio",
    "pistachios",
    "hazelnut",
    "hazelnuts",
    "pine nut",
    "pine nuts",
    "sunflower seed",
    "sunflower seeds",
    "pumpkin seed",
    "pumpkin seeds",
    "chia seed",
    "chia seeds",
    "flax",
    "flaxseed",
    "sesame",
    "sesame seeds",
    // Canned goods
    "canned",
    "stock",
    "broth",
    "chicken broth",
    "beef broth",
    "vegetable broth",
    "coconut milk",
    "canned tomatoes",
    "diced tomatoes",
    "crushed tomatoes",
    // Protein
    "protein powder",
    "whey",
    "tofu",
    "tempeh",
    "seitan",
    "peanut butter",
    "almond butter",
  ],

  frozen: [
    "frozen",
    "ice cream",
    "gelato",
    "sorbet",
    "frozen yogurt",
    "frozen pizza",
    "frozen vegetables",
    "frozen fruit",
    "frozen berries",
    "frozen peas",
    "frozen corn",
    "frozen spinach",
    "ice",
    "ice cubes",
    "popsicle",
    "frozen dinner",
    "frozen meal",
  ],

  beverages: [
    "water",
    "sparkling water",
    "soda",
    "cola",
    "juice",
    "orange juice",
    "apple juice",
    "grape juice",
    "cranberry juice",
    "lemonade",
    "tea",
    "green tea",
    "black tea",
    "herbal tea",
    "coffee",
    "espresso",
    "wine",
    "beer",
    "vodka",
    "whiskey",
    "rum",
    "gin",
    "tequila",
    "brandy",
    "liqueur",
    "champagne",
    "prosecco",
    "cider",
    "smoothie",
    "energy drink",
    "sports drink",
    "coconut water",
    "kombucha",
  ],

  other: [
    // Default category - intentionally sparse
    // Items here are last-resort matches
    "supplement",
    "vitamin",
    "mineral",
  ],
};

/**
 * Build a reverse lookup map for fast categorization
 */
function buildCategoryLookup(): Map<string, GroceryCategory> {
  const lookup = new Map<string, GroceryCategory>();

  for (const category of GROCERY_CATEGORIES) {
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      lookup.set(keyword.toLowerCase(), category);
    }
  }

  return lookup;
}

const categoryLookup = buildCategoryLookup();

/**
 * Categorize an ingredient by keyword matching
 * Returns null if no match found
 */
export function categorizeIngredientByKeyword(
  ingredientName: string
): GroceryCategory | null {
  const normalized = ingredientName.toLowerCase().trim();

  // 1. Exact match (highest priority)
  if (categoryLookup.has(normalized)) {
    return categoryLookup.get(normalized)!;
  }

  // 2. Word-by-word match (each word checked against keywords)
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (categoryLookup.has(word)) {
      return categoryLookup.get(word)!;
    }
  }

  // 3. Check if ingredient name is a prefix/suffix variation of any keyword
  // This handles cases like "egg" matching "eggs" (singular/plural)
  // Only match if the difference is small (e.g., just adding "s" or "es")
  for (const [keyword, category] of categoryLookup) {
    const lengthDiff = Math.abs(keyword.length - normalized.length);
    if (lengthDiff <= 2 && keyword.includes(normalized)) {
      return category;
    }
  }

  return null;
}

/**
 * Categorize multiple ingredients
 * Uses keyword matching for all ingredients
 */
export function categorizeIngredients(
  ingredientNames: string[]
): Map<string, GroceryCategory | null> {
  const result = new Map<string, GroceryCategory | null>();

  for (const name of ingredientNames) {
    const category = categorizeIngredientByKeyword(name);
    result.set(name, category);
  }

  return result;
}

/**
 * Get the category for an ingredient with fallback to 'other'
 */
export function getCategoryOrDefault(ingredientName: string): GroceryCategory {
  const category = categorizeIngredientByKeyword(ingredientName);
  return category ?? "other";
}
