import dots from '../assets/dots.png';
import stars from '../assets/stars.png';
import clouds from '../assets/clouds.png';
import bubbles from '../assets/bubbles.png';
import balloons from '../assets/balloons.png';
import lines from '../assets/lines.png';
import leaves from '../assets/leaves.png';
import arrows from '../assets/arrows.png';
import rockets from '../assets/rockets.png';
import hearts from '../assets/hearts.png';
import planets from '../assets/planets.png';
import shapes from '../assets/shapes.png';
import keys from '../assets/keys.png';
import candy from '../assets/candy.png';
import ribbons from '../assets/ribbons.png';
import flowers from '../assets/flowers.png';
import school from '../assets/school.png';
import whales from '../assets/whales.png';
import purple from '../assets/purple.png';

export const patternLibrary = {
  dots,
  stars,
  clouds,
  bubbles,
  balloons,
  lines,
  leaves,
  arrows,
  rockets,
  hearts,
  planets,
  shapes,
  keys,
  candy,
  ribbons,
  flowers,
  school,
  whales,
  purple,
} as const;

export const getRandomPattern = (): string => {
  const patterns = Object.values(patternLibrary);
  return patterns[Math.floor(Math.random() * patterns.length)];
};