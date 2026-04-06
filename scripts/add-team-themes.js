const { PrismaClient } = require('../node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const items = [
    { key: 'team_theme_gold', name: 'Team Gold Theme', description: 'A rich gold & black theme for your team page.', category: 'social', subcategory: 'team_theme', price: 750, isConsumable: false, iconEmoji: '🌟', metadata: { value: 'gold', primaryColor: '#FDE74C', accentColor: '#FFB86B' } },
    { key: 'team_theme_neon', name: 'Team Neon Theme', description: 'Electric cyan & purple neon theme for your team page.', category: 'social', subcategory: 'team_theme', price: 750, isConsumable: false, iconEmoji: '⚡', metadata: { value: 'neon', primaryColor: '#00FFFF', accentColor: '#CC00FF' } },
    { key: 'team_theme_crimson', name: 'Team Crimson Theme', description: 'Deep red & dark theme for your team page.', category: 'social', subcategory: 'team_theme', price: 750, isConsumable: false, iconEmoji: '🔥', metadata: { value: 'crimson', primaryColor: '#DC2626', accentColor: '#F97316' } },
  ];

  for (const item of items) {
    await p.storeItem.upsert({ where: { key: item.key }, update: item, create: item });
    console.log('Upserted:', item.key);
  }

  await p.$disconnect();
}

main();
