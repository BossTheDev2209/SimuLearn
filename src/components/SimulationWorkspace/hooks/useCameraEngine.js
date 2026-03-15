import { useCallback, useRef } from 'react';
import { PIXELS_PER_METER } from '../constants';

export const useCameraEngine = (activeSim, followedObjectId, onSavePhysicsState, gridRef) => {
  const cameraRef = useRef(activeSim?.physicsState?.camera || { zoom: 1, offset: { x: 0, y: 0 } });
  const bodiesRef = useRef(activeSim?.physicsState?.bodies || {});
  const lastFollowTimeRef = useRef(null); // ✅ เก็บเวลา frame ก่อนหน้า

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
    gridRef.current?.setCamera(newCamera);
  }, [handleCameraChange, gridRef]);

  const handlePhysicsChange = useCallback((bodies, isMoving) => {
    bodiesRef.current = bodies;

    if (followedObjectId) {
      const body = bodies[followedObjectId];
      if (body) {
        const zoom = cameraRef.current.zoom;
        const targetX = -(body.position.x * PIXELS_PER_METER * zoom);
        const targetY =  (body.position.y * PIXELS_PER_METER * zoom);

        const currentX = cameraRef.current.offset.x;
        const currentY = cameraRef.current.offset.y;

        // ✅ คำนวณ deltaTime จริง (วินาที)
        const now = performance.now();
        const deltaTime = lastFollowTimeRef.current
          ? Math.min((now - lastFollowTimeRef.current) / 1000, 0.1) // clamp ไม่เกิน 0.1s
          : 1 / 60;
        lastFollowTimeRef.current = now;

        // ✅ Exponential decay lerp — High speed following (defaulting to 20 for better reactivity)
        const FOLLOW_SPEED = 20;
        const lerpFactor = 1 - Math.exp(-FOLLOW_SPEED * deltaTime);

        const distSq = (targetX - currentX) ** 2 + (targetY - currentY) ** 2;
        const MAX_LAG_SQ = 400 * 400; // If more than 400px away, snap instantly

        let newOffset;
        if (distSq < 1.0 || distSq > MAX_LAG_SQ) {
          newOffset = { x: targetX, y: targetY };
        } else {
          newOffset = {
            x: currentX + (targetX - currentX) * lerpFactor,
            y: currentY + (targetY - currentY) * lerpFactor,
          };
        }

        // ✅ Use functional update to avoid overwriting zoom state during scroll interaction
        gridRef.current?.setCamera(prev => ({ ...prev, offset: newOffset }));
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
    handlePhysicsChange,
  };
};