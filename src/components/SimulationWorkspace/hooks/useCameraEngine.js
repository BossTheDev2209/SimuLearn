import { useCallback, useRef } from 'react';
import { PIXELS_PER_METER } from '../constants';

export const useCameraEngine = (activeSim, followedObjectId, onSavePhysicsState, gridRef) => {
  const cameraRef = useRef(activeSim?.physicsState?.camera || { zoom: 1, offset: { x: 0, y: 0 } });
  const bodiesRef = useRef(activeSim?.physicsState?.bodies || {});

  const handleCameraChange = useCallback((camera) => {
    cameraRef.current = camera;
    if (onSavePhysicsState) {
      onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current });
    }
  }, [onSavePhysicsState]);

  const handleTeleport = useCallback((wx, wy) => {
    const newOffset = {
      x: -(wx * PIXELS_PER_METER * cameraRef.current.zoom),
      y: (wy * PIXELS_PER_METER * cameraRef.current.zoom)
    };
    handleCameraChange({ ...cameraRef.current, offset: newOffset });
  }, [handleCameraChange]);

  const handlePhysicsChange = useCallback((bodies, isMoving) => {
    bodiesRef.current = bodies;

    if (followedObjectId) {
      const body = bodies[followedObjectId];
      if (body) {
        const zoom = cameraRef.current.zoom;
        const newOffset = {
          x: -(body.position.x * PIXELS_PER_METER * zoom),
          y: (body.position.y * PIXELS_PER_METER * zoom)
        };
        cameraRef.current = { ...cameraRef.current, offset: newOffset };
        gridRef.current?.setCamera({ ...cameraRef.current });
      }
    }

    if (onSavePhysicsState) {
      onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current }, false, isMoving);
    }
  }, [onSavePhysicsState, followedObjectId, gridRef]);

  return {
    cameraRef,
    bodiesRef,
    handleCameraChange,
    handleTeleport,
    handlePhysicsChange
  };
};
