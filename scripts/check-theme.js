const { PrismaClient } = require('../node_modules/.prisma/client');
const p = new PrismaClient();

p.team.findFirst({ select: { id: true, activeTheme: true } })
  .then(t => {
    console.log('Result:', JSON.stringify(t));
    return p.$disconnect();
  })
  .catch(e => {
    console.error('ERROR:', e.message);
    return p.$disconnect();
  });
