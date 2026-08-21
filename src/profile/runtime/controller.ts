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

type RequestPlan =
  | {
      mode: "load";
      uid: string;
    }
  | {
      mode: "refresh";
      uid: string;
      snapshot: PublicProfileSnapshot;
    };

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

  const startRequest = async (plan: RequestPlan): Promise<void> => {
    activeRequest?.controller.abort();

    const requestId = ++nextRequestId;
    const controller = new AbortController();
    const request: ActiveRequest = { uid: plan.uid, requestId, controller };
    activeRequest = request;

    if (plan.mode === "refresh") {
      dispatch({
        type: "refresh-started",
        uid: plan.uid,
        requestId,
        snapshot: plan.snapshot,
      });
    } else {
      dispatch({ type: "load-started", uid: plan.uid, requestId });
    }

    try {
      const result = await loader.fetchProfile(plan.uid, controller.signal);

      if (controller.signal.aborted) {
        dispatch({ type: "request-cancelled", uid: plan.uid, requestId });
        return;
      }

      if (result.ok) {
        dispatch({
          type: "request-succeeded",
          uid: plan.uid,
          requestId,
          snapshot: result.snapshot,
        });
      } else {
        dispatch({
          type: "request-failed",
          uid: plan.uid,
          requestId,
          error: result.error,
        });
      }
    } catch {
      if (controller.signal.aborted) {
        dispatch({ type: "request-cancelled", uid: plan.uid, requestId });
      } else {
        dispatch({
          type: "request-failed",
          uid: plan.uid,
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
      return startRequest({ mode: "load", uid });
    },

    refresh() {
      const lastSuccessful = state.lastSuccessful;
      const requestedUid = state.requestedUid ?? lastSuccessful?.requestedUid ?? null;

      if (!lastSuccessful || requestedUid !== lastSuccessful.requestedUid) {
        return Promise.resolve(false);
      }

      return startRequest({
        mode: "refresh",
        uid: requestedUid,
        snapshot: lastSuccessful.snapshot,
      }).then(() => true);
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
