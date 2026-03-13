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
    const newCamera = { ...cameraRef.current, offset: newOffset };
    handleCameraChange(newCamera);
    gridRef.current?.setCamera(newCamera); // Sync InteractiveGrid
  }, [handleCameraChange, gridRef]);

  const handlePhysicsChange = useCallback((bodies, isMoving) => {
    bodiesRef.current = bodies;

    if (followedObjectId) {
      const body = bodies[followedObjectId];
      if (body) {
        const zoom = cameraRef.current.zoom;
        const targetX = -(body.position.x * PIXELS_PER_METER * zoom);
        const targetY = (body.position.y * PIXELS_PER_METER * zoom);

        const currentX = cameraRef.current.offset.x;
        const currentY = cameraRef.current.offset.y;

        const lerpFactor = 0.15;
        const distSq = (targetX - currentX) ** 2 + (targetY - currentY) ** 2;

        let newOffset;
        if (distSq < 1.0) {
          newOffset = { x: targetX, y: targetY };
        } else {
          newOffset = {
            x: currentX + (targetX - currentX) * lerpFactor,
            y: currentY + (targetY - currentY) * lerpFactor
          };
        }

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
