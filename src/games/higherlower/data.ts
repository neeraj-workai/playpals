// Content for "More or Less" (Higher-Lower). Each round picks two items from
// the SAME category and asks whether B's value is higher/lower than A's.
//
// Values are EVERGREEN facts (animal speeds, planet sizes, calories, …) chosen
// so the data never goes stale — deliberately avoiding volatile stats like
// follower counts. Numbers are rounded/approximate; exact precision isn't the
// point, the relative order is. Kid- and adult-friendly.

export interface Item {
  label: string;
  value: number;
  emoji: string;
}

export interface Category {
  name: string;          // shown as the round label, e.g. "Top Speed"
  unit: string;          // metric phrase, e.g. "top speed"
  fmt: (n: number) => string;
  items: Item[];
}

// --- formatters -------------------------------------------------------------
const kmh = (n: number): string => `${n.toLocaleString()} km/h`;
const kg = (n: number): string => (n >= 1000 ? `${(n / 1000).toLocaleString()} t` : `${n.toLocaleString()} kg`);
const yrs = (n: number): string => `${n} yrs`;
const kcal = (n: number): string => `${n.toLocaleString()} kcal`;
const km = (n: number): string => `${n.toLocaleString()} km`;
const m = (n: number): string => `${n.toLocaleString()} m`;
const usd = (n: number): string => `$${n.toLocaleString()}`;
const boxoffice = (n: number): string => `$${(n / 1000).toFixed(2)}B`; // n in millions
const people = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}B` : `${n}M`); // n in millions

export const CATEGORIES: Category[] = [
  {
    name: 'Top Speed', unit: 'top speed', fmt: kmh,
    items: [
      { label: 'Cheetah', value: 112, emoji: '🐆' },
      { label: 'Lion', value: 80, emoji: '🦁' },
      { label: 'Greyhound', value: 74, emoji: '🐕' },
      { label: 'Horse', value: 88, emoji: '🐎' },
      { label: 'Rabbit', value: 56, emoji: '🐇' },
      { label: 'Elephant', value: 40, emoji: '🐘' },
      { label: 'Squirrel', value: 20, emoji: '🐿️' },
      { label: 'Snail', value: 0.05, emoji: '🐌' },
      { label: 'Falcon (dive)', value: 390, emoji: '🦅' },
      { label: 'Sailfish', value: 110, emoji: '🐟' },
      { label: 'Ostrich', value: 70, emoji: '🪶' },
      { label: 'Kangaroo', value: 71, emoji: '🦘' },
      { label: 'Tortoise', value: 0.5, emoji: '🐢' },
      { label: 'Bee', value: 29, emoji: '🐝' },
    ],
  },
  {
    name: 'Heavyweight', unit: 'weight', fmt: kg,
    items: [
      { label: 'Blue whale', value: 150000, emoji: '🐋' },
      { label: 'Elephant', value: 6000, emoji: '🐘' },
      { label: 'Hippo', value: 1500, emoji: '🦛' },
      { label: 'Giraffe', value: 1200, emoji: '🦒' },
      { label: 'Polar bear', value: 450, emoji: '🐻‍❄️' },
      { label: 'Gorilla', value: 160, emoji: '🦍' },
      { label: 'Panda', value: 100, emoji: '🐼' },
      { label: 'Human', value: 62, emoji: '🧍' },
      { label: 'Dog', value: 30, emoji: '🐕' },
      { label: 'Cat', value: 4, emoji: '🐈' },
      { label: 'Chicken', value: 2, emoji: '🐔' },
      { label: 'Mouse', value: 0.02, emoji: '🐁' },
      { label: 'Crocodile', value: 410, emoji: '🐊' },
      { label: 'Ostrich', value: 130, emoji: '🪶' },
    ],
  },
  {
    name: 'Long Life', unit: 'lifespan', fmt: yrs,
    items: [
      { label: 'Giant tortoise', value: 150, emoji: '🐢' },
      { label: 'Human', value: 73, emoji: '🧍' },
      { label: 'Elephant', value: 65, emoji: '🐘' },
      { label: 'Parrot', value: 50, emoji: '🦜' },
      { label: 'Horse', value: 28, emoji: '🐎' },
      { label: 'Dog', value: 13, emoji: '🐕' },
      { label: 'Cat', value: 15, emoji: '🐈' },
      { label: 'Rabbit', value: 9, emoji: '🐇' },
      { label: 'Mouse', value: 2, emoji: '🐁' },
      { label: 'Mayfly', value: 0.003, emoji: '🪰' },
      { label: 'Whale', value: 90, emoji: '🐋' },
      { label: 'Goldfish', value: 10, emoji: '🐟' },
      { label: 'Spider', value: 2, emoji: '🕷️' },
      { label: 'Koi fish', value: 40, emoji: '🐠' },
    ],
  },
  {
    name: 'Calorie Count', unit: 'calories', fmt: kcal,
    items: [
      { label: 'Big Mac', value: 563, emoji: '🍔' },
      { label: 'Pizza slice', value: 285, emoji: '🍕' },
      { label: 'Donut', value: 250, emoji: '🍩' },
      { label: 'Banana', value: 105, emoji: '🍌' },
      { label: 'Apple', value: 95, emoji: '🍎' },
      { label: 'Egg', value: 78, emoji: '🥚' },
      { label: 'Ice cream scoop', value: 137, emoji: '🍦' },
      { label: 'Chocolate bar', value: 230, emoji: '🍫' },
      { label: 'Carrot', value: 25, emoji: '🥕' },
      { label: 'Fries (small)', value: 220, emoji: '🍟' },
      { label: 'Avocado', value: 240, emoji: '🥑' },
      { label: 'Strawberry', value: 4, emoji: '🍓' },
      { label: 'Hot dog', value: 290, emoji: '🌭' },
      { label: 'Cookie', value: 50, emoji: '🍪' },
    ],
  },
  {
    name: 'Planet Size', unit: 'diameter', fmt: km,
    items: [
      { label: 'Jupiter', value: 139820, emoji: '🪐' },
      { label: 'Saturn', value: 116460, emoji: '🪐' },
      { label: 'Uranus', value: 50724, emoji: '🌑' },
      { label: 'Neptune', value: 49244, emoji: '🔵' },
      { label: 'Earth', value: 12742, emoji: '🌍' },
      { label: 'Venus', value: 12104, emoji: '🟡' },
      { label: 'Mars', value: 6779, emoji: '🔴' },
      { label: 'Mercury', value: 4879, emoji: '🟤' },
      { label: 'Moon', value: 3475, emoji: '🌕' },
      { label: 'Pluto', value: 2377, emoji: '⚪' },
      { label: 'Sun', value: 1391000, emoji: '☀️' },
      { label: 'Ganymede', value: 5268, emoji: '🌑' },
    ],
  },
  {
    name: 'How Tall', unit: 'height', fmt: m,
    items: [
      { label: 'Burj Khalifa', value: 828, emoji: '🏙️' },
      { label: 'Eiffel Tower', value: 330, emoji: '🗼' },
      { label: 'Statue of Liberty', value: 93, emoji: '🗽' },
      { label: 'Big Ben', value: 96, emoji: '🕰️' },
      { label: 'Pyramid of Giza', value: 139, emoji: '🔺' },
      { label: 'Empire State', value: 443, emoji: '🏢' },
      { label: 'Mount Everest', value: 8849, emoji: '🏔️' },
      { label: 'Giraffe', value: 5, emoji: '🦒' },
      { label: 'Two-story house', value: 8, emoji: '🏠' },
      { label: 'Christ the Redeemer', value: 38, emoji: '⛪' },
      { label: 'Leaning Tower', value: 56, emoji: '🏛️' },
      { label: 'Tokyo Skytree', value: 634, emoji: '🗼' },
    ],
  },
  {
    name: 'Box Office', unit: 'box office', fmt: boxoffice,
    items: [
      { label: 'Avatar', value: 2923, emoji: '🌿' },
      { label: 'Avengers: Endgame', value: 2799, emoji: '🦸' },
      { label: 'Titanic', value: 2257, emoji: '🚢' },
      { label: 'Star Wars VII', value: 2071, emoji: '⭐' },
      { label: 'Jurassic World', value: 1671, emoji: '🦖' },
      { label: 'The Lion King (2019)', value: 1657, emoji: '🦁' },
      { label: 'Frozen II', value: 1453, emoji: '❄️' },
      { label: 'Harry Potter (final)', value: 1342, emoji: '⚡' },
      { label: 'Barbie', value: 1446, emoji: '🎀' },
      { label: 'Minions', value: 1159, emoji: '🍌' },
      { label: 'Toy Story 4', value: 1073, emoji: '🤠' },
      { label: 'Finding Dory', value: 1029, emoji: '🐠' },
    ],
  },
  {
    name: 'Price Tag', unit: 'price', fmt: usd,
    items: [
      { label: 'Coffee', value: 4, emoji: '☕' },
      { label: 'Movie ticket', value: 12, emoji: '🎟️' },
      { label: 'Video game', value: 60, emoji: '🎮' },
      { label: 'Smartphone', value: 800, emoji: '📱' },
      { label: 'Laptop', value: 1200, emoji: '💻' },
      { label: 'Bicycle', value: 400, emoji: '🚲' },
      { label: 'New car', value: 35000, emoji: '🚗' },
      { label: 'Pizza', value: 15, emoji: '🍕' },
      { label: 'Sneakers', value: 90, emoji: '👟' },
      { label: 'TV', value: 600, emoji: '📺' },
      { label: 'Ice cream cone', value: 3, emoji: '🍦' },
      { label: 'Headphones', value: 150, emoji: '🎧' },
    ],
  },
  {
    name: 'Population', unit: 'population', fmt: people,
    items: [
      { label: 'India', value: 1428, emoji: '🇮🇳' },
      { label: 'China', value: 1425, emoji: '🇨🇳' },
      { label: 'USA', value: 339, emoji: '🇺🇸' },
      { label: 'Indonesia', value: 277, emoji: '🇮🇩' },
      { label: 'Brazil', value: 216, emoji: '🇧🇷' },
      { label: 'Japan', value: 123, emoji: '🇯🇵' },
      { label: 'Germany', value: 84, emoji: '🇩🇪' },
      { label: 'UK', value: 67, emoji: '🇬🇧' },
      { label: 'Australia', value: 26, emoji: '🇦🇺' },
      { label: 'Canada', value: 39, emoji: '🇨🇦' },
      { label: 'Egypt', value: 113, emoji: '🇪🇬' },
      { label: 'Iceland', value: 0.4, emoji: '🇮🇸' },
    ],
  },
];
