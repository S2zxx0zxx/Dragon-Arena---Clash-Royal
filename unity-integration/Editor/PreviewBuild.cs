using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace DragonArena.EditorTools
{
    public static class PreviewBuild
    {
        private static readonly string[] Scenes = { "Init", "Menu", "Game", "Skins" };
        private const string Root = "Assets/SnakeWarzIO/_Scenes/";
        private static readonly List<string> Errors = new List<string>();
        private static void Inspect(GameObject root)
        {
            foreach (Transform child in root.GetComponentsInChildren<Transform>(true))
            {
                var go = child.gameObject;
                if (GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(go) > 0)
                    Errors.Add("Missing script: " + go.name);
                foreach (var component in go.GetComponents<Component>())
                {
                    if (!component) continue;
                    var it = new SerializedObject(component).GetIterator();
                    while (it.Next(true))
                        if (it.propertyType == SerializedPropertyType.ObjectReference &&
                            it.objectReferenceValue == null && it.objectReferenceInstanceIDValue != 0)
                            Errors.Add("Broken reference: " + go.name + "/" + component.GetType().Name + "/" + it.propertyPath);
                }
            }
        }
        private static void InspectSerializedGuids()
        {
            var roots = new[] { "Assets/SnakeWarzIO", "ProjectSettings" };
            var extensions = new HashSet<string> { ".unity", ".prefab", ".mat", ".anim", ".controller", ".asset", ".meta", ".renderTexture" };
            var pattern = new Regex(@"fileID:\s*(-?\d+),\s*guid:\s*([0-9a-f]{32})", RegexOptions.IgnoreCase);
            var unresolved = new HashSet<string>();
            foreach (var root in roots)
                foreach (var path in Directory.GetFiles(root, "*", SearchOption.AllDirectories))
                {
                    if (!extensions.Contains(Path.GetExtension(path))) continue;
                    var contents = File.ReadAllText(path);
                    foreach (Match match in pattern.Matches(contents))
                    {
                        var guid = match.Groups[2].Value;
                        if (match.Groups[1].Value == "0" || guid == "00000000000000000000000000000000" ||
                            guid == "0000000000000000e000000000000000" || guid == "0000000000000000f000000000000000") continue;
                        if (string.IsNullOrEmpty(AssetDatabase.GUIDToAssetPath(guid)))
                            unresolved.Add(guid + " in " + path);
                    }
                }
            foreach (var entry in unresolved.OrderBy(x => x)) Errors.Add("Unresolved serialized GUID: " + entry);
            foreach (var guid in AssetDatabase.FindAssets("t:Material", new[] { "Assets/SnakeWarzIO" }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var material = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (!material || !material.shader || material.shader.name == "Hidden/InternalErrorShader")
                    Errors.Add("Missing/error material shader: " + path);
            }
        }
        public static void Validate()
        {
            Errors.Clear();
            if (Application.unityVersion != "2021.3.8f1")
                throw new Exception("P01 requires the original Unity 2021.3.8f1 editor, got " + Application.unityVersion);
            InspectSerializedGuids();
            var expected = Scenes.Select(x => Root + x + ".unity").ToArray();
            if (!EditorBuildSettings.scenes.Where(x => x.enabled).Select(x => x.path).SequenceEqual(expected))
                Errors.Add("Unexpected scene order; restore the four source scenes.");
            foreach (var path in expected)
            {
                if (!File.Exists(path)) { Errors.Add("Missing scene: " + path); continue; }
                var scene = EditorSceneManager.OpenScene(path, OpenSceneMode.Single);
                foreach (var root in scene.GetRootGameObjects()) Inspect(root);
                Debug.Log("Scene dependencies " + path + ": " + AssetDatabase.GetDependencies(path, true).Length);
            }
            foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/SnakeWarzIO" }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var root = PrefabUtility.LoadPrefabContents(path);
                try { Inspect(root); } finally { PrefabUtility.UnloadPrefabContents(root); }
            }
            if (Errors.Count != 0) throw new Exception(string.Join("\n", Errors));
            Debug.Log("Static scene/prefab inspection passed; gameplay and device validation remain required.");
        }
        public static void BuildAndroidQA()
        {
            Validate();
            var output = Environment.GetEnvironmentVariable("DRAGON_ARENA_APK");
            if (string.IsNullOrEmpty(output)) throw new Exception("Set DRAGON_ARENA_APK to the absolute output path.");
            if (!Path.IsPathRooted(output) || !output.EndsWith(".apk", StringComparison.OrdinalIgnoreCase)) throw new Exception("Expected absolute APK path.");
            PlayerSettings.productName = "Dragon Arena QA";
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "io.dragonarena.unityqa");
            PlayerSettings.bundleVersion = "4.0.0";
            PlayerSettings.Android.bundleVersionCode = 15;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.Android.useCustomKeystore = false;
            EditorUserBuildSettings.buildAppBundle = false;
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = Scenes.Select(x => Root + x + ".unity").ToArray(),
                locationPathName = output, target = BuildTarget.Android, options = BuildOptions.Development
            });
            if (report.summary.result != BuildResult.Succeeded || !File.Exists(output))
                throw new Exception("Android QA build failed: " + report.summary.result);
            Debug.Log("QA APK compiled; this is not production signing or visual acceptance: " + output);
        }
    }
}
