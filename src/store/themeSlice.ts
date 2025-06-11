// src/store/themeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ThemeState {
  currentTheme: 'light' | 'dark';
}

const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
const initialState: ThemeState = {
  currentTheme: storedTheme || 'light', // Default to 'light' if nothing in localStorage
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.currentTheme = state.currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.currentTheme);
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.currentTheme = action.payload;
      localStorage.setItem('theme', state.currentTheme);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
