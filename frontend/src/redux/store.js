import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import authReducer from "./slices/authSlice";
import adminReducer from "./slices/adminSlice";
import facilityReducer from "./slices/facilitySlice";
import faceRecognitionReducer from "./slices/faceRecognitionSlice";
import absenceRequestReducer from "./slices/absenceRequestSlice";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // chỉ lưu trạng thái auth
};

const rootReducer = combineReducers({
  auth: authReducer,
  admin: adminReducer,
  facility: facilityReducer,
  faceRecognition: faceRecognitionReducer,
  absenceRequest: absenceRequestReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
