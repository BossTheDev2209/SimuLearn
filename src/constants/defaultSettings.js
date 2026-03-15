/**
 * Global Constants and Default Options for SimuLearn
 */

export const PIXELS_PER_METER = 100;

export const DEFAULT_SETTINGS = {
  // World Physics
  gravity: 9.8,
  airResistance: false,
  energyConservation: false,
  groundFriction: 0,
  
  // World Visuals
  showCoordinates: true,
  showTrajectory: true,
  gridSnapping: false,
  showCursorCoords: false,
  showResultantVector: false,
  showOffScreenIndicators: true,
  showObjectNames: true, // New setting requested
  
  // Physics Constants (Damping)
  AIR_DAMPING: 0.001,      // Reduced from 0.015 as requested
  GROUND_DAMPING: 0.05,    // Reduced from 0.08 as requested
  SYSTEM_ENERGY_LOSS: 0.02, // Base damping for Energy Conservation toggle
};

export const DEFAULT_OBJECT_PROPS = {
  mass: 1,           // kg
  restitution: 0.6,   // bounciness
  size: 1,           // meters (diameter/width)
  shape: 'circle',
  color: '#FFB65A',
  
  // Initial values
  velocity: 0,
  velocityAngle: 0,
  height: 0,
};

export const PHYSICS_CONFIG = {
  SETTLE_SPEED_PX: 0.5,
  SETTLE_DIST_PX: 2,
};
