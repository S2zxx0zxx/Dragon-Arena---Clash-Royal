# Game data deletion and support — implementation contract + external page draft
Status: DESIGN ONLY; private runtime and public hosting/contact unavailable. No separate login system is introduced.
 
## Required settings actions
Privacy Policy; Manage Play Games cloud backup (state and last successful sync); Delete game progress; Help / contact. Explain local/cloud scope and consequences in plain language. If app creates an app account, expose Delete account and data with in-app and web request pathways. Determine applicability after final architecture review.
 
## Safe deletion behavior
1. Explicit user confirmation with irreversible scope; no dark patterns. Offer distinct local-only versus local+cloud behavior if local-only would otherwise be restored.
2. Pause sync and prevent pending writes from restoring deleted progress. Bind the operation to the currently authenticated platform profile, not a user-entered ID; isolate other profiles.
3. For cloud deletion require network/authentication; enumerate all game-owned snapshot slots under that account, use supported Saved Games deletion, verify absence or report uncertain/failure. Never claim success while offline or partial.
4. Clear relevant local save generations, caches, pending state and game-owned data; maintain only minimal nonpersonal deletion/sync state as needed to prevent resurrection. Reconcile other installations and document actual limitations.
5. If app has developer-held account or associated data, delete it and request provider deletion where appropriate; document legitimate retention exceptions and timelines. No deletion of entire Google Account. Support no-app-installed access; never request passwords or tokens.
6. Targeted acceptance: local deletion, cloud deletion, offline failure, retry, multiple profiles, reinstall/restore after deletion, no stale write resurrection. Do not repeat old gameplay tests.
 
## Public web resource — draft, do not publish before operational verification
Title: Dragon Arena — Delete your game data
You may request deletion of your Dragon Arena progress and any associated data managed by the developer. [Verified in-game steps after implementation.] To manage or delete data stored by Google Play Games for this game, use the Google Play Games profile or Google Account settings; do not delete your entire Google account unless that is your separate intention. If you no longer have the app, contact [verified support email or functional request form] with the subject Dragon Arena Data Deletion. We will explain safe verification and the expected response timeline [confirmed period]. Do not include passwords, authentication tokens or payment card information. [Describe scope, remaining retention exceptions and actual process.] This page must work without reinstalling the game or signing in to the developer's website. 
