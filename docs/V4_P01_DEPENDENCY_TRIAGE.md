# P01 dependency triage — second pass

18/18 UI GUIDs match official Unity-Technologies/uGUI metadata at pinned upstream revision 12428d96913ce575db2bcef3fb3a67144d9ab88c, covering 680/689 external reference occurrences. The upstream revision is from the Unity 6000.0 branch; this proves identity, not resolution in Unity 2021.3.8f1. The actual package import remains mandatory. No third-party source files were added.

Four non-UI GUIDs remain absent in the supplied package (nine occurrences): two texture GUIDs in four materials, one particle light GUID in two prefabs, and one lighting settings GUID in the Game scene. The four materials have no direct textual serialized users in the restored asset tree; dynamic use and editor dependency graph are not verified. Both particle prefabs are referenced in Game.unity; an enabled light module is present. No arbitrary substitutions or silent exemptions.

All 1,068 original restored files still match the original hash ledger; five importer tests rerun and pass. Editor gate now rejects any Unity version other than 2021.3.8f1. Unity executable remains unavailable, so no native compile or APK. P01 remains blocked; P02 not started; keep PR draft, no merge.
