using System;

namespace DragonArena.ReleaseCompliance
{
    // Private save layer must implement these methods atomically and durably.
    // No generic file deletion or guessed PlayerPrefs keys.
    public interface IProgressDeletionStore
    {
        bool PersistSyncBarrier(string profileContext);
        bool HasSyncBarrier(string profileContext);
        bool ClearLocalProgressAndPendingWrites(string profileContext);
    }

    public sealed class ProgressDeletionCoordinator
    {
        private readonly IProgressDeletionStore local;
        private readonly PlayGamesSaveTransport cloud;
        public ProgressDeletionCoordinator(IProgressDeletionStore local, PlayGamesSaveTransport cloud)
        {
            this.local = local ?? throw new ArgumentNullException(nameof(local));
            this.cloud = cloud ?? throw new ArgumentNullException(nameof(cloud));
        }

        // Local deletion is explicit; sync remains blocked even after success.
        // Caller must integrate barrier into EVERY upload and restore path, including startup.
        public bool DeleteLocalOnly(string profile, bool confirmed)
        {
            if (!confirmed || String.IsNullOrWhiteSpace(profile) || cloud.Busy) return false;
            if (!local.PersistSyncBarrier(profile) || !local.HasSyncBarrier(profile)) return false;
            return local.ClearLocalProgressAndPendingWrites(profile);
        }

        // Cloud action deliberately does not clear local progress before cloud readback.
        // On timeout/failure retain barrier and local progress until the user retries or decides otherwise.
        public void RequestCloudAndLocalDeletion(string profile, bool confirmed,
            Action<PlayGamesSaveTransport.Result> done)
        {
            if (!confirmed || String.IsNullOrWhiteSpace(profile) || cloud.Busy ||
                !String.Equals(profile, cloud.LocalProfileContext, StringComparison.Ordinal) ||
                !local.PersistSyncBarrier(profile) || !local.HasSyncBarrier(profile))
            { done(PlayGamesSaveTransport.Result.Failed); return; }
            cloud.RequestSlotDeletion(done);
        }

        public void ObserveAndClearLocal(string profile, Action<PlayGamesSaveTransport.Result, bool> done)
        {
            if (String.IsNullOrWhiteSpace(profile) || !local.HasSyncBarrier(profile) ||
                !String.Equals(profile, cloud.LocalProfileContext, StringComparison.Ordinal))
            { done(PlayGamesSaveTransport.Result.Failed, false); return; }
            cloud.ObserveDeletion(result =>
            {
                bool cleared = result == PlayGamesSaveTransport.Result.NotListed &&
                    String.Equals(profile, cloud.LocalProfileContext, StringComparison.Ordinal) &&
                    local.ClearLocalProgressAndPendingWrites(profile);
                // NotListed is an observation, not a guarantee of all server copies or other devices.
                done(result, cleared);
            });
        }
    }
}
