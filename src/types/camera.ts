/**
 * Asimov Controller - Camera Types and Mappings
 * Maps mobile app camera modes to underlying MuJoCo simulation camera entities.
 */

export type CameraMode = 'FIRST' | 'THIRD' | 'SECOND';

export type SimulatorCamera =
  | 'first_person_camera'
  | 'chase_camera'
  | 'front_camera';

export interface CameraDefinition {
  mode: CameraMode;
  simCameraName: SimulatorCamera;
  displayName: string;
  description: string;
  attachment: string;
  status: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
}

/**
 * Canonical mapping between mobile camera modes and MuJoCo simulation camera names.
 * - FIRST: Eye-level perspective inside robot neck/head link.
 * - THIRD: Follower camera behind robot pelvis (turns with robot heading).
 * - SECOND: Front external fixed/tracking observation camera.
 */
export const CAMERA_DEFINITIONS: Record<CameraMode, CameraDefinition> = {
  FIRST: {
    mode: 'FIRST',
    simCameraName: 'first_person_camera',
    displayName: '1st Person (Head FPV)',
    description: 'Eye-level forward-facing camera mounted inside neck_pitch_link',
    attachment: 'neck_pitch_link',
    status: 'IMPLEMENTED',
  },
  THIRD: {
    mode: 'THIRD',
    simCameraName: 'chase_camera',
    displayName: '3rd Person (Chase)',
    description: 'Follow-camera positioned 1.5m behind pelvis_link tracking robot heading',
    attachment: 'pelvis_link',
    status: 'IMPLEMENTED',
  },
  SECOND: {
    mode: 'SECOND',
    simCameraName: 'front_camera',
    displayName: '2nd Person (Front Overview)',
    description: 'Elevated front-facing observation camera pointing at robot',
    attachment: 'worldbody / arena front',
    status: 'IMPLEMENTED',
  },
};

export interface CameraMetadata {
  name: string;
  width: number;
  height: number;
  fps: number;
}
