/**
 * Translations for the recipe detail page UI text.
 * The actual recipe content (title, ingredients, steps) remains in its stored locale.
 */

export type RecipeDetailTranslations = {
  backToRecipes: string;
  edit: string;
  share: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  nutrition: string;
  perServing: string;
  energy: string;
  protein: string;
  carbohydrates: string;
  fat: string;
  fiber: string;
  ingredients: string;
  instructions: string;
};

const translations: Record<string, RecipeDetailTranslations> = {
  'en-US': {
    backToRecipes: '← Back to recipes',
    edit: 'Edit',
    share: 'Share',
    prepTime: 'Prep',
    cookTime: 'Cook',
    servings: 'Servings',
    nutrition: 'Nutrition',
    perServing: 'Per serving',
    energy: 'Energy',
    protein: 'Protein',
    carbohydrates: 'Carbohydrates',
    fat: 'Fat',
    fiber: 'Fiber',
    ingredients: 'Ingredients',
    instructions: 'Instructions',
  },
  'de-DE': {
    backToRecipes: '← Zurück zu Rezepten',
    edit: 'Bearbeiten',
    share: 'Teilen',
    prepTime: 'Vorbereitung',
    cookTime: 'Kochen',
    servings: 'Portionen',
    nutrition: 'Nährwerte',
    perServing: 'Pro Portion',
    energy: 'Energie',
    protein: 'Protein',
    carbohydrates: 'Kohlenhydrate',
    fat: 'Fett',
    fiber: 'Ballaststoffe',
    ingredients: 'Zutaten',
    instructions: 'Zubereitung',
  },
  'fr-FR': {
    backToRecipes: '← Retour aux recettes',
    edit: 'Modifier',
    share: 'Partager',
    prepTime: 'Préparation',
    cookTime: 'Cuisson',
    servings: 'Portions',
    nutrition: 'Nutrition',
    perServing: 'Par portion',
    energy: 'Énergie',
    protein: 'Protéines',
    carbohydrates: 'Glucides',
    fat: 'Lipides',
    fiber: 'Fibres',
    ingredients: 'Ingrédients',
    instructions: 'Instructions',
  },
  'es-ES': {
    backToRecipes: '← Volver a recetas',
    edit: 'Editar',
    share: 'Compartir',
    prepTime: 'Preparación',
    cookTime: 'Cocción',
    servings: 'Porciones',
    nutrition: 'Nutrición',
    perServing: 'Por porción',
    energy: 'Energía',
    protein: 'Proteína',
    carbohydrates: 'Carbohidratos',
    fat: 'Grasa',
    fiber: 'Fibra',
    ingredients: 'Ingredientes',
    instructions: 'Instrucciones',
  },
  'it-IT': {
    backToRecipes: '← Torna alle ricette',
    edit: 'Modifica',
    share: 'Condividi',
    prepTime: 'Preparazione',
    cookTime: 'Cottura',
    servings: 'Porzioni',
    nutrition: 'Valori nutrizionali',
    perServing: 'Per porzione',
    energy: 'Energia',
    protein: 'Proteine',
    carbohydrates: 'Carboidrati',
    fat: 'Grassi',
    fiber: 'Fibre',
    ingredients: 'Ingredienti',
    instructions: 'Istruzioni',
  },
  'nl-NL': {
    backToRecipes: '← Terug naar recepten',
    edit: 'Bewerken',
    share: 'Delen',
    prepTime: 'Voorbereiding',
    cookTime: 'Koken',
    servings: 'Porties',
    nutrition: 'Voedingswaarde',
    perServing: 'Per portie',
    energy: 'Energie',
    protein: 'Eiwitten',
    carbohydrates: 'Koolhydraten',
    fat: 'Vet',
    fiber: 'Vezels',
    ingredients: 'Ingrediënten',
    instructions: 'Bereiding',
  },
  'pt-BR': {
    backToRecipes: '← Voltar para receitas',
    edit: 'Editar',
    share: 'Compartilhar',
    prepTime: 'Preparo',
    cookTime: 'Cozimento',
    servings: 'Porções',
    nutrition: 'Nutrição',
    perServing: 'Por porção',
    energy: 'Energia',
    protein: 'Proteína',
    carbohydrates: 'Carboidratos',
    fat: 'Gordura',
    fiber: 'Fibras',
    ingredients: 'Ingredientes',
    instructions: 'Modo de preparo',
  },
  'ja-JP': {
    backToRecipes: '← レシピ一覧に戻る',
    edit: '編集',
    share: '共有',
    prepTime: '下準備',
    cookTime: '調理時間',
    servings: '人分',
    nutrition: '栄養成分',
    perServing: '1人分あたり',
    energy: 'カロリー',
    protein: 'たんぱく質',
    carbohydrates: '炭水化物',
    fat: '脂質',
    fiber: '食物繊維',
    ingredients: '材料',
    instructions: '作り方',
  },
  'zh-CN': {
    backToRecipes: '← 返回食谱列表',
    edit: '编辑',
    share: '分享',
    prepTime: '准备时间',
    cookTime: '烹饪时间',
    servings: '份量',
    nutrition: '营养成分',
    perServing: '每份',
    energy: '能量',
    protein: '蛋白质',
    carbohydrates: '碳水化合物',
    fat: '脂肪',
    fiber: '膳食纤维',
    ingredients: '食材',
    instructions: '做法',
  },
};

// Mapping for locale variants to their base locale
const localeVariantMap: Record<string, string> = {
  'en-GB': 'en-US',
  'de-AT': 'de-DE',
  'de-CH': 'de-DE',
};

/**
 * Get translations for the recipe detail page based on user locale.
 * Falls back to English (en-US) for unsupported locales.
 */
export function getRecipeDetailTranslations(locale: string): RecipeDetailTranslations {
  // Check for locale variant mapping
  const baseLocale = localeVariantMap[locale] ?? locale;

  // Return translations for the locale, falling back to English
  return translations[baseLocale] ?? translations['en-US'];
}
