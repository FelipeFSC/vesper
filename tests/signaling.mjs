import { PeerServer } from 'peer';

PeerServer({ port: 0, host: '127.0.0.1', path: '/signal' }, (server) => {
  process.send(server.address().port);
});
