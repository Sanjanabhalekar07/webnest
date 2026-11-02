"use client";

import { useState, type FormEvent } from "react";
import { accountInitials } from "../../lib/auth";
import { useAuth } from "../../providers/auth-provider";

export function AccountDialog({ onClose }: { onClose: () => void }) {
  const { user, rename, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [error, setError] = useState("");
  if (!user) return null;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      rename(name);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Username could not be updated.",
      );
    }
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-title"
    >
      <form className="modal-card account-dialog" onSubmit={save}>
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
        <div className="account-identity">
          <span className="avatar">{accountInitials(user.name)}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
        </div>
        <label className="account-name-field">
          Username
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={60}
            autoFocus
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer account-actions">
          <button
            type="button"
            className="text-button danger"
            onClick={() => {
              logout();
              onClose();
            }}
          >
            Log out
          </button>
          <span>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" type="submit">
              Save username
            </button>
          </span>
        </div>
      </form>
    </div>
  );
}
