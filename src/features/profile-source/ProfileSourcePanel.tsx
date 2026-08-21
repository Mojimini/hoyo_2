import { useId, useState, type FormEvent } from "react";
import type { ProfileFetchError, ProfileFetchErrorCode } from "../../profile/contracts";
import "./profile-source.css";

export type ProfileSourceStatus = "idle" | "loading" | "success" | "error";

export interface ProfileSourcePanelProps {
  initialUid?: string;
  status?: ProfileSourceStatus;
  error?: ProfileFetchError | null;
  successMessage?: string;
  disabled?: boolean;
  onSubmit: (uid: string) => void | Promise<void>;
  onUidChange?: (uid: string) => void;
}

interface ErrorPresentation {
  title: string;
  message: string;
  action: string;
}

const ERROR_PRESENTATIONS: Record<ProfileFetchErrorCode, ErrorPresentation> = {
  "invalid-uid": {
    title: "Check the UID",
    message: "The profile source rejected this UID. Confirm that you copied the public Honkai: Star Rail UID correctly.",
    action: "Edit the UID and try again.",
  },
  "not-found": {
    title: "Profile not found",
    message: "No public profile could be found for this UID.",
    action: "Check the UID and region, then try again.",
  },
  "private-or-empty-showcase": {
    title: "Public showcase unavailable",
    message: "The account exists, but its public character showcase is private or currently empty.",
    action: "Make the showcase public in-game, add characters, then reload it here.",
  },
  "rate-limited": {
    title: "Profile source is busy",
    message: "The public profile source is temporarily limiting requests.",
    action: "Wait a little before trying again.",
  },
  timeout: {
    title: "Request timed out",
    message: "The public profile source did not respond in time.",
    action: "Try again. If this continues, the source may be temporarily unavailable.",
  },
  "malformed-response": {
    title: "Profile data could not be read",
    message: "The profile source responded, but the returned public showcase data was not in the expected canonical shape.",
    action: "Try again later rather than relying on incomplete data.",
  },
  "provider-unavailable": {
    title: "Profile source unavailable",
    message: "The public profile provider is temporarily unavailable.",
    action: "Try again later. Your UID has not been saved by this component.",
  },
  unknown: {
    title: "Could not load the profile",
    message: "An unexpected profile-source error occurred.",
    action: "Try again. If the problem persists, use the provider error details for diagnosis.",
  },
};

function validateUid(uid: string): string | null {
  if (!uid) {
    return "Enter a Honkai: Star Rail UID.";
  }

  if (!/^\d+$/.test(uid)) {
    return "UID must contain numbers only.";
  }

  return null;
}

function getErrorPresentation(error: ProfileFetchError): ErrorPresentation {
  const base = ERROR_PRESENTATIONS[error.code];

  if (error.code === "rate-limited" && error.retryAfterSeconds != null) {
    return {
      ...base,
      action: `Try again in about ${error.retryAfterSeconds} second${error.retryAfterSeconds === 1 ? "" : "s"}.`,
    };
  }

  return base;
}

export function ProfileSourcePanel({
  initialUid = "",
  status = "idle",
  error = null,
  successMessage = "Public showcase data loaded successfully.",
  disabled = false,
  onSubmit,
  onUidChange,
}: ProfileSourcePanelProps) {
  const [uid, setUid] = useState(initialUid);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const validationId = `${inputId}-validation`;
  const isLoading = status === "loading";
  const isSubmitDisabled = disabled || isLoading;
  const providerError = status === "error" && error ? getErrorPresentation(error) : null;

  function handleUidChange(value: string) {
    setUid(value);

    if (validationMessage) {
      setValidationMessage(validateUid(value.trim()));
    }

    onUidChange?.(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    const normalizedUid = uid.trim();
    const nextValidationMessage = validateUid(normalizedUid);
    setValidationMessage(nextValidationMessage);

    if (nextValidationMessage) {
      return;
    }

    void onSubmit(normalizedUid);
  }

  const describedBy = validationMessage ? `${helpId} ${validationId}` : helpId;

  return (
    <section className="profile-source" aria-labelledby={`${inputId}-title`} aria-busy={isLoading}>
      <div className="profile-source__intro">
        <div className="profile-source__eyebrow">Public profile source</div>
        <h2 id={`${inputId}-title`} className="profile-source__title">Load a Honkai: Star Rail showcase</h2>
        <p className="profile-source__description">
          Enter a public in-game UID to load the character showcase exposed by the selected profile source.
        </p>
      </div>

      <div className="profile-source__privacy" role="note" aria-label="Privacy and access scope">
        <span className="profile-source__privacy-icon" aria-hidden="true">✓</span>
        <div>
          <strong>Public showcase data only</strong>
          <p>
            This UI never needs HoYoLAB cookies, passwords, login tokens, or other account credentials.
          </p>
        </div>
      </div>

      <form className="profile-source__form" onSubmit={handleSubmit} noValidate>
        <label className="profile-source__label" htmlFor={inputId}>Honkai: Star Rail UID</label>
        <p id={helpId} className="profile-source__help">
          Use the numeric UID shown in-game. The connected loader decides how to retrieve the public profile.
        </p>

        <div className="profile-source__controls">
          <input
            id={inputId}
            className="profile-source__input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={uid}
            onChange={(event) => handleUidChange(event.target.value)}
            aria-describedby={describedBy}
            aria-invalid={validationMessage ? true : undefined}
            disabled={disabled}
            placeholder="e.g. 800123456"
          />
          <button
            className="profile-source__submit"
            type="submit"
            disabled={isSubmitDisabled}
          >
            {isLoading ? "Loading profile…" : "Load profile"}
          </button>
        </div>

        {validationMessage ? (
          <p id={validationId} className="profile-source__validation" role="alert">
            <span aria-hidden="true">!</span>
            {validationMessage}
          </p>
        ) : null}
      </form>

      <div className="profile-source__status" aria-live="polite" aria-atomic="true">
        {isLoading ? (
          <div className="profile-source__notice profile-source__notice--loading">
            <span className="profile-source__notice-icon" aria-hidden="true">…</span>
            <div>
              <strong>Loading public showcase</strong>
              <p>Please keep this page open while the connected profile loader responds.</p>
            </div>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="profile-source__notice profile-source__notice--success">
            <span className="profile-source__notice-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Profile loaded</strong>
              <p>{successMessage}</p>
            </div>
          </div>
        ) : null}

        {providerError ? (
          <div className="profile-source__notice profile-source__notice--error" role="alert">
            <span className="profile-source__notice-icon" aria-hidden="true">!</span>
            <div>
              <strong>{providerError.title}</strong>
              <p>{providerError.message}</p>
              <p className="profile-source__notice-action">{providerError.action}</p>
              {error?.message ? (
                <details className="profile-source__error-details">
                  <summary>Technical details</summary>
                  <p>{error.message}</p>
                  {error.provider ? <p>Source: {error.provider}</p> : null}
                </details>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
