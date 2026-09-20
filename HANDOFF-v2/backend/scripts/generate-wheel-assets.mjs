import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'public', 'wheel-catalog');
await mkdir(root, { recursive: true });

const wheels = [
  ['437m-ferric', '#a7abb0', 5, 18], ['437m-black', '#24272c', 5, 18],
  ['chr-titanium', '#858b93', 10, 10], ['chr-silver', '#c5c9cd', 10, 10],
  ['hf3-black', '#1a1c20', 7, 14], ['hf3-bronze', '#936947', 7, 14],
  ['tmb-bronze', '#9f7148', 6, 20], ['tmb-silver', '#d0d3d6', 6, 20],
];

for (const [name, color, spokes, twist] of wheels) {
  const lines = Array.from({ length: spokes }, (_, index) => {
    const rotation = (360 / spokes) * index;
    return `<path d="M256 234 L242 82 Q256 62 270 82 L256 234" transform="rotate(${rotation + twist} 256 256)" fill="${color}" stroke="#f3f3f3" stroke-opacity=".3" stroke-width="3"/>`;
  }).join('');
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <circle cx="256" cy="256" r="208" fill="#15171b" stroke="#3a3e45" stroke-width="18"/>
    <circle cx="256" cy="256" r="174" fill="#090a0d" stroke="${color}" stroke-width="16"/>
    ${lines}<circle cx="256" cy="256" r="48" fill="${color}" stroke="#0b0c0f" stroke-width="12"/>
    <circle cx="256" cy="256" r="14" fill="#17191e"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(root, `${name}.png`));
}

console.log(`Created ${wheels.length} original catalog illustrations in ${root}`);
