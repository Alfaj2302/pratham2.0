import React from 'react';
import { Box } from '@mui/material';
import SearchBar, { SearchBarProps } from '../Searchbar';

// Local wrapper, specific to My Teaching Center — the shared Searchbar
// component (used by L2 Interested Queue and elsewhere) is left untouched.
// Searchbar bakes in its own 20px (theme.spacing(2.5)) left/right padding
// internally; placed directly in this page's filter row that reads as
// unwanted extra inset next to the Status field and the table below (which
// have none of their own). Cancelling it here with a matching negative
// margin gives this page a single, predictable source of spacing instead
// of two paddings stacking.
const LearnerSearchBar: React.FC<SearchBarProps> = (props) => (
  <Box sx={{ mx: '-20px', maxWidth: "600px" }}>
    <SearchBar {...props} />
  </Box>
);

export default LearnerSearchBar;
