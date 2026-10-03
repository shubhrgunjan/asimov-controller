import { CAMERA_DEFINITIONS } from '../src/types/camera';
import { CameraService } from '../src/services/camera/CameraService';
import { RestClient } from '../src/services/transport/RestClient';

describe('Camera Subsystem & Mapping', () => {
  it('maps FIRST camera mode to first_person_camera (eye-level)', () => {
    const def = CAMERA_DEFINITIONS['FIRST'];
    expect(def.simCameraName).toBe('first_person_camera');
    expect(def.attachment).toContain('neck_pitch_link');
    expect(def.status).toBe('IMPLEMENTED');
  });

  it('maps THIRD camera mode to chase_camera (pelvis follow)', () => {
    const def = CAMERA_DEFINITIONS['THIRD'];
    expect(def.simCameraName).toBe('chase_camera');
    expect(def.attachment).toContain('pelvis_link');
    expect(def.status).toBe('IMPLEMENTED');
  });

  it('maps SECOND camera mode to front_camera (arena overview)', () => {
    const def = CAMERA_DEFINITIONS['SECOND'];
    expect(def.simCameraName).toBe('front_camera');
    expect(def.status).toBe('IMPLEMENTED');
  });

  describe('CameraService', () => {
    let restClient: RestClient;
    let cameraService: CameraService;

    beforeEach(() => {
      restClient = new RestClient('192.168.1.50', 8852);
      cameraService = new CameraService(restClient, 'THIRD');
    });

    it('defaults to THIRD person camera', () => {
      expect(cameraService.getMode()).toBe('THIRD');
      expect(cameraService.getSimCameraName()).toBe('chase_camera');
    });

    it('switches mode and notifies listeners', () => {
      let notifiedMode = '';
      cameraService.onCameraChange((mode) => {
        notifiedMode = mode;
      });

      cameraService.setMode('FIRST');
      expect(cameraService.getMode()).toBe('FIRST');
      expect(cameraService.getSimCameraName()).toBe('first_person_camera');
      expect(notifiedMode).toBe('FIRST');
    });

    it('generates valid HTTP snapshot URLs with cache-buster', () => {
      cameraService.setMode('THIRD');
      const url = cameraService.getSnapshotUrl(12345);
      expect(url).toBe('http://192.168.1.50:8852/api/camera/frame?camera=chase_camera&t=12345');
    });

    it('generates valid MJPEG stream URLs', () => {
      cameraService.setMode('SECOND');
      const url = cameraService.getStreamUrl();
      expect(url).toBe('http://192.168.1.50:8852/api/camera/stream?camera=front_camera');
    });
  });
});
