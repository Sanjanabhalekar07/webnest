"use client";

import { useState, type FormEvent } from "react";
import { accountInitials } from "../../lib/auth";
import { useAuth } from "../../providers/auth-provider";

export function AccountDialog({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (!user) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await updateProfile({
        name,
        email,
        currentPassword,
        newPassword,
        confirmPassword,
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="account-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="account-dialog" id="profile-settings-dialog">
        <div className="modal-header">
          <div>
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h2 id="account-title">Profile settings</h2>
          </div>
          <button
            type="button"
            className="close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form
          className="profile-form"
          id="profile-settings-form"
          onSubmit={submit}
        >
          <div className="account-dialog-content" id="profile-settings-content">
            <div className="account-identity">
              <span className="avatar">{accountInitials(user.name)}</span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </span>
            </div>
            {error && (
              <p className="form-error account-feedback" role="alert">
                {error}
              </p>
            )}
            <div className="profile-section">
              <label>
                Username
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                />
              </label>
              <p className="account-help">
                This name appears in the WebNest navigation for your account.
              </p>
            </div>
            <div className="profile-section">
              <h3>Email address</h3>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
            </div>
            <div className="profile-section">
              <h3>Change password</h3>
              <label>
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <p className="account-help">
                Enter your current password to change your email or password.
              </p>
            </div>
          </div>
          <div className="modal-footer account-actions">
            <button className="primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
