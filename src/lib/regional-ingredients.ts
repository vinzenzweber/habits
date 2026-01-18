/**
 * Regional ingredient name references for AI context
 * Used to help AI translate ingredients to region-specific terminology
 *
 * NOTE: This is reference data included in AI prompts, not a lookup table.
 * The AI uses these examples to understand regional variations.
 */

/**
 * Regional ingredient examples organized by region name
 * Keys are human-readable region names (matching TIMEZONE_TO_REGION output)
 * Values are maps of generic ingredient concepts to local names
 */
export const REGIONAL_INGREDIENT_EXAMPLES: Record<string, Record<string, string>> = {
  // Austrian German (de-AT)
  'Austria': {
    cream: 'Schlagobers',
    whipped_cream: 'Schlagobers',
    tomato: 'Paradeiser',
    potato: 'Erdäpfel',
    green_beans: 'Fisolen',
    bell_pepper: 'Paprika',
    apricot: 'Marille',
    cottage_cheese: 'Topfen',
    horseradish: 'Kren',
    danish_pastry: 'Golatsche',
    cauliflower: 'Karfiol',
    corn: 'Kukuruz',
    pancake: 'Palatschinken',
    eggplant: 'Melanzani',
  },
  // German German (de-DE)
  'Germany': {
    cream: 'Sahne',
    whipped_cream: 'Schlagsahne',
    tomato: 'Tomate',
    potato: 'Kartoffel',
    green_beans: 'grüne Bohnen',
    bell_pepper: 'Paprika',
    apricot: 'Aprikose',
    cottage_cheese: 'Quark',
    horseradish: 'Meerrettich',
    danish_pastry: 'Plundergebäck',
    cauliflower: 'Blumenkohl',
    corn: 'Mais',
    pancake: 'Pfannkuchen',
    eggplant: 'Aubergine',
  },
  // Swiss German (de-CH)
  'Switzerland': {
    cream: 'Rahm',
    whipped_cream: 'Schlagrahm',
    tomato: 'Tomate',
    potato: 'Kartoffel',
    cottage_cheese: 'Quark',
    green_beans: 'grüne Bohnen',
    bell_pepper: 'Peperoni',
    apricot: 'Aprikose',
    corn: 'Mais',
    pancake: 'Pfannkuchen',
    eggplant: 'Aubergine',
  },
  // UK English
  'United Kingdom': {
    cilantro: 'coriander',
    eggplant: 'aubergine',
    zucchini: 'courgette',
    arugula: 'rocket',
    bell_pepper: 'pepper',
    shrimp: 'prawns',
    cookie: 'biscuit',
    chips: 'crisps',
    french_fries: 'chips',
    all_purpose_flour: 'plain flour',
    powdered_sugar: 'icing sugar',
    heavy_cream: 'double cream',
    beet: 'beetroot',
    ground_meat: 'mince',
  },
  // US English
  'United States': {
    coriander: 'cilantro',
    aubergine: 'eggplant',
    courgette: 'zucchini',
    rocket: 'arugula',
    prawns: 'shrimp',
    biscuit: 'cookie',
    crisps: 'chips',
    plain_flour: 'all-purpose flour',
    icing_sugar: 'powdered sugar',
    double_cream: 'heavy cream',
    beetroot: 'beet',
    mince: 'ground meat',
  },
  'United States (East Coast)': {
    coriander: 'cilantro',
    aubergine: 'eggplant',
    courgette: 'zucchini',
    rocket: 'arugula',
    prawns: 'shrimp',
    plain_flour: 'all-purpose flour',
    icing_sugar: 'powdered sugar',
    double_cream: 'heavy cream',
  },
  'United States (West Coast)': {
    coriander: 'cilantro',
    aubergine: 'eggplant',
    courgette: 'zucchini',
    rocket: 'arugula',
    prawns: 'shrimp',
    plain_flour: 'all-purpose flour',
    icing_sugar: 'powdered sugar',
    double_cream: 'heavy cream',
  },
  'United States (Midwest)': {
    coriander: 'cilantro',
    aubergine: 'eggplant',
    courgette: 'zucchini',
    rocket: 'arugula',
    prawns: 'shrimp',
    plain_flour: 'all-purpose flour',
    icing_sugar: 'powdered sugar',
    double_cream: 'heavy cream',
  },
  // French (France)
  'France': {
    eggplant: 'aubergine',
    zucchini: 'courgette',
    bell_pepper: 'poivron',
    shrimp: 'crevettes',
    cream: 'crème',
    whipped_cream: 'crème fouettée',
  },
  // Italian (Italy)
  'Italy': {
    eggplant: 'melanzana',
    zucchini: 'zucchina',
    bell_pepper: 'peperone',
    shrimp: 'gamberi',
    cream: 'panna',
    tomato: 'pomodoro',
  },
  // Spanish (Spain)
  'Spain': {
    eggplant: 'berenjena',
    zucchini: 'calabacín',
    bell_pepper: 'pimiento',
    shrimp: 'gambas',
    cream: 'nata',
    tomato: 'tomate',
  },
  // Dutch (Netherlands)
  'Netherlands': {
    eggplant: 'aubergine',
    zucchini: 'courgette',
    bell_pepper: 'paprika',
    cream: 'slagroom',
    tomato: 'tomaat',
    potato: 'aardappel',
  },
  // Australian English
  'Australia': {
    bell_pepper: 'capsicum',
    shrimp: 'prawns',
    cilantro: 'coriander',
    eggplant: 'eggplant',
    zucchini: 'zucchini',
    arugula: 'rocket',
  },
  // Japanese
  'Japan': {
    green_onion: 'negi',
    daikon: 'daikon radish',
    tofu: 'tofu',
    soy_sauce: 'shoyu',
  },
};

/**
 * Generate regional ingredient context for AI prompts
 * Returns examples specific to the user's region
 *
 * @param regionName - Human-readable region name (e.g., "Austria", "Germany")
 * @returns A string with regional ingredient guidance for AI prompts
 */
export function getRegionalIngredientContext(regionName: string): string {
  const examples = REGIONAL_INGREDIENT_EXAMPLES[regionName];

  if (!examples) {
    return `Adapt ingredient names to be appropriate for ${regionName}.`;
  }

  const exampleList = Object.entries(examples)
    .slice(0, 6) // Limit to 6 examples to keep prompt concise
    .map(([eng, local]) => `"${eng.replace(/_/g, ' ')}" → "${local}"`)
    .join(', ');

  return `Use ${regionName}-specific ingredient names. Examples: ${exampleList}`;
}
