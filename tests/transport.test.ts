import { RestClient } from '../src/services/transport/RestClient';
import { WebSocketClient } from '../src/services/transport/WebSocketClient';

describe('Transport Services', () => {
  describe('RestClient', () => {
    let client: RestClient;

    beforeEach(() => {
      client = new RestClient('10.0.2.2', 8852, 1000);
    });

    it('constructs correct base URL and camera URLs', () => {
      expect(client.getBaseUrl()).toBe('http://10.0.2.2:8852');
      expect(client.getCameraFrameUrl('first_person_camera', 99)).toBe(
        'http://10.0.2.2:8852/api/camera/frame?camera=first_person_camera&t=99'
      );
      expect(client.getCameraStreamUrl('chase_camera')).toBe(
        'http://10.0.2.2:8852/api/camera/stream?camera=chase_camera'
      );
    });

    it('updates host and port dynamically', () => {
      client.updateEndpoint('192.168.0.50', 9000);
      expect(client.getBaseUrl()).toBe('http://192.168.0.50:9000');
    });

    it('handles network error in sendCommand without throwing', async () => {
      // Mock global fetch to simulate network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable'));

      try {
        const ack = await client.sendCommand('stand');
        expect(ack.status).toBe('error');
        expect(ack.message).toContain('Network unreachable');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('parses valid JSON response from /api/control', async () => {
      const originalFetch = global.fetch;
      const mockResponse = {
        command_id: 42,
        action: 'walk',
        timestamp: 1234.56,
        sim_time: 10.2,
        status: 'accepted',
        lifecycle: { validation: 'OK' },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      try {
        const ack = await client.sendCommand('walk', { vx: 0.3 });
        expect(ack.commandId).toBe(42);
        expect(ack.action).toBe('walk');
        expect(ack.status).toBe('accepted');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('WebSocketClient Lifecycle', () => {
    let wsClient: WebSocketClient;

    beforeEach(() => {
      wsClient = new WebSocketClient('10.0.2.2', 8854, false);
    });

    it('starts in DISCONNECTED state', () => {
      expect(wsClient.getState()).toBe('DISCONNECTED');
      expect(wsClient.isConnected()).toBe(false);
    });

    it('transitions to CONNECTING on connect call', () => {
      // Mock global WebSocket
      const originalWS = global.WebSocket;
      (global as any).WebSocket = jest.fn().mockImplementation(() => ({
        readyState: 0, // CONNECTING
        close: jest.fn(),
      }));

      try {
        wsClient.connect();
        expect(wsClient.getState()).toBe('CONNECTING');
      } finally {
        (global as any).WebSocket = originalWS;
      }
    });

    it('cleanly transitions to DISCONNECTED on disconnect', () => {
      const originalWS = global.WebSocket;
      const mockClose = jest.fn();
      (global as any).WebSocket = jest.fn().mockImplementation(() => ({
        readyState: 1, // OPEN
        close: mockClose,
      }));

      try {
        wsClient.connect();
        wsClient.disconnect();
        expect(wsClient.getState()).toBe('DISCONNECTED');
        expect(mockClose).toHaveBeenCalled();
      } finally {
        (global as any).WebSocket = originalWS;
      }
    });
  });
});
