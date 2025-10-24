import * as Hapi from '@hapi/hapi';
import { logRequest } from '@nx-hapi-lab/shared';

async function start() {
  const server = Hapi.server({ port: 3000 });
  
  server.route({
    method: 'GET',
    path: '/',
    handler: () => logRequest({ users: ['Alice', 'Bob'] }),
  });

  await server.start();
  console.log('🚀 API Users running on %s', 'http://localhost:3000');
}

start();