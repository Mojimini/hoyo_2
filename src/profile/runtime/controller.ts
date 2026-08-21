import type { ProfileFetchError, PublicProfileLoader, PublicProfileSnapshot } from "../contracts";
import {
  initialProfileRuntimeState,
  reduceProfileRuntimeState,
  type ProfileRuntimeAction,
  type ProfileRuntimeState,
} from "./state";

export type ProfileRuntimeListener = (state: ProfileRuntimeState) => void;

export interface ProfileRuntimeController {
  getState(): ProfileRuntimeState;
  subscribe(listener: ProfileRuntimeListener): () => void;
  load(uid: string): Promise<void>;
  refresh(): Promise<boolean>;
  cancel(): void;
}

interface ActiveRequest {
  uid: string;
  requestId: number;
  controller: AbortController;
}

const unexpectedLoaderError: ProfileFetchError = {
  code: "unknown",
  message: "The public profile loader failed unexpectedly.",
};

export function createProfileRuntimeController(loader: PublicProfileLoader): ProfileRuntimeController {
  let state = initialProfileRuntimeState;
  let nextRequestId = 0;
  let activeRequest: ActiveRequest | null = null;
  const listeners = new Set<ProfileRuntimeListener>();

  const dispatch = (action: ProfileRuntimeAction) => {
    const nextState = reduceProfileRuntimeState(state, action);
    if (nextState === state) {
      return;
    }

    state = nextState;
    listeners.forEach((listener) => listener(state));
  };

  const startRequest = async (
    uid: string,
    mode: "load" | "refresh",
    snapshot?: PublicProfileSnapshot,
  ): Promise<void> => {
    activeRequest?.controller.abort();

    const requestId = ++nextRequestId;
    const controller = new AbortController();
    const request: ActiveRequest = { uid, requestId, controller };
    activeRequest = request;

    if (mode === "refresh") {
      if (!snapshot) {
        return;
      }

      dispatch({
        type: "refresh-started",
        uid,
        requestId,
        snapshot,
      });
    } else {
      dispatch({ type: "load-started", uid, requestId });
    }

    try {
      const result = await loader.fetchProfile(uid, controller.signal);

      if (controller.signal.aborted) {
        dispatch({ type: "request-cancelled", uid, requestId });
        return;
      }

      if (result.ok) {
        dispatch({
          type: "request-succeeded",
          uid,
          requestId,
          snapshot: result.snapshot,
        });
      } else {
        dispatch({
          type: "request-failed",
          uid,
          requestId,
          error: result.error,
        });
      }
    } catch {
      if (controller.signal.aborted) {
        dispatch({ type: "request-cancelled", uid, requestId });
      } else {
        dispatch({
          type: "request-failed",
          uid,
          requestId,
          error: unexpectedLoaderError,
        });
      }
    } finally {
      if (activeRequest?.requestId === requestId) {
        activeRequest = null;
      }
    }
  };

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    load(uid) {
      return startRequest(uid, "load");
    },

    refresh() {
      const lastSuccessful = state.lastSuccessful;
      const requestedUid = state.requestedUid ?? lastSuccessful?.requestedUid ?? null;

      if (!lastSuccessful || requestedUid !== lastSuccessful.requestedUid) {
        return Promise.resolve(false);
      }

      return startRequest(requestedUid, "refresh", lastSuccessful.snapshot).then(() => true);
    },

    cancel() {
      const request = activeRequest;
      if (!request) {
        return;
      }

      activeRequest = null;
      request.controller.abort();
      dispatch({
        type: "request-cancelled",
        uid: request.uid,
        requestId: request.requestId,
      });
    },
  };
}
