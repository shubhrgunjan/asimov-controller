import { RobotController } from '../src/services/controller/RobotController';
import { CommandAck } from '../src/types/controller';

describe('RobotController Service', () => {
  let controller: RobotController;

  beforeEach(() => {
    controller = new RobotController('127.0.0.1', 8852, 8854);
  });

  afterEach(async () => {
    await controller.disconnect();
  });

  it('initializes with zero velocity targets and detached command loop', () => {
    const vel = controller.getTargetVelocity();
    expect(vel.vx).toBe(0.0);
    expect(vel.vy).toBe(0.0);
    expect(vel.wz).toBe(0.0);
  });

  it('buffers target velocities without immediate network spam', () => {
    controller.setTargetVelocity(0.4, 0.0, 0.2);
    const vel = controller.getTargetVelocity();
    expect(vel.vx).toBe(0.4);
    expect(vel.vy).toBe(0.0);
    expect(vel.wz).toBe(0.2);
  });

  it('dispatches commands through RestClient when WebSocket is offline', async () => {
    const mockAck: CommandAck = {
      commandId: 10,
      action: 'stand',
      timestamp: 123456,
      simTime: 5.2,
      status: 'accepted',
      lifecycle: {
        userInput: 'stand',
        validation: 'OK',
        applied: 'EdgeCore.command_stand -> STAND ramp',
      },
    };

    // Spy on restClient.sendCommand
    const sendSpy = jest
      .spyOn(controller.restClient, 'sendCommand')
      .mockResolvedValue(mockAck);

    let ackReceived: CommandAck | null = null;
    controller.onAck((ack) => {
      ackReceived = ack;
    });

    const res = await controller.stand();

    expect(sendSpy).toHaveBeenCalledWith('stand', {});
    expect(res.status).toBe('accepted');
    expect(ackReceived).toEqual(mockAck);
    expect(controller.getLastAck()).toEqual(mockAck);
  });

  it('supports DAMP, STOP, FALL, GETUP, and RESET command APIs', async () => {
    const sendSpy = jest
      .spyOn(controller.restClient, 'sendCommand')
      .mockImplementation(async (action) => ({
        commandId: 1,
        action,
        timestamp: 100,
        simTime: 1.0,
        status: 'accepted',
      }));

    await controller.damp();
    expect(sendSpy).toHaveBeenCalledWith('damp', {});

    await controller.stop();
    expect(sendSpy).toHaveBeenCalledWith('stop', {});

    await controller.fall();
    expect(sendSpy).toHaveBeenCalledWith('fall', {});

    await controller.getup();
    expect(sendSpy).toHaveBeenCalledWith('getup', {});

    await controller.reset(100);
    expect(sendSpy).toHaveBeenCalledWith('reset', { seed: 100 });
  });

  it('handles backend command rejection gracefully', async () => {
    const rejectedAck: CommandAck = {
      commandId: 12,
      action: 'stand',
      timestamp: 200,
      simTime: 2.0,
      status: 'rejected',
      lifecycle: {
        userInput: 'stand',
        validation: 'REJECTED: Firmware fault latched',
      },
    };

    jest.spyOn(controller.restClient, 'sendCommand').mockResolvedValue(rejectedAck);

    const res = await controller.stand();
    expect(res.status).toBe('rejected');
    expect(res.lifecycle?.validation).toContain('REJECTED');
  });
});
