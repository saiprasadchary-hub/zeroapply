from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
project = root / 'android'
main = project / 'app/src/main'
shutil.copytree(root / 'native/java', main / 'java', dirs_exist_ok=True)
shutil.copytree(root / 'native/cpp', main / 'cpp', dirs_exist_ok=True)
shutil.rmtree(project / 'app/src/androidTest/java', ignore_errors=True)
shutil.copytree(root / 'native/androidTest', project / 'app/src/androidTest/java', dirs_exist_ok=True)
gradle = project / 'app/build.gradle'
text = gradle.read_text().replace('applicationId "com.zeroapply.app.android"', 'applicationId "com.zeroapply.app.android.ai"')
text = text.replace('android {', '''android {
    ndkVersion "28.2.13676358"
    externalNativeBuild { cmake { path "src/main/cpp/CMakeLists.txt"; version "3.22.1" } }
''', 1).replace('defaultConfig {', '''defaultConfig {
        ndk { abiFilters 'arm64-v8a', 'x86_64' }
        externalNativeBuild { cmake { arguments "-DANDROID_STL=c++_shared" } }
''', 1)
gradle.write_text(text)
manifest = main / 'AndroidManifest.xml'
text = manifest.read_text().replace('android:allowBackup="true"', 'android:allowBackup="false"').replace('<application', '<application android:usesCleartextTraffic="false"', 1).replace('android:name=".MainActivity"', 'android:name="com.zeroapply.app.android.MainActivity"')
manifest.write_text(text)
for folder in (main / 'res').glob('mipmap-*'):
    if folder.is_dir() and 'anydpi' not in folder.name:
        for name in ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']:
            shutil.copyfile(root.parent / 'public/logo_square.png', folder / name)
print('Native AI integration prepared; AI edition uses a separate install identity.')
