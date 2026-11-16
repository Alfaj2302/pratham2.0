import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { toPascalCase } from '../../utils/helper';
import { TrainerCenter } from '../../services/myTeachingCenter/TrainerCentersService';

interface CenterSwitcherProps {
  centers: TrainerCenter[];
  selectedCenterId: string;
  onChange: (centerId: string) => void;
}

// Same FormControl/InputLabel/Select shape as scp-teacher-repo's
// CenterSelection.tsx (CenterDropdown) — only rendered by the page when the
// Trainer has more than one assigned Center, since a single-Center Trainer
// has nothing to switch between.
const CenterSwitcher: React.FC<CenterSwitcherProps> = ({ centers, selectedCenterId, onChange }) => {
  const handleChange = (e: SelectChangeEvent<string>) => {
    onChange(e.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id="center-switcher-label">Center</InputLabel>
      <Select
        labelId="center-switcher-label"
        value={selectedCenterId}
        onChange={handleChange}
        label="Center"
      >
        {centers.length === 0 ? (
          <MenuItem disabled>No centers found</MenuItem>
        ) : (
          centers.map((center) => (
            <MenuItem key={center.id} value={center.id}>
              {toPascalCase(center.name)}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export default CenterSwitcher;
