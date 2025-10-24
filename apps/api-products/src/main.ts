import * as Hapi from '@hapi/hapi';
import { logRequest } from '@nx-hapi-lab/shared';
import { product } from '@nx-hapi-lab/product';

async function start() {
  const server = Hapi.server({ port: 3000 });
    
  server.route({
    method: 'GET',
    path: '/',
    handler: () => logRequest({ products: ['Alice', 'Bob', product()] }),
  });

  await server.start();
  console.log('🚀 API Products running on %s', 'http://localhost:3000');
}

start();