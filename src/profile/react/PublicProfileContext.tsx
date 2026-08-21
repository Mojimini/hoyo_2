import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { ProfileFetchError, PublicProfileSnapshot } from "../contracts";
import {
  createProfileRuntimeController,
  initialProfileRuntimeState,
  type ProfileRuntimeState,
} from "../runtime";
import { createPublicProfileClient } from "../integration/publicProfileClient";

export interface PublicProfileSessionValue {
  state: ProfileRuntimeState;
  snapshot: PublicProfileSnapshot | null;
  error: ProfileFetchError | null;
  isStale: boolean;
  activeUid: string | null;
  load(uid: string): Promise<void>;
  refresh(): Promise<boolean>;
}

const PublicProfileContext = createContext<PublicProfileSessionValue | null>(null);

function visibleSnapshot(state: ProfileRuntimeState): PublicProfileSnapshot | null {
  if (state.status === "success" || state.status === "refreshing") {
    return state.snapshot;
  }

  if (
    state.status === "error" &&
    state.lastSuccessful &&
    state.lastSuccessful.requestedUid === state.requestedUid
  ) {
    return state.lastSuccessful.snapshot;
  }

  return null;
}

export function PublicProfileProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => createPublicProfileClient());
  const [controller] = useState(() => createProfileRuntimeController(client.loader));
  const [state, setState] = useState<ProfileRuntimeState>(initialProfileRuntimeState);

  useEffect(() => controller.subscribe(setState), [controller]);

  const load = useCallback((uid: string) => controller.load(uid), [controller]);

  const refresh = useCallback(() => {
    const current = controller.getState();
    const uid = current.requestedUid ?? current.lastSuccessful?.requestedUid ?? null;
    if (!uid) {
      return Promise.resolve(false);
    }

    client.invalidate(uid);
    return controller.refresh();
  }, [client, controller]);

  const snapshot = useMemo(() => visibleSnapshot(state), [state]);
  const isStale =
    state.status === "refreshing" ||
    (state.status === "error" &&
      state.lastSuccessful !== null &&
      state.lastSuccessful.requestedUid === state.requestedUid);

  const value = useMemo<PublicProfileSessionValue>(
    () => ({
      state,
      snapshot,
      error: state.status === "error" ? state.error : null,
      isStale,
      activeUid: state.requestedUid ?? snapshot?.source.uid ?? null,
      load,
      refresh,
    }),
    [isStale, load, refresh, snapshot, state],
  );

  return <PublicProfileContext.Provider value={value}>{children}</PublicProfileContext.Provider>;
}

export function usePublicProfile(): PublicProfileSessionValue {
  const value = useContext(PublicProfileContext);
  if (!value) {
    throw new Error("usePublicProfile must be used inside PublicProfileProvider");
  }
  return value;
}
