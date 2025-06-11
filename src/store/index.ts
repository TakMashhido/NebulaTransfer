import {configureStore} from '@reduxjs/toolkit'
import {PeerReducer} from "./peer/peerReducer";
import {ConnectionReducer} from "./connection/connectionReducer";
import themeReducer from './themeSlice';
import logReducer from './logSlice'; // Import the new log reducer

export const store = configureStore({
    reducer: {
        peer: PeerReducer,
        connection: ConnectionReducer,
        theme: themeReducer,
        log: logReducer, // Add log reducer here
    }
})

window.store = store

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
