import { PRESET_COLORS } from '../ObjectAppearancePicker';

export const SIMULATION_PRESETS = {
  default: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 20  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 20 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 0 },
  ],
  projectile: [
    { key: 'angle',         label: 'มุมยิง (θ)',                 unit: '°',     min: 0, max: 90, step: 1, defaultValue: 45    },
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 0   },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 5 },
  ],
  freefall: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 500, step: 0.5, defaultValue: 50  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 10 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 0  },
  ],
};

export function createNewObject(index, presetProps) {
  const values = {};
  presetProps.forEach((p) => { values[p.key] = p.defaultValue; });
  return {
    id: Date.now() + Math.random(),
    name: `วัตถุ ${index + 1}`,
    color: PRESET_COLORS[index % PRESET_COLORS.length],
    shape: 'circle',
    isEditing: false,
    size: 1, 
    values,
  };
}