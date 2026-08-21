import type { ProfileFetchError, PublicProfileSnapshot } from "../contracts";

export interface ProfileRuntimeLastSuccessful {
  requestedUid: string;
  snapshot: PublicProfileSnapshot;
}

interface ProfileRuntimeStateBase {
  lastSuccessful: ProfileRuntimeLastSuccessful | null;
}

export interface ProfileRuntimeIdleState extends ProfileRuntimeStateBase {
  status: "idle";
  requestedUid: null;
}

export interface ProfileRuntimeLoadingState extends ProfileRuntimeStateBase {
  status: "loading";
  requestedUid: string;
  requestId: number;
}

export interface ProfileRuntimeSuccessState extends ProfileRuntimeStateBase {
  status: "success";
  requestedUid: string;
  snapshot: PublicProfileSnapshot;
}

export interface ProfileRuntimeRefreshingState extends ProfileRuntimeStateBase {
  status: "refreshing";
  requestedUid: string;
  requestId: number;
  snapshot: PublicProfileSnapshot;
  stale: true;
}

export interface ProfileRuntimeErrorState extends ProfileRuntimeStateBase {
  status: "error";
  requestedUid: string;
  error: ProfileFetchError;
}

export type ProfileRuntimeState =
  | ProfileRuntimeIdleState
  | ProfileRuntimeLoadingState
  | ProfileRuntimeSuccessState
  | ProfileRuntimeRefreshingState
  | ProfileRuntimeErrorState;

export type ProfileRuntimeAction =
  | {
      type: "load-started";
      uid: string;
      requestId: number;
    }
  | {
      type: "refresh-started";
      uid: string;
      requestId: number;
      snapshot: PublicProfileSnapshot;
    }
  | {
      type: "request-succeeded";
      uid: string;
      requestId: number;
      snapshot: PublicProfileSnapshot;
    }
  | {
      type: "request-failed";
      uid: string;
      requestId: number;
      error: ProfileFetchError;
    }
  | {
      type: "request-cancelled";
      uid: string;
      requestId: number;
    };

export const initialProfileRuntimeState: ProfileRuntimeState = {
  status: "idle",
  requestedUid: null,
  lastSuccessful: null,
};

function matchesActiveRequest(
  state: ProfileRuntimeState,
  uid: string,
  requestId: number,
): state is ProfileRuntimeLoadingState | ProfileRuntimeRefreshingState {
  return (
    (state.status === "loading" || state.status === "refreshing") &&
    state.requestedUid === uid &&
    state.requestId === requestId
  );
}

export function reduceProfileRuntimeState(
  state: ProfileRuntimeState,
  action: ProfileRuntimeAction,
): ProfileRuntimeState {
  switch (action.type) {
    case "load-started":
      return {
        status: "loading",
        requestedUid: action.uid,
        requestId: action.requestId,
        lastSuccessful: state.lastSuccessful,
      };

    case "refresh-started":
      return {
        status: "refreshing",
        requestedUid: action.uid,
        requestId: action.requestId,
        snapshot: action.snapshot,
        stale: true,
        lastSuccessful: {
          requestedUid: action.uid,
          snapshot: action.snapshot,
        },
      };

    case "request-succeeded":
      if (!matchesActiveRequest(state, action.uid, action.requestId)) {
        return state;
      }

      return {
        status: "success",
        requestedUid: action.uid,
        snapshot: action.snapshot,
        lastSuccessful: {
          requestedUid: action.uid,
          snapshot: action.snapshot,
        },
      };

    case "request-failed":
      if (!matchesActiveRequest(state, action.uid, action.requestId)) {
        return state;
      }

      return {
        status: "error",
        requestedUid: action.uid,
        error: action.error,
        lastSuccessful: state.lastSuccessful,
      };

    case "request-cancelled":
      if (!matchesActiveRequest(state, action.uid, action.requestId)) {
        return state;
      }

      if (state.status === "refreshing") {
        return {
          status: "success",
          requestedUid: state.requestedUid,
          snapshot: state.snapshot,
          lastSuccessful: state.lastSuccessful,
        };
      }

      return {
        status: "idle",
        requestedUid: null,
        lastSuccessful: state.lastSuccessful,
      };
  }
}
