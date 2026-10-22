import type { Category, Recipe } from '../types'
import { newId } from '../lib/id'

export const CATEGORY_COLORS = [
  '#f472b6',
  '#38bdf8',
  '#a78bfa',
  '#4ade80',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
  '#facc15',
]

export function buildSeed(): { categories: Category[]; recipes: Recipe[] } {
  const sweet: Category = { id: newId(), name: 'Sweet', color: CATEGORY_COLORS[0], order: 0 }
  const salty: Category = { id: newId(), name: 'Salty', color: CATEGORY_COLORS[1], order: 1 }
  const candy: Category = { id: newId(), name: 'Candy', color: CATEGORY_COLORS[2], order: 2 }
  const now = Date.now()
  const ing = (name: string, quantity?: string) => ({ id: newId(), name, quantity })
  const note = 'SAMPLE RECIPE: here so you can see the app working. Delete it any time.'

  const recipes: Recipe[] = [
    {
      id: newId(),
      title: 'Banana Oat Pancakes',
      description: `${note}\n\nFluffy, no-flour pancakes. Good with honey.`,
      steps: [
        'Mash the bananas in a bowl until mostly smooth.',
        'Whisk in the eggs, oats, baking powder and cinnamon.',
        'Rest the batter for 5 minutes so the oats soften.',
        'Heat a lightly buttered pan over medium heat.',
        'Cook 2-3 minutes per side until golden. Serve warm.',
      ],
      ingredients: [
        ing('Ripe bananas', '2'),
        ing('Eggs', '2'),
        ing('Rolled oats', '1 cup'),
        ing('Baking powder', '1 tsp'),
        ing('Cinnamon', '1/2 tsp'),
        ing('Butter, for the pan'),
      ],
      checked: [],
      categoryIds: [sweet.id],
      prepMinutes: 10,
      cookMinutes: 15,
      servings: 2,
      imageIds: [],
      isSample: true,
      createdAt: now - 2,
      updatedAt: now - 2,
    },
    {
      id: newId(),
      title: 'Garlic Roasted Potatoes',
      description: `${note}\n\nCrispy outside, soft inside.`,
      steps: [
        'Heat the oven to 220 °C / 425 °F.',
        'Cut the potatoes into 3 cm chunks and dry them well.',
        'Toss with oil, salt, pepper and smashed garlic on a baking tray.',
        'Roast 35-40 minutes, turning once, until deep golden.',
        'Finish with chopped parsley.',
      ],
      ingredients: [
        ing('Potatoes', '800 g'),
        ing('Olive oil', '3 tbsp'),
        ing('Garlic cloves, smashed', '4'),
        ing('Salt', '1 tsp'),
        ing('Black pepper'),
        ing('Fresh parsley'),
      ],
      checked: [],
      categoryIds: [salty.id],
      prepMinutes: 10,
      cookMinutes: 40,
      servings: 4,
      imageIds: [],
      isSample: true,
      createdAt: now - 1,
      updatedAt: now - 1,
    },
    {
      id: newId(),
      title: 'Salted Caramels',
      description: `${note}\n\nSoft homemade caramel candies. Hot sugar burns badly, so take care.`,
      steps: [
        'Line a small pan with parchment.',
        'Cook sugar and water over medium heat, without stirring, until amber.',
        'Off the heat, carefully whisk in the warm cream and butter (it will bubble up).',
        'Return to low heat for 2 minutes, then pour into the pan.',
        'Sprinkle with sea salt, cool completely, then cut and wrap.',
      ],
      ingredients: [
        ing('Sugar', '1 cup'),
        ing('Water', '1/4 cup'),
        ing('Heavy cream, warmed', '1/2 cup'),
        ing('Butter', '4 tbsp'),
        ing('Flaky sea salt', '1/2 tsp'),
      ],
      checked: [],
      categoryIds: [candy.id],
      prepMinutes: 10,
      cookMinutes: 20,
      servings: 20,
      imageIds: [],
      isSample: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
  return { categories: [sweet, salty, candy], recipes }
}
