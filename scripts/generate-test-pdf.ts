/**
 * Script to generate a test PDF for PDF extraction integration tests
 *
 * Run with: npx tsx scripts/generate-test-pdf.ts
 */

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

interface RecipeData {
  title: string;
  servings: number;
  prepTimeMinutes: number;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
  ingredients: string[];
  steps: string[];
}

const recipe1: RecipeData = {
  title: 'Exotischer Obstsalat mit Kokosquark',
  servings: 2,
  prepTimeMinutes: 15,
  nutrition: {
    calories: 335,
    protein: 23,
    fat: 13,
    carbohydrates: 30,
  },
  ingredients: [
    '0,5 Ananas (frisch)',
    '1 Apfel',
    '1 Handvoll Heidelbeeren',
    '300 g Magerquark',
    '80 ml Kokosmilch',
    '2 EL Kokosflocken',
    '3 Tropfen Süßstoff',
    '6 Minzblätter',
  ],
  steps: [
    'Ananas schälen und in mundgerechte Stücke schneiden. Apfel waschen, entkernen und würfeln.',
    'Magerquark mit Kokosmilch, Kokosflocken und Süßstoff verrühren.',
    'Obst auf Teller anrichten, Kokosquark darüber geben und mit Minzblättern garnieren.',
  ],
};

const recipe2: RecipeData = {
  title: 'Pfirsich-Quark mit gerösteten Mandelstiften',
  servings: 2,
  prepTimeMinutes: 10,
  nutrition: {
    calories: 295,
    protein: 24,
    fat: 14,
    carbohydrates: 17,
  },
  ingredients: [
    '300 g Speisequark',
    '100 g Joghurt (1,5%)',
    '4 Tropfen Süßstoff',
    '1 Prise Vanille',
    '2 Pfirsiche (reif)',
    '2 EL Mandelstifte',
  ],
  steps: [
    'Speisequark mit Joghurt, Süßstoff und Vanille glatt rühren.',
    'Pfirsiche waschen, halbieren, entsteinen und in Spalten schneiden.',
    'Mandelstifte in einer Pfanne ohne Fett goldbraun rösten. Quark in Schalen geben, Pfirsiche darauf anrichten und mit Mandeln bestreuen.',
  ],
};

async function generateRecipePage(
  pdfDoc: PDFDocument,
  recipe: RecipeData,
  font: PDFFont,
  boldFont: PDFFont
): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  let yPosition = height - 50;
  const leftMargin = 50;
  const lineHeight = 18;

  // Title
  page.drawText(recipe.title, {
    x: leftMargin,
    y: yPosition,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 35;

  // Servings and time
  page.drawText(`Portionen: ${recipe.servings}    Zubereitungszeit: ${recipe.prepTimeMinutes} Minuten`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 30;

  // Nutrition header
  page.drawText('Nährwerte pro Portion:', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight;

  // Nutrition values
  const nutritionText = `${recipe.nutrition.calories} kcal | Eiweiß: ${recipe.nutrition.protein} g | Fett: ${recipe.nutrition.fat} g | Kohlenhydrate: ${recipe.nutrition.carbohydrates} g`;
  page.drawText(nutritionText, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 35;

  // Ingredients header
  page.drawText('Zutaten:', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight + 5;

  // Ingredients list
  for (const ingredient of recipe.ingredients) {
    page.drawText(`• ${ingredient}`, {
      x: leftMargin + 10,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  }
  yPosition -= 20;

  // Steps header
  page.drawText('Zubereitung:', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight + 5;

  // Steps
  recipe.steps.forEach((step, index) => {
    const stepText = `${index + 1}. ${step}`;
    // Word wrap for long steps (simple implementation)
    const words = stepText.split(' ');
    let line = '';
    const maxWidth = width - leftMargin - 50;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, 11);

      if (testWidth > maxWidth && line) {
        page.drawText(line, {
          x: leftMargin + 10,
          y: yPosition,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      page.drawText(line, {
        x: leftMargin + 10,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }
    yPosition -= 5;
  });
}

async function main() {
  const pdfDoc = await PDFDocument.create();

  // Use standard fonts (they support basic Latin characters but not all German umlauts perfectly)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add recipe pages
  await generateRecipePage(pdfDoc, recipe1, font, boldFont);
  await generateRecipePage(pdfDoc, recipe2, font, boldFont);

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  const outputPath = path.join(
    __dirname,
    '../src/lib/__tests__/fixtures/test-recipes.pdf'
  );

  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Generated test PDF: ${outputPath}`);
  console.log(`PDF size: ${pdfBytes.length} bytes`);
}

main().catch(console.error);
