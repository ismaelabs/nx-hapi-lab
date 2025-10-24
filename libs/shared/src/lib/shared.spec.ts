import { logRequest } from './shared';

describe('shared', () => {
  it('should work', () => {
    const data = {test: 'alguma coisa'}
    expect(logRequest(data)).toEqual({ success: true, data });
  });
});