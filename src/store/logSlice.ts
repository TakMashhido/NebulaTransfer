// src/store/logSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LogEntry {
  id: string; // For unique key in lists
  timestamp: number;
  message: string;
  type?: 'info' | 'warning' | 'error'; // Optional type
}

export interface LogState {
  logs: LogEntry[];
}

const initialState: LogState = {
  logs: [],
};

let logEntryIdCounter = 0;

const logSlice = createSlice({
  name: 'log',
  initialState,
  reducers: {
    addLog: (state, action: PayloadAction<string | { message: string; type?: 'info' | 'warning' | 'error' }>) => {
      const entry: LogEntry = {
        id: `log-${logEntryIdCounter++}`,
        timestamp: Date.now(),
        message: typeof action.payload === 'string' ? action.payload : action.payload.message,
        type: typeof action.payload === 'object' ? action.payload.type || 'info' : 'info',
      };
      state.logs.push(entry);
      // Optional: Keep only the last N logs
      // if (state.logs.length > 100) {
      //   state.logs.splice(0, state.logs.length - 100);
      // }
    },
    clearLogs: (state) => {
      state.logs = [];
      logEntryIdCounter = 0;
    },
  },
});

export const { addLog, clearLogs } = logSlice.actions;
export default logSlice.reducer;
