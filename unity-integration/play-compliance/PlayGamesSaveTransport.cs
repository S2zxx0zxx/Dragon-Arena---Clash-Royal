// Original integration adapter. Requires official Google Play Games Unity v2 plugin.
// Copy into private Unity Assets only after review. Call exclusively on Unity main thread.
using System;
using System.Collections.Generic;
using System.Linq;
using GooglePlayGames;
using GooglePlayGames.BasicApi;
using GooglePlayGames.BasicApi.SavedGame;

namespace DragonArena.ReleaseCompliance
{
    public sealed class PlayGamesSaveTransport
    {
        public enum Result { Unavailable, Busy, Failed, ProfileChanged, Read, ConflictPending,
            Stale, CommitAcceptedNotCloudConfirmed, DeleteRequested, NotListed, StillListed }
        public const string Slot = "dragon-arena-v4-progress";
        public const int MaxBytes = 2 * 1024 * 1024;
        private bool busy;
        private int generation;
        private string profile;
        private ISavedGameMetadata opened;
        private byte[] observed;
        public string LocalProfileContext { get { return profile; } }
        public bool Busy { get { return busy; } }

        // PGS ID is for local isolation only; not an account credential or server identity.
        public void Authenticate(Action<bool> callback)
        {
            if (busy) { callback(false); return; }
            busy = true;
            int token = ++generation;
            profile = null; opened = null; observed = null;
            PlayGamesPlatform.Instance.Authenticate(status =>
            {
                if (token != generation) return;
                busy = false;
                if (status == SignInStatus.Success && PlayGamesPlatform.Instance.IsAuthenticated())
                    profile = PlayGamesPlatform.Instance.GetUserId();
                callback(!String.IsNullOrEmpty(profile));
            });
        }

        private bool SameProfile(string expected)
        {
            return !String.IsNullOrEmpty(expected) &&
                PlayGamesPlatform.Instance.IsAuthenticated() &&
                String.Equals(expected, PlayGamesPlatform.Instance.GetUserId(), StringComparison.Ordinal);
        }
        private bool Begin(Action<Result> done)
        {
            if (busy) { done(Result.Busy); return false; }
            if (!SameProfile(profile)) { opened = null; observed = null; done(Result.Unavailable); return false; }
            busy = true; return true;
        }
        private void End(Result r, Action<Result> done)
        {
            busy = false;
            if (r != Result.Read) { opened = null; observed = null; }
            done(r);
        }
        // A caller must display the actual progress summaries and only invoke choose
        // after explicit consent. Leaving a conflict unresolved deliberately blocks writes.
        // If consent is declined, keep the transport busy and local-only until a new app session.
        // Do not force a new competing open while the SDK operation is pending.
        public void Read(Action<byte[], byte[], Action<bool>> onConflict,
            Action<Result, byte[]> done)
        {
            Action<Result> fail = r => done(r, null);
            if (!Begin(fail)) return;
            string expected = profile;
            opened = null; observed = null;
            var client = PlayGamesPlatform.Instance.SavedGame;
            client.OpenWithManualConflictResolution(Slot, DataSource.ReadNetworkOnly, true,
                (resolver, a, aBytes, b, bBytes) =>
                {
                    if (!SameProfile(expected)) { fail(Result.ProfileChanged); return; }
                    if (aBytes == null || bBytes == null || aBytes.Length > MaxBytes || bBytes.Length > MaxBytes)
                    { fail(Result.ConflictPending); return; }
                    bool chosen = false;
                    onConflict((byte[])aBytes.Clone(), (byte[])bBytes.Clone(), chooseA =>
                    {
                        if (chosen || !SameProfile(expected)) return;
                        chosen = true;
                        resolver.ChooseMetadata(chooseA ? a : b);
                    });
                },
                (status, metadata) =>
                {
                    if (!SameProfile(expected)) { End(Result.ProfileChanged, fail); return; }
                    if (status != SavedGameRequestStatus.Success || metadata == null || !metadata.IsOpen)
                    { End(Result.Failed, fail); return; }
                    client.ReadBinaryData(metadata, (readStatus, bytes) =>
                    {
                        if (!SameProfile(expected)) { End(Result.ProfileChanged, fail); return; }
                        if (readStatus != SavedGameRequestStatus.Success || bytes == null || bytes.Length > MaxBytes)
                        { End(Result.Failed, fail); return; }
                        opened = metadata; observed = (byte[])bytes.Clone();
                        busy = false;
                        done(Result.Read, (byte[])bytes.Clone());
                    });
                });
        }

        // Requires an explicit local/native save validation and merge/restore decision.
        // expectedCloud must match the exact bytes just read in this session. No blind upload.
        public void Commit(byte[] expectedCloud, byte[] validatedPayload, Action<Result> done)
        {
            if (!Begin(done)) return;
            if (opened == null || !opened.IsOpen || observed == null || expectedCloud == null ||
                !observed.SequenceEqual(expectedCloud) || validatedPayload == null ||
                validatedPayload.Length == 0 || validatedPayload.Length > MaxBytes)
            { End(Result.Stale, done); return; }
            string expected = profile;
            var meta = opened; opened = null; observed = null;
            var update = new SavedGameMetadataUpdate.Builder().WithUpdatedDescription("Dragon Arena progress").Build();
            PlayGamesPlatform.Instance.SavedGame.CommitUpdate(meta, update, (byte[])validatedPayload.Clone(),
                (status, _) => End(!SameProfile(expected) ? Result.ProfileChanged :
                    status == SavedGameRequestStatus.Success ? Result.CommitAcceptedNotCloudConfirmed : Result.Failed, done));
        }

        // Caller must first persist the deletion/sync barrier and obtain user confirmation.
        // This only deletes the new V4 slot. Inventory legacy slots separately before claiming all data erased.
        public void RequestSlotDeletion(Action<Result> done)
        {
            if (!Begin(done)) return;
            string expected = profile;
            opened = null; observed = null;
            var client = PlayGamesPlatform.Instance.SavedGame;
            client.FetchAllSavedGames(DataSource.ReadNetworkOnly, (status, saves) =>
            {
                if (!SameProfile(expected)) { End(Result.ProfileChanged, done); return; }
                if (status != SavedGameRequestStatus.Success || saves == null)
                { End(Result.Failed, done); return; }
                var matches = saves.Where(s => s != null && s.Filename == Slot).ToList();
                if (matches.Count == 0) { End(Result.NotListed, done); return; }
                foreach (var item in matches)
                {
                    if (!SameProfile(expected)) { End(Result.ProfileChanged, done); return; }
                    client.Delete(item);
                }
                // SDK Delete is void. Report request only; later network readback is separate.
                End(Result.DeleteRequested, done);
            });
        }

        public void ObserveDeletion(Action<Result> done)
        {
            if (!Begin(done)) return;
            string expected = profile;
            PlayGamesPlatform.Instance.SavedGame.FetchAllSavedGames(DataSource.ReadNetworkOnly, (status, saves) =>
            {
                if (!SameProfile(expected)) { End(Result.ProfileChanged, done); return; }
                if (status != SavedGameRequestStatus.Success || saves == null) { End(Result.Failed, done); return; }
                End(saves.Any(s => s != null && s.Filename == Slot) ? Result.StillListed : Result.NotListed, done);
            });
        }
    }
}
